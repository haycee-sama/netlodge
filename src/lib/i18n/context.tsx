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
  | "auth.register";

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
  "hero.title": "Chọta ụlọ akwụkwọ gị nyere ihe ịma aka na Naịjirịa.",
  "hero.subtitle": "NetLodge bụ ahịa maka ebe obibi ụmụ akwụkwọ gburugburu mahadum Naịjirịa. Lee ọnụ ụlọ nke ọ bụla, nyochaa ụlọ, ma tinye akwụkwọ maka otu ụlọ ahụ ị ga-ebi.",
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
  "auth.signInToContinue": "Banye na akaụntụ NetLodge gị iji gaa n'ihu.",
  "auth.createAccount": "Mepụta akaụntụ gị",
  "auth.forgotPassword": "Chefuo okwuntughe?",
  "auth.email": "Email",
  "auth.password": "Okwuntughe",
  "auth.signIn": "Banye",
  "auth.register": "Mepụta akaụntụ",
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
  "hero.title": "Rí ilé ìgbà-ìkẹ́kọ̀ọ́ rẹ tí a fìmọ̀lẹ̀ ní Nàìjíríà.",
  "hero.subtitle": "NetLodge ni ọjà fún ibùgbé àwọn akẹ́kọ̀ọ́ ní àyíka àwọn yunifásítì Nàìjíríà. Wo yálà ilé kọ̀ọ̀kan, yẹ àwọn ohun èlò wọ́n wo, kí o sì gbé ilé yálà náà kàn láìsí àjùmọ̀ṣe pẹ̀lú àlámọ̀rí.",
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
  "hero.title": "Nemo gidan dalibin da aka tabbatar a Najeriya.",
  "hero.subtitle": "NetLodge ita kasuwa ce don gidajen dalibai a kusa da jami'o'in Najeriya. Duba dakuna daban-daban, duba kayan aiki, kuma ku yi booking na dakinar da za ku zauna — ba gini kawai ba.",
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
