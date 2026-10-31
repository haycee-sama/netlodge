"use client";

import * as React from "react";

export type Locale = "en" | "ig" | "yo" | "ha";

export const LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "ig", label: "Igbo", nativeLabel: "Igbo" },
  { value: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { value: "ha", label: "Hausa", nativeLabel: "Hausa" },
];

// ─── Translation dictionary ──────────────────────────────────────────
// Keys are grouped by domain. Only key user-facing strings are translated
// for v1 — navigation, buttons, headlines, and important messages.
// Internal/admin strings remain English-only.
type TranslationKey =
  | "nav.search"
  | "nav.universities"
  | "nav.properties"
  | "nav.howItWorks"
  | "nav.safety"
  | "nav.help"
  | "nav.signIn"
  | "nav.getStarted"
  | "nav.dashboard"
  | "nav.signOut"
  | "nav.viewSite"
  | "nav.goToDashboard"
  | "nav.signedInAs"
  | "nav.settings"
  | "nav.signingOut"
  | "nav.openMenu"
  | "nav.closeMenu"
  | "nav.navigationMenu"
  | "nav.primaryNav"
  | "footer.discover"
  | "footer.trustSafety"
  | "footer.forLandlords"
  | "footer.support"
  | "footer.searchAccommodation"
  | "footer.verification"
  | "footer.bookingSafety"
  | "footer.reportListing"
  | "footer.privacyPolicy"
  | "footer.listAProperty"
  | "footer.landlordGuide"
  | "footer.termsOfService"
  | "footer.helpCentre"
  | "footer.contactUs"
  | "footer.cookiePolicy"
  | "footer.description"
  | "footer.copyright"
  | "footer.verificationNote"
  | "hero.titlePrefix"
  | "hero.titleHighlight"
  | "hero.titleSuffix"
  | "hero.findYourKind"
  | "hero.popularUniversities"
  | "hero.howItWorks"
  | "hero.browseAll"
  | "hero.viewAll"
  | "hero.title"
  | "hero.subtitle"
  | "hero.browse"
  | "hero.listProperty"
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.retry"
  | "common.back"
  | "common.viewAll"
  | "booking.placeHold"
  | "booking.checkIn"
  | "booking.rentalPeriod"
  | "booking.acceptTerms"
  | "booking.confirmHold"
  | "booking.holdPlaced"
  | "booking.signUpToBook"
  | "auth.welcomeBack"
  | "auth.signInToContinue"
  | "auth.createAccount"
  | "auth.forgotPassword"
  | "auth.email"
  | "auth.password"
  | "auth.signIn"
  | "auth.register"
  | "auth.rememberMe"
  | "auth.noAccount"
  | "auth.createOne"
  | "auth.signingIn"
  | "auth.invalidCredentials";

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  "nav.search": "Search",
  "nav.universities": "Universities",
  "nav.properties": "Properties",
  "nav.howItWorks": "How it works",
  "nav.safety": "Safety",
  "nav.help": "Help",
  "nav.signIn": "Sign in",
  "nav.getStarted": "Get started",
  "nav.dashboard": "Dashboard",
  "nav.signOut": "Sign out",
  "nav.viewSite": "View site",
  "nav.goToDashboard": "Go to dashboard",
  "nav.signedInAs": "Signed in as",
  "nav.settings": "Settings",
  "nav.signingOut": "Signing out…",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.navigationMenu": "Navigation menu",
  "nav.primaryNav": "Primary",
  "footer.discover": "Discover",
  "footer.trustSafety": "Trust & safety",
  "footer.forLandlords": "For landlords",
  "footer.support": "Support",
  "footer.searchAccommodation": "Search accommodation",
  "footer.verification": "Verification",
  "footer.bookingSafety": "Booking safety",
  "footer.reportListing": "Report a listing",
  "footer.privacyPolicy": "Privacy policy",
  "footer.listAProperty": "List a property",
  "footer.landlordGuide": "Landlord guide",
  "footer.termsOfService": "Terms of service",
  "footer.helpCentre": "Help centre",
  "footer.contactUs": "Contact us",
  "footer.cookiePolicy": "Cookie policy",
  "footer.description": "NetLodge is the verified marketplace for student accommodation around Nigerian universities — book rooms, not just buildings.",
  "footer.copyright": "Built for Nigerian students.",
  "footer.verificationNote": "All listings go through identity and ownership verification.",
  "hero.titlePrefix": "Find your",
  "hero.titleHighlight": "verified",
  "hero.titleSuffix": "student home in Nigeria.",
  "hero.findYourKind": "Find your kind of space",
  "hero.popularUniversities": "Popular universities",
  "hero.howItWorks": "How it works",
  "hero.browseAll": "Browse all",
  "hero.viewAll": "View all",
  "hero.title": "Find your verified student home in Nigeria.",
  "hero.subtitle": "NetLodge is the marketplace for student accommodation around Nigerian universities. Browse individual rooms, inspect facilities, and book the actual unit you'll live in — not just the building it sits in.",
  "hero.browse": "Browse accommodation",
  "hero.listProperty": "List your property",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.retry": "Retry",
  "common.back": "Back",
  "common.viewAll": "View all",
  "booking.placeHold": "Place hold & continue",
  "booking.checkIn": "Check-in date",
  "booking.rentalPeriod": "Rental period",
  "booking.acceptTerms": "I accept the booking terms and understand a hold is reserved for 24 hours pending payment.",
  "booking.confirmHold": "Confirm hold",
  "booking.holdPlaced": "Hold placed",
  "booking.signUpToBook": "Only students can book accommodation",
  "auth.welcomeBack": "Welcome back",
  "auth.signInToContinue": "Sign in to your NetLodge account to continue.",
  "auth.createAccount": "Create your account",
  "auth.forgotPassword": "Forgot password?",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign in",
  "auth.register": "Create account",
  "auth.rememberMe": "Remember me on this device",
  "auth.noAccount": "Don't have an account?",
  "auth.createOne": "Create one",
  "auth.signingIn": "Signing in…",
  "auth.invalidCredentials": "Invalid email or password.",
};

const ig: Translations = {
  "nav.search": "Chọọ",
  "nav.universities": "Mahadum",
  "nav.properties": "Ụlọ",
  "nav.howItWorks": "Otú ọ na-arụ ọrụ",
  "nav.safety": "Nchebe",
  "nav.help": "Enyemaka",
  "nav.signIn": "Banye",
  "nav.getStarted": "Malite",
  "nav.dashboard": "Dashbọọdụ",
  "nav.signOut": "Pụọ",
  "nav.viewSite": "Lee saịtị",
  "nav.goToDashboard": "Gaa na dashbọọdụ",
  "nav.signedInAs": "Banyere dị ka",
  "nav.settings": "Ntọala",
  "nav.signingOut": "Na-apụ…",
  "nav.openMenu": "Mepee menu",
  "nav.closeMenu": "Mechie menu",
  "nav.navigationMenu": "Menu njem",
  "nav.primaryNav": "Isi",
  "footer.discover": "Chọpụta",
  "footer.trustSafety": "Ndịnwe na nchebe",
  "footer.forLandlords": "Maka ndị nwe ụlọ",
  "footer.support": "Nkwado",
  "footer.searchAccommodation": "Chọọ ebe obibi",
  "footer.verification": "Nyocha",
  "footer.bookingSafety": "Nchebe ntinye akwụkwọ",
  "footer.reportListing": "Bido akụkọ ụlọ",
  "footer.privacyPolicy": "Iwu nzuzo",
  "footer.listAProperty": "Tinye ụlọ",
  "footer.landlordGuide": "Nduzi ndị nwe ụlọ",
  "footer.termsOfService": "Usoro ọrụ",
  "footer.helpCentre": "Ebe enyemaka",
  "footer.contactUs": "Kpọtụrụ anyị",
  "footer.cookiePolicy": "Iwu cookie",
  "footer.description": "NetLodge bụ ebe a na-enyocha ma na-egosipụta ebe obibi ụmụ akwụkwọ n'akụkụ mahadum Naịjirịa. Ị na-edebe ọnụ ụlọ, ọ bụghị naanị ụlọ.",
  "footer.copyright": "E mepụtara ya maka ụmụ akwụkwọ Naịjirịa.",
  "footer.verificationNote": "A na-enyocha njirimara na akụnụba onye ọ bụla nwere ụlọ tupu a gosipụta ya.",
  "hero.titlePrefix": "Chọta ebe obibi",
  "hero.titleHighlight": "a nyochara",
  "hero.titleSuffix": "ụmụ akwụkwọ na Naịjirịa.",
  "hero.findYourKind": "Chọta ụdị ohere ị chọrọ",
  "hero.popularUniversities": "Mahadum a ma ama",
  "hero.howItWorks": "Otú ọ na-arụ ọrụ",
  "hero.browseAll": "Chọọ niile",
  "hero.viewAll": "Hụ niile",
  "hero.title": "Chọta ebe obibi ụmụ akwụkwọ a nyochara na Naịjirịa.",
  "hero.subtitle": "NetLodge na-enyere ụmụ akwụkwọ aka ịchọta ebe obibi n'akụkụ mahadum Naịjirịa. Lee ọnụ ụlọ dị iche iche, nyochaa ha, ma tinye akwụkwọ maka ọnụ ụlọ ịchọrọ ibi.",
  "hero.browse": "Chọọ ebe obibi",
  "hero.listProperty": "Tinye ụlọ gị",
  "common.loading": "Na-ebu…",
  "common.save": "Chekwaa",
  "common.cancel": "Kagbuo",
  "common.retry": "Nwaa ọzọ",
  "common.back": "Laghachi",
  "common.viewAll": "Hụ niile",
  "booking.placeHold": "Jide ebe ma gaa n'ihu",
  "booking.checkIn": "Ụbọchị nbata",
  "booking.rentalPeriod": "Oge mgbazitere",
  "booking.acceptTerms": "Anabatara m usoro ntinye akwụkwọ ma ghọta na a na-ejide ebe ahụ awa 24 na-atụ anyị ịkwụ ụgwọ.",
  "booking.confirmHold": "Kwenye ijide",
  "booking.holdPlaced": "E jidela ebe ahụ",
  "booking.signUpToBook": "Naanị ụmụ akwụkwọ nwere ike itinye akwụkwọ",
  "auth.welcomeBack": "Nnọọ ọzọ",
  "auth.signInToContinue": "Banye n'akaụntụ NetLodge gị ka ịga n'ihu.",
  "auth.createAccount": "Mepụta akaụntụ gị",
  "auth.forgotPassword": "Chefuo okwuntughe?",
  "auth.email": "Email",
  "auth.password": "Okwuntughe",
  "auth.signIn": "Banye",
  "auth.register": "Mepụta akaụntụ",
  "auth.rememberMe": "Cheta m na ngwaọrụ a",
  "auth.noAccount": "Ị nweghị akaụntụ?",
  "auth.createOne": "Mepụta otu",
  "auth.signingIn": "Na-abanye…",
  "auth.invalidCredentials": "Email ma ọ bụ okwuntughe na-ezighị ezi.",
};

const yo: Translations = {
  "nav.search": "Wáwá",
  "nav.universities": "Yunifásítì",
  "nav.properties": "Ilé",
  "nav.howItWorks": "Bí ó ṣe ń ṣiṣẹ́",
  "nav.safety": "Ààbọ̀",
  "nav.help": "Ìrànwọ́",
  "nav.signIn": "Wọlé",
  "nav.getStarted": "Bẹ̀rẹ̀",
  "nav.dashboard": "Dashbọọdù",
  "nav.signOut": "Jáde",
  "nav.viewSite": "Wo wẹ́bùsáìtì",
  "nav.goToDashboard": "Lọ sí dashbọọdù",
  "nav.signedInAs": "Wọlé gẹ́gẹ́ bí",
  "nav.settings": "Ètò",
  "nav.signingOut": "Ń jáde…",
  "nav.openMenu": "Sí menu",
  "nav.closeMenu": "Tí menu",
  "nav.navigationMenu": "Menu ìtọ́sọ́nà",
  "nav.primaryNav": "Àkọ́kọ́",
  "footer.discover": "Kọ́kọ́rọ́",
  "footer.trustSafety": "Ìgbẹ́kẹ̀lé àti ààbọ̀",
  "footer.forLandlords": "Fún àwọn oní ilé",
  "footer.support": "Ìtìlẹ́yìn",
  "footer.searchAccommodation": "Wá ibùgbé",
  "footer.verification": "Ìfìmọ́lẹ̀",
  "footer.bookingSafety": "Ààbọ̀ ìdásílẹ̀",
  "footer.reportListing": "Fìtẹ́ ìpolówọ́ ilé",
  "footer.privacyPolicy": "Ìlànà ìkọ́kọ́",
  "footer.listAProperty": "Foríṣọ́ ilé",
  "footer.landlordGuide": "Ìmọ̀ràn fún oní ilé",
  "footer.termsOfService": "Ìlànà iṣẹ́",
  "footer.helpCentre": "Ibi ìrànwọ́",
  "footer.contactUs": "Kàn sí wa",
  "footer.cookiePolicy": "Ìlànà cookie",
  "footer.description": "NetLodge jẹ́ ìpèsè fún ibùgbé akẹ́kọ̀ọ́ ní àyíka yunifásítì Nàìjíríà. A ń ṣàwárí yálà ilé kọ̀ọ̀kan, kì í ṣe ilé pàtàkì nìkan.",
  "footer.copyright": "A ṣẹ̀dá rẹ̀ fún àwọn akẹ́kọ̀ọ́ Nàìjíríà.",
  "footer.verificationNote": "A ń yẹ ìdánimọ̀ àti ìjẹ́ní-ilé gbogbo ènìyàn kí a tó ṣàfihàn ilé wọn.",
  "hero.titlePrefix": "Rí ibùgbé",
  "hero.titleHighlight": "tí a fìmọ̀lẹ̀",
  "hero.titleSuffix": "akẹ́kọ̀ọ́ ní Nàìjíríà.",
  "hero.findYourKind": "Rí irúfẹ́ ohere tí o fẹ́",
  "hero.popularUniversities": "Àwọn yunifásítì tí wọ́n gbajúmọ̀",
  "hero.howItWorks": "Bí ó ṣe ń ṣiṣẹ́",
  "hero.browseAll": "Wá gbogbo rẹ̀",
  "hero.viewAll": "Gbogbo rẹ̀",
  "hero.title": "Rí ibùgbé akẹ́kọ̀ọ́ tí a fìmọ̀lẹ̀ ní Nàìjíríà.",
  "hero.subtitle": "NetLodge ni ibi tí àwọn akẹ́kọ̀ọ́ ti lè rí ibùgbé ní àyíka àwọn yunifásítì Nàìjíríà. Wo yálà ilé kọ̀ọ̀kan, yẹ àwọn ohun èlò wọ́n wo, kí o sì gbé yálà ilé tí o fẹ́.",
  "hero.browse": "Wá ibùgbé",
  "hero.listProperty": "Foríṣọ́ ilé rẹ",
  "common.loading": "Ń ròyìn…",
  "common.save": "Fi pamọ́",
  "common.cancel": "Parẹ́",
  "common.retry": "Gbiyẹnu",
  "common.back": "Padà sẹ́yìn",
  "common.viewAll": "Gbogbo rẹ̀",
  "booking.placeHold": "Di ibùgbé kí o tèwọ́",
  "booking.checkIn": "Déètí ìwọlé",
  "booking.rentalPeriod": "Àkókò yíyà",
  "booking.acceptTerms": "Mo gbà àdéhùn ìdásílẹ̀ àti pé mo mọ̀ pé wọ́n máa ń di ibùgbé fún wákàtí méjìlélógún kí wọ́n tó san owó.",
  "booking.confirmHold": "Fọwọ́sí ìdídì",
  "booking.holdPlaced": "A ti di ibùgbé rẹ",
  "booking.signUpToBook": "Àwọn akẹ́kọ̀ọ́ nìkan ni wọ́n le gbé ibùgbé",
  "auth.welcomeBack": "Káàbọ̀",
  "auth.signInToContinue": "Wọlé sínú àkáǹtì NetLodge rẹ láti tẹ̀síwájú.",
  "auth.createAccount": "Ṣẹ̀dá àkáǹtì rẹ",
  "auth.forgotPassword": "Gbagbe ọ̀rọ̀-ìpamọ́?",
  "auth.email": "Ímeèlì",
  "auth.password": "Ọ̀rọ̀-ìpamọ́",
  "auth.signIn": "Wọlé",
  "auth.register": "Ṣẹ̀dá àkáǹtì",
  "auth.rememberMe": "Rántí mi lórí èrò yìí",
  "auth.noAccount": "Ṣé o ní àkáǹtì?",
  "auth.createOne": "Ṣẹ̀dá ọ̀kan",
  "auth.signingIn": "Ń wọlé…",
  "auth.invalidCredentials": "Ímeèlì tàbí ọ̀rọ̀-ìpamọ́ àìtó.",
};

const ha: Translations = {
  "nav.search": "Nema",
  "nav.universities": "Jami'o'i",
  "nav.properties": "Gidaje",
  "nav.howItWorks": "Yadda ake aiki",
  "nav.safety": "Tsaro",
  "nav.help": "Taimako",
  "nav.signIn": "Shiga",
  "nav.getStarted": "Fara",
  "nav.dashboard": "Dashboard",
  "nav.signOut": "Fita",
  "nav.viewSite": "Duba shafin",
  "nav.goToDashboard": "Tafi dashboard",
  "nav.signedInAs": "An shiga a matsayin",
  "nav.settings": "Saituna",
  "nav.signingOut": "Ana fita…",
  "nav.openMenu": "Bude menu",
  "nav.closeMenu": "Rufe menu",
  "nav.navigationMenu": "Menu din kewayawa",
  "nav.primaryNav": "Babban",
  "footer.discover": "Gano",
  "footer.trustSafety": "Amincewa da tsaro",
  "footer.forLandlords": "Don masu gida",
  "footer.support": "Taimako",
  "footer.searchAccommodation": "Nemo masauki",
  "footer.verification": "Tabbatarwa",
  "footer.bookingSafety": "Tsaron booking",
  "footer.reportListing": "Bayar da rahoton gida",
  "footer.privacyPolicy": "Manufar keɓantawa",
  "footer.listAProperty": "Saka gida",
  "footer.landlordGuide": "Jagorar mai gida",
  "footer.termsOfService": "Sharuɗɗan sabis",
  "footer.helpCentre": "Cibiyar taimako",
  "footer.contactUs": "Tuntuɓe mu",
  "footer.cookiePolicy": "Manufar cookie",
  "footer.description": "NetLodge wuri ne da ake neman masaukin dalibai a kusa da jami'o'in Najeriya. Ana yin booking na daki, ba gini kawai.",
  "footer.copyright": "An gina shi don daliban Najeriya.",
  "footer.verificationNote": "Ana tabbatar da asali da mallakar kowane mutum kafin a nuna shi.",
  "hero.titlePrefix": "Nemo gidan",
  "hero.titleHighlight": "da aka tabbatar",
  "hero.titleSuffix": "dalibi a Najeriya.",
  "hero.findYourKind": "Nemo irin wurin da kake so",
  "hero.popularUniversities": "Jami'o'i masu shahara",
  "hero.howItWorks": "Yadda ake aiki",
  "hero.browseAll": "Bincika duka",
  "hero.viewAll": "Duba duka",
  "hero.title": "Nemo gidan dalibi da aka tabbatar a Najeriya.",
  "hero.subtitle": "NetLodge taimaka dalibai su samu masauki a kusa da jami'o'in Najeriya. Duba dakuna daban-daban, duba kayan aikin, kuma ka yi booking na dakin da za ka zauna.",
  "hero.browse": "Nemo masauki",
  "hero.listProperty": "Saka dukiyarka",
  "common.loading": "Ana loda…",
  "common.save": "Ajiye",
  "common.cancel": "Soke",
  "common.retry": "Sake gwadawa",
  "common.back": "Koma baya",
  "common.viewAll": "Duba duka",
  "booking.placeHold": "Rike masauki kuma ci gaba",
  "booking.checkIn": "Kwanan shiga",
  "booking.rentalPeriod": "Tsawon lokacin haya",
  "booking.acceptTerms": "Na amince da sharuddan booking kuma na fahimci cewa za a rike masauki na awanni 24 don biya.",
  "booking.confirmHold": "Tabbatar da rike",
  "booking.holdPlaced": "An rike masauki",
  "booking.signUpToBook": "Dalibai kawai za su iya yin booking",
  "auth.welcomeBack": "Sannu da dawowa",
  "auth.signInToContinue": "Shiga asusun NetLodge din ka don ci gaba.",
  "auth.createAccount": "Kirkiri asusunka",
  "auth.forgotPassword": "Ka manta kalmar sirri?",
  "auth.email": "Imel",
  "auth.password": "Kalmar sirri",
  "auth.signIn": "Shiga",
  "auth.register": "Kirkiri asusun",
  "auth.rememberMe": "Ka tuna ni a wannan na'urar",
  "auth.noAccount": "Babu asusunka?",
  "auth.createOne": "Kirkiri daya",
  "auth.signingIn": "Ana shiga…",
  "auth.invalidCredentials": "Imel ko kalmar sirri ba daidai ba.",
};

const dictionaries: Record<Locale, Translations> = { en, ig, yo, ha };

// ─── Context ─────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "netlodge-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("en");

  // Load saved locale from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && ["en", "ig", "yo", "ha"].includes(saved)) {
        setLocaleState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = React.useCallback(
    (key: TranslationKey) => {
      return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
    },
    [locale],
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
