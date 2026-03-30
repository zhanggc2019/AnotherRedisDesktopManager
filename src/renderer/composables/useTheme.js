import { ref, watch } from 'vue';
import electron from '../electron';
import * as storage from '../storage';

/**
 * useTheme - 主题管理 Composable
 *
 * 管理应用主题的状态和切换，包括：
 * - 亮色/暗色主题切换
 * - DOM class 更新
 * - IPC 通知主进程
 * - 系统主题跟随
 *
 * @returns {Object} 返回响应式状态和方法
 */
export function useTheme() {
  // 响应式状态
  const isDark = ref(false);
  const theme = ref('light'); // 'light', 'dark', 'system'

  /**
   * 初始化主题
   * 从存储中读取用户偏好的主题设置
   */
  function initTheme() {
    const settings = storage.getSetting();
    const savedTheme = settings.theme || 'light';
    theme.value = savedTheme;
    applyTheme(savedTheme);
  }

  /**
   * 应用主题到 DOM
   * 更新 HTML 元素的 class 属性
   *
   * @param {string} themeValue - 主题值：'light', 'dark', 'system'
   */
  function applyTheme(themeValue) {
    const html = document.documentElement;

    if (themeValue === 'dark') {
      html.classList.add('dark');
      isDark.value = true;
    } else if (themeValue === 'light') {
      html.classList.remove('dark');
      isDark.value = false;
    } else if (themeValue === 'system') {
      // 系统主题跟随由主进程通过 IPC 通知
      // 这里先设置为 light，等待主进程通知
      html.classList.remove('dark');
      isDark.value = false;
    }
  }

  /**
   * 切换主题
   * 更新主题设置、DOM 和通知主进程
   *
   * @param {string} newTheme - 新主题值：'light', 'dark', 'system'
   */
  async function toggleTheme(newTheme = null) {
    const targetTheme = newTheme || (isDark.value ? 'light' : 'dark');
    theme.value = targetTheme;

    // 更新 DOM
    applyTheme(targetTheme);

    // 保存到存储
    const settings = storage.getSetting();
    settings.theme = targetTheme;
    storage.saveSettings(settings);

    // 通知主进程
    try {
      await electron.invoke('changeTheme', targetTheme);
    } catch (error) {
      console.error('Failed to change theme via IPC:', error);
    }
  }

  /**
   * 处理系统主题变化事件
   * 由主进程通过 IPC 通知
   *
   * @param {Object} themeUpdate - 主题更新信息
   */
  function handleSystemThemeUpdate(themeUpdate) {
    if (theme.value === 'system') {
      const shouldUseDark = themeUpdate.shouldUseDarkColors;
      applyTheme(shouldUseDark ? 'dark' : 'light');
    }
  }

  /**
   * 监听主进程的系统主题变化事件
   */
  function setupSystemThemeListener() {
    const unsubscribe = electron.on('os-theme-updated', (themeUpdate) => {
      handleSystemThemeUpdate(themeUpdate);
    });

    return unsubscribe;
  }

  /**
   * 监听主题变化，自动保存到存储
   */
  watch(
    () => theme.value,
    (newTheme) => {
      const settings = storage.getSetting();
      settings.theme = newTheme;
      storage.saveSettings(settings);
    },
  );

  return {
    isDark,
    theme,
    initTheme,
    toggleTheme,
    applyTheme,
    handleSystemThemeUpdate,
    setupSystemThemeListener,
  };
}
