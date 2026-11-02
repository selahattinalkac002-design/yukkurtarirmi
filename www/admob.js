import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdSize,
  BannerAdPosition,
} from '@capacitor-community/admob';

const APP_AD_MODE = 'test'; // Yayın öncesi testler bitince 'production' yap.
const IDS = {
  test: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  production: {
    banner: 'ca-app-pub-3759490841134440/4471761226',
    interstitial: 'ca-app-pub-3759490841134440/3534084077',
    rewarded: 'ca-app-pub-3759490841134440/9456047488',
  },
};

const $ = (id) => document.getElementById(id);
const isNative = Capacitor.isNativePlatform();
const adIds = IDS[APP_AD_MODE];
let initialized = false;
let interstitialReady = false;
let rewardedReady = false;
let lastInterstitialAt = 0;

function status(message) {
  const node = $('adStatus');
  if (node) node.textContent = message;
}

async function prepareInterstitial() {
  try {
    await AdMob.prepareInterstitial({ adId: adIds.interstitial });
    interstitialReady = true;
  } catch (error) {
    interstitialReady = false;
    console.warn('Interstitial yüklenemedi:', error);
  }
}

async function prepareRewarded() {
  try {
    await AdMob.prepareRewardVideoAd({ adId: adIds.rewarded });
    rewardedReady = true;
  } catch (error) {
    rewardedReady = false;
    console.warn('Ödüllü reklam yüklenemedi:', error);
  }
}

async function initializeAds() {
  if (!isNative) {
    status('Reklamlar Android uygulamasında çalışır; tarayıcı önizlemesinde gösterilmez.');
    return;
  }
  try {
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    if (!consent.canRequestAds) {
      status('Reklam göstermek için gerekli kullanıcı izni henüz mevcut değil.');
      return;
    }
    await AdMob.initialize();
    initialized = true;
    await AdMob.showBanner({
      adId: adIds.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
    await Promise.all([prepareInterstitial(), prepareRewarded()]);
    status(APP_AD_MODE === 'test'
      ? 'Test reklamları etkin. Yayına çıkmadan önce reklam testi ve rıza ayarlarını tamamla.'
      : 'AdMob reklamları hazır.');
  } catch (error) {
    console.error('AdMob başlatılamadı:', error);
    status('Reklamlar şu anda yüklenemedi. Uygulamanın diğer özellikleri çalışmaya devam eder.');
  }
}

async function showInterstitialAd() {
  if (!initialized || !isNative) return;
  const now = Date.now();
  if (now - lastInterstitialAt < 5 * 60 * 1000) return;
  try {
    if (!interstitialReady) await prepareInterstitial();
    if (!interstitialReady) return;
    await AdMob.showInterstitial();
    lastInterstitialAt = Date.now();
    interstitialReady = false;
    void prepareInterstitial();
  } catch (error) {
    console.warn('Geçiş reklamı gösterilemedi:', error);
    interstitialReady = false;
    void prepareInterstitial();
  }
}

async function showRewardedAd() {
  if (!initialized || !isNative) {
    status('Ödüllü reklam Android uygulamasında kullanılabilir.');
    return;
  }
  try {
    if (!rewardedReady) await prepareRewarded();
    if (!rewardedReady) {
      status('Ödüllü video henüz hazır değil. Biraz sonra tekrar dene.');
      return;
    }
    const reward = await AdMob.showRewardVideoAd();
    rewardedReady = false;
    status(`Video tamamlandı. Reklam ödül olayı alındı${reward?.amount ? ` (${reward.amount})` : ''}.`);
    void prepareRewarded();
  } catch (error) {
    console.warn('Ödüllü reklam gösterilemedi veya tamamlanmadı:', error);
    rewardedReady = false;
    status('Video tamamlanmadı veya reklam yüklenemedi. Tekrar deneyebilirsin.');
    void prepareRewarded();
  }
}

$('rewardAdBtn')?.addEventListener('click', showRewardedAd);
$('interstitialAdBtn')?.addEventListener('click', showInterstitialAd);

// Geçiş reklamı yalnızca sefer kaydı tamamlandıktan sonra, ayrıca sıklık sınırıyla gösterilir.
window.addEventListener('yuk-sefer-saved', () => { void showInterstitialAd(); });
void initializeAds();
