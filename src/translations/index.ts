import englishGeneralSettings from "./english/general";
import englishAccountSettings from "./english/account";
import hindiGeneralSettings from "./hindi/general";
import hindiAccountSettings from "./hindi/account";
import assameseGeneralSettings from "./assamese/general";
import assameseAccountSettings from "./assamese/account";
import englishSidebar from "./english/sidebar";
import hindiSidebar from "./hindi/sidebar";
import assameseSidebar from "./assamese/sidebar";
import englishNavbar from "./english/navbar";
import hindiNavbar from "./hindi/navbar";
import assameseNavbar from "./assamese/navbar";
import englishSettingsBar from "./english/settingsbar";
import hindiSettingsBar from "./hindi/settingsbar";
import asssameseSettingsBar from "./assamese/settingsbar";

const englishTranslations = {
  ...englishGeneralSettings,
  ...englishAccountSettings,
  ...englishSidebar,
  ...englishNavbar,
  ...englishSettingsBar,
};

const hindiTranslations = {
  ...hindiGeneralSettings,
  ...hindiAccountSettings,
  ...hindiSidebar,
  ...hindiNavbar,
  ...hindiSettingsBar,
};

const assameseTranslations = {
  ...assameseGeneralSettings,
  ...assameseAccountSettings,
  ...assameseSidebar,
  ...assameseNavbar,
  ...asssameseSettingsBar,
};

export const translations = {
  English: englishTranslations,
  Hindi: hindiTranslations,
  Assamese: assameseTranslations,
};

export type SupportedLanguage = keyof typeof translations;
export type TranslationKey = keyof typeof englishTranslations;

export const getTranslator = (language: SupportedLanguage) => {
  const langTranslations = translations[language] || translations.English;
  const fallbackTranslations = translations.English;

  return (key: TranslationKey): string => {
    const typedKey = key as keyof typeof langTranslations;
    return (
      langTranslations[typedKey] || fallbackTranslations[key] || String(key)
    );
  };
};
