import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en.json';
import ukCommon from './locales/uk.json';

const resources = {
  en: {
    common: enCommon,
  },
  uk: {
    common: ukCommon,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  ns: ['common'],
  defaultNS: 'common',
});

export default i18n;
