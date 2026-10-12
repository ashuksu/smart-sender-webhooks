export type Language = 'en' | 'uk';

export interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}
