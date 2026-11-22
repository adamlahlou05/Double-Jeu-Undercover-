package io.github.adamlahlou05.doublejeu;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Publicités avec récompense (AdMob, après recueil du consentement) et achats (Google Play Billing).
 *
 * Les règles du jeu (combien de parties, quand proposer une pub) sont dans la page, web/js/shop.js.
 * Cette classe ne fait que trois choses : afficher une pub et dire si elle a été vue jusqu'au bout,
 * vendre un produit, et dire à la page quels produits sont possédés et à quel prix ils sont vendus.
 *
 * Toutes les méthodes sont à appeler sur le fil d'interface, sauf info().
 */
final class Monetization implements PurchasesUpdatedListener {

    /** Exécute un script dans la page. */
    interface Host {
        void emit(String script);
    }

    /** Identifiants des produits, à créer à l'identique dans la Play Console. */
    private static final List<String> PRODUCTS =
            Collections.unmodifiableList(Arrays.asList("premium", "pack_quotidien", "pack_culture", "pack_loisirs",
                    "pack_esprit", "pack_soiree", "pack_coquin", "pack_politique", "pack_foot"));
    private static final String PREMIUM = "premium";

    private static final String PREFS = "boutique";
    private static final String KEY_OWNED = "owned";
    /** Au-delà, la page considère qu'aucune pub n'est disponible (hors ligne, pas d'annonce). */
    private static final long AD_TIMEOUT_MS = 15_000;
    /** Une pub chargée n'est plus valable au bout d'une heure : on la renouvelle avant. */
    private static final long AD_MAX_AGE_MS = 50 * 60 * 1000;

    private final ComponentActivity activity;
    private final Host host;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final SharedPreferences prefs;
    private final ConsentInformation consent;

    private boolean consentDone;
    private boolean consentFailed;
    private boolean consentRunning;
    private final List<Runnable> afterConsent = new ArrayList<>();
    private boolean adsStarted;
    private boolean adLoading;
    private boolean showWanted;
    private boolean earned;
    @Nullable private RewardedAd rewarded;
    private long loadedAt;

    @Nullable private BillingClient billing;
    private boolean billingReady;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private final Map<String, String> prices = new HashMap<>();
    private Set<String> owned;

    private volatile String snapshot = "{}";

    Monetization(ComponentActivity activity, Host host) {
        this.activity = activity;
        this.host = host;
        this.prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.consent = UserMessagingPlatform.getConsentInformation(activity);
        // Les achats déjà connus sont relus tout de suite : le jeu illimité fonctionne aussi hors ligne.
        this.owned = new HashSet<>(prefs.getStringSet(KEY_OWNED, Collections.emptySet()));
        publish(false);
        connectBilling();
    }

    /** État de la boutique, en JSON. Peut être appelé depuis n'importe quel fil. */
    String info() {
        return snapshot;
    }

    void onResume() {
        // Un achat a pu être validé (ou remboursé) pendant que l'application était en arrière-plan.
        if (billingReady) queryPurchases();
    }

    void destroy() {
        ui.removeCallbacksAndMessages(null);
        if (billing != null) {
            try {
                billing.endConnection();
            } catch (RuntimeException e) {
                // Connexion déjà fermée.
            }
        }
    }

    /* ---------- Publicités ---------- */

    private final Runnable adTimeout = () -> {
        if (!showWanted) return;
        showWanted = false;
        adResult("unavailable");
    };

    /** Prépare une pub en avance. Appelé par la page après la première partie, jamais avant. */
    void warmup() {
        if (owned.contains(PREMIUM)) return;
        withConsent(this::startAds);
    }

    /** Affiche une pub avec récompense. La page reçoit 'earned', 'closed' ou 'unavailable'. */
    void showRewarded() {
        if (showWanted) return;
        showWanted = true;
        earned = false;
        withConsent(this::startAds);
    }

    /** Rouvre le formulaire de consentement (obligatoire là où la loi l'exige). */
    void privacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> publish(true));
    }

    /**
     * Demande le consentement là où il est requis (Europe), puis poursuit. Le formulaire de Google
     * ne s'affiche que s'il y a lieu, et une seule fois tant que le choix reste valable.
     */
    private void withConsent(Runnable then) {
        if (consentDone) {
            then.run();
            return;
        }
        afterConsent.add(then);
        if (consentRunning) return;
        consentRunning = true;
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(activity, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> consentFinished(formError == null)),
                requestError -> consentFinished(false));
    }

    private void consentFinished(boolean done) {
        consentRunning = false;
        // En cas d'échec (hors ligne), on réessaiera à la prochaine demande ; un consentement
        // donné lors d'une session précédente reste utilisable d'ici là.
        consentDone = done;
        consentFailed = !done;
        publish(true);
        List<Runnable> queue = new ArrayList<>(afterConsent);
        afterConsent.clear();
        for (Runnable r : queue) r.run();
    }

    /**
     * Les pubs ne sont demandées qu'avec un consentement valable. Seule exception : la version de
     * démonstration (identifiants de test de Google), pour pouvoir essayer le parcours avant d'avoir
     * créé le message de consentement dans AdMob.
     */
    private boolean adsAllowed() {
        return consent.canRequestAds() || (BuildConfig.ADMOB_TEST && consentFailed);
    }

    private void startAds() {
        if (!adsAllowed()) {
            if (showWanted) {
                showWanted = false;
                adResult("unavailable");
            }
            return;
        }
        if (!adsStarted) {
            adsStarted = true;
            final Context app = activity.getApplicationContext();
            new Thread(() -> MobileAds.initialize(app, status -> { })).start();
        }
        if (showWanted) {
            ui.removeCallbacks(adTimeout);
            ui.postDelayed(adTimeout, AD_TIMEOUT_MS);
        }
        loadRewarded();
    }

    private void loadRewarded() {
        if (adLoading) return;
        if (rewarded != null && SystemClock.elapsedRealtime() - loadedAt < AD_MAX_AGE_MS) {
            if (showWanted) showNow();
            return;
        }
        rewarded = null;
        adLoading = true;
        RewardedAd.load(activity, BuildConfig.ADMOB_REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                adLoading = false;
                rewarded = ad;
                loadedAt = SystemClock.elapsedRealtime();
                if (showWanted) showNow();
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                adLoading = false;
                rewarded = null;
                if (showWanted) {
                    showWanted = false;
                    ui.removeCallbacks(adTimeout);
                    adResult("unavailable");
                }
            }
        });
    }

    private void showNow() {
        final RewardedAd ad = rewarded;
        if (ad == null) return;
        rewarded = null;
        showWanted = false;
        ui.removeCallbacks(adTimeout);
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                // La récompense n'est accordée que si la pub a été regardée jusqu'au bout.
                adResult(earned ? "earned" : "closed");
                loadRewarded();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                adResult("unavailable");
                loadRewarded();
            }
        });
        ad.show(activity, reward -> earned = true);
    }

    private void adResult(String status) {
        host.emit("window.DJ&&window.DJ.adResult&&window.DJ.adResult('" + status + "')");
    }

    /* ---------- Achats ---------- */

    private void connectBilling() {
        try {
            billing = BillingClient.newBuilder(activity)
                    .setListener(this)
                    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                    .enableAutoServiceReconnection()
                    .build();
            billing.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult result) {
                    ui.post(() -> {
                        billingReady = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                        if (billingReady) {
                            queryProducts();
                            queryPurchases();
                        }
                        publish(true);
                    });
                }

                @Override
                public void onBillingServiceDisconnected() {
                    ui.post(() -> billingReady = false);
                }
            });
        } catch (RuntimeException e) {
            // Pas de Google Play sur cet appareil : le jeu reste jouable avec les pubs.
            billing = null;
        }
    }

    private void queryProducts() {
        if (billing == null) return;
        List<QueryProductDetailsParams.Product> wanted = new ArrayList<>();
        for (String id : PRODUCTS) {
            wanted.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build());
        }
        billing.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(wanted).build(),
                (result, found) -> ui.post(() -> {
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                    for (ProductDetails d : found.getProductDetailsList()) {
                        ProductDetails.OneTimePurchaseOfferDetails offer = d.getOneTimePurchaseOfferDetails();
                        if (offer == null) continue;
                        details.put(d.getProductId(), d);
                        prices.put(d.getProductId(), offer.getFormattedPrice());
                    }
                    publish(true);
                }));
    }

    private void queryPurchases() {
        if (billing == null) return;
        billing.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> ui.post(() -> {
                    // Réponse de Google Play : elle fait foi, y compris pour retirer un achat remboursé.
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) applyPurchases(purchases, true);
                }));
    }

    /** Vérifie de nouveau les achats auprès de Google Play (bouton « Restaurer mes achats »). */
    void restore() {
        if (billingReady) {
            queryProducts();
            queryPurchases();
        } else {
            note("Google Play ne répond pas pour l’instant. Vérifie ta connexion.");
        }
    }

    /** Ouvre la fenêtre de paiement de Google Play pour un produit. */
    void buy(String productId) {
        ProductDetails d = details.get(productId);
        if (billing == null || !billingReady || d == null) {
            note("Achat indisponible pour l’instant. Vérifie ta connexion.");
            return;
        }
        BillingFlowParams.ProductDetailsParams.Builder item =
                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
        ProductDetails.OneTimePurchaseOfferDetails offer = d.getOneTimePurchaseOfferDetails();
        if (offer != null && offer.getOfferToken() != null && !offer.getOfferToken().isEmpty()) {
            item.setOfferToken(offer.getOfferToken());
        }
        BillingResult result = billing.launchBillingFlow(activity,
                BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK
                && result.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
            note("L’achat n’a pas pu s’ouvrir. Réessaie dans un instant.");
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, @Nullable List<Purchase> purchases) {
        ui.post(() -> {
            int code = result.getResponseCode();
            if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
                applyPurchases(purchases, false);
            } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                queryPurchases();
            } else if (code != BillingClient.BillingResponseCode.USER_CANCELED) {
                note("L’achat n’a pas abouti. Rien n’a été débité.");
            }
        });
    }

    /**
     * Enregistre les achats payés et en accuse réception auprès de Google Play (sans quoi ils sont
     * remboursés au bout de trois jours). `complete` : la liste est celle de tous les achats du compte.
     */
    private void applyPurchases(List<Purchase> purchases, boolean complete) {
        Set<String> now = complete ? new HashSet<>() : new HashSet<>(owned);
        boolean pending = false;
        for (Purchase p : purchases) {
            if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                for (String id : p.getProducts()) if (PRODUCTS.contains(id)) now.add(id);
                if (!p.isAcknowledged() && billing != null) {
                    billing.acknowledgePurchase(
                            AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                            ack -> { });
                }
            } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                pending = true;
            }
        }
        if (!now.equals(owned)) {
            owned = now;
            prefs.edit().putStringSet(KEY_OWNED, new HashSet<>(now)).apply();
        }
        publish(true);
        if (pending && !complete) note("Paiement en attente : l’achat sera débloqué dès sa validation.");
    }

    /* ---------- Vers la page ---------- */

    private void note(String text) {
        host.emit("window.DJ&&window.DJ.shopNote&&window.DJ.shopNote(" + JSONObject.quote(text) + ")");
    }

    private void publish(boolean notify) {
        try {
            JSONObject o = new JSONObject();
            o.put("ads", true);
            o.put("billing", billingReady);
            o.put("owned", new JSONArray(owned));
            o.put("prices", new JSONObject(prices));
            o.put("privacy", consent.getPrivacyOptionsRequirementStatus()
                    == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
            o.put("test", BuildConfig.ADMOB_TEST);
            snapshot = o.toString();
        } catch (JSONException e) {
            // Ne peut pas arriver avec ces types simples.
        }
        if (notify) host.emit("window.DJ&&window.DJ.shop&&window.DJ.shop(" + JSONObject.quote(snapshot) + ")");
    }
}
