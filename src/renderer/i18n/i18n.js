import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';

import enLocale from 'element-plus/es/locale/lang/en';
import zhLocale from 'element-plus/es/locale/lang/zh-cn';
import zhTwLocale from 'element-plus/es/locale/lang/zh-tw';
import trTrLocale from 'element-plus/es/locale/lang/tr';
import ruLocale from 'element-plus/es/locale/lang/ru';
import ptBrLocale from 'element-plus/es/locale/lang/pt-br';
import deLocale from 'element-plus/es/locale/lang/de';
import frLocale from 'element-plus/es/locale/lang/fr';
import uaLocale from 'element-plus/es/locale/lang/uk';
import itLocale from 'element-plus/es/locale/lang/it';
import esLocale from 'element-plus/es/locale/lang/es';
import koLocale from 'element-plus/es/locale/lang/ko';
import viLocale from 'element-plus/es/locale/lang/vi';

import en from './langs/en';
import cn from './langs/cn';
import tw from './langs/tw';
import tr from './langs/tr';
import ru from './langs/ru';
import pt from './langs/pt';
import de from './langs/de';
import fr from './langs/fr';
import ua from './langs/ua';
import it from './langs/it';
import es from './langs/es';
import ko from './langs/ko';
import vi from './langs/vi';

export const localeState = reactive({
  value: localStorage.lang || 'cn',
});

export const elementLocaleMap = {
  en: enLocale,
  cn: zhLocale,
  tw: zhTwLocale,
  tr: trTrLocale,
  ru: ruLocale,
  pt: ptBrLocale,
  de: deLocale,
  fr: frLocale,
  ua: uaLocale,
  it: itLocale,
  es: esLocale,
  ko: koLocale,
  vi: viLocale,
};

const messages = {
  en: { ...en, el: enLocale.el },
  cn: { ...cn, el: zhLocale.el },
  tw: { ...tw, el: zhTwLocale.el },
  tr: { ...tr, el: trTrLocale.el },
  ru: { ...ru, el: ruLocale.el },
  pt: { ...pt, el: ptBrLocale.el },
  de: { ...de, el: deLocale.el },
  fr: { ...fr, el: frLocale.el },
  ua: { ...ua, el: uaLocale.el },
  it: { ...it, el: itLocale.el },
  es: { ...es, el: esLocale.el },
  ko: { ...ko, el: koLocale.el },
  vi: { ...vi, el: viLocale.el },
};

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: localeState.value,
  fallbackLocale: 'cn',
  messages,
});

export function getElementLocale(lang = localeState.value) {
  return elementLocaleMap[lang] || elementLocaleMap.en;
}

export function setLocale(lang) {
  localeState.value = lang;
  i18n.global.locale.value = lang;
}

export default i18n;
