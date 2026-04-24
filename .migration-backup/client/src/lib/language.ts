import { useState, useEffect } from "react";

export type LangCode = "en" | "es" | "fr" | "pt";

export const LANGUAGES: { code: LangCode; label: string; native: string; bibleTranslation: string }[] = [
  { code: "en", label: "English", native: "English", bibleTranslation: "kjv" },
  { code: "es", label: "Spanish", native: "Español", bibleTranslation: "rvr1960" },
  { code: "fr", label: "French", native: "Français", bibleTranslation: "web" },
  { code: "pt", label: "Portuguese", native: "Português", bibleTranslation: "web" },
];

export const LANG_INSTRUCTION: Record<LangCode, string> = {
  en: "",
  es: "Respond entirely in Spanish (Español).",
  fr: "Respond entirely in French (Français).",
  pt: "Respond entirely in Portuguese (Português).",
};

const LS_KEY = "sp_lang";

export function useLanguage() {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem(LS_KEY);
    return (stored as LangCode) || "en";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, lang);
  }, [lang]);

  const setLang = (code: LangCode) => setLangState(code);
  const langInfo = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return { lang, setLang, langInfo };
}

export function getLangInstruction(lang: LangCode): string {
  return LANG_INSTRUCTION[lang] || "";
}

export function getStoredLang(): LangCode {
  return (localStorage.getItem(LS_KEY) as LangCode) || "en";
}

export function getStoredLangInfo() {
  const lang = getStoredLang();
  return LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
}
