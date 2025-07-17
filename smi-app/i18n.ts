import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './translations/en.json';
import mr from './translations/mr.json';
import hi from './translations/hi.json';

// Create i18n instance
const i18n = new I18n({
  en,
  mr,
  hi,
});

i18n.enableFallback = true;
const deviceLocale = Localization.locale || 'en';
i18n.locale = deviceLocale.startsWith('mr') ? 'mr' : deviceLocale.startsWith('hi') ? 'hi' : 'en';

export function setLanguage(lang: 'en' | 'mr' | 'hi') {
  i18n.locale = lang;
}

export default i18n; 