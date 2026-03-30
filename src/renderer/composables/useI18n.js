import { computed, watch } from 'vue';
import { useI18n as vueUseI18n } from 'vue-i18n';
import { localeState, setLocale as i18nSetLocale, getElementLocale } from '../i18n/i18n';
import * as storage from '../storage';

/**
 * useI18n - 国际化管理 Composable
 *
 * 管理应用国际化的状态和操作，包括：
 * - 语言切换
 * - vue-i18n 和 Element Plus locale 同步更新
 * - 语言偏好持久化
 *
 * @returns {Object} 返回响应式状态和方法
 */
export function useI18n() {
  // 获取 vue-i18n 实例
  const i18n = vueUseI18n();

  // 支持的语言列表
  const supportedLocales = ['en', 'cn', 'tw', 'tr', 'ru', 'pt', 'de', 'fr', 'ua', 'it', 'es', 'ko', 'vi'];

  // 计算派生状态 - 当前语言
  const locale = computed(() => localeState.value);

  // 计算派生状态 - Element Plus locale
  const elementLocale = computed(() => getElementLocale(localeState.value));

  /**
   * 初始化国际化
   * 从存储中读取用户偏好的语言设置
   */
  function initI18n() {
    const settings = storage.getSetting();
    const savedLocale = settings.lang || localStorage.lang || 'en';

    if (supportedLocales.includes(savedLocale)) {
      setLocale(savedLocale);
    } else {
      setLocale('en');
    }
  }

  /**
   * 设置语言
   * 同时更新 vue-i18n 和 Element Plus 的 locale
   *
   * @param {string} lang - 语言代码（如 'en', 'cn', 'tw' 等）
   */
  function setLocale(lang) {
    if (!supportedLocales.includes(lang)) {
      console.warn(`Unsupported locale: ${lang}, falling back to 'en'`);
      lang = 'en';
    }

    // 更新 vue-i18n
    i18nSetLocale(lang);

    // 更新 localStorage
    localStorage.lang = lang;

    // 更新应用设置
    const settings = storage.getSetting();
    settings.lang = lang;
    storage.saveSettings(settings);
  }

  /**
   * 获取翻译函数
   * 返回 vue-i18n 的 t 函数
   *
   * @returns {Function} 翻译函数
   */
  function getTranslate() {
    return i18n.t;
  }

  /**
   * 获取当前语言的显示名称
   *
   * @param {string} lang - 语言代码
   * @returns {string} 语言显示名称
   */
  function getLanguageName(lang) {
    const names = {
      en: 'English',
      cn: '简体中文',
      tw: '繁體中文',
      tr: 'Türkçe',
      ru: 'Русский',
      pt: 'Português',
      de: 'Deutsch',
      fr: 'Français',
      ua: 'Українська',
      it: 'Italiano',
      es: 'Español',
      ko: '한국어',
      vi: 'Tiếng Việt',
    };

    return names[lang] || lang;
  }

  /**
   * 获取所有支持的语言列表
   *
   * @returns {Array<Object>} 语言列表，每项包含 code 和 name
   */
  function getSupportedLanguages() {
    return supportedLocales.map(code => ({
      code,
      name: getLanguageName(code),
    }));
  }

  /**
   * 监听语言变化，自动更新 localStorage
   */
  watch(
    () => localeState.value,
    (newLocale) => {
      localStorage.lang = newLocale;
      const settings = storage.getSetting();
      settings.lang = newLocale;
      storage.saveSettings(settings);
    },
  );

  return {
    locale,
    elementLocale,
    supportedLocales,
    initI18n,
    setLocale,
    getTranslate,
    getLanguageName,
    getSupportedLanguages,
  };
}
