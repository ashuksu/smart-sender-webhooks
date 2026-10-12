import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from './config';

export type Language = 'en' | 'uk';

export interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: (i18n.language as Language) || 'en',
      setLanguage: (lang) => {
        void i18n.changeLanguage(lang);
        set({ language: lang });
      },
    }),
    {
      name: 'app-language-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          void i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
