import { ref, computed } from 'vue';
import * as storage from '../storage';

/**
 * useConnection - 连接列表管理 Composable
 *
 * 管理 Redis 连接列表的状态和操作，包括：
 * - 连接列表的加载和初始化
 * - 连接的过滤和排序
 * - 全局设置的管理
 *
 * @returns {Object} 返回响应式状态和方法
 */
export function useConnection() {
  // 响应式状态
  const connections = ref([]);
  const globalSettings = ref({});
  const filterMode = ref('');

  // 计算派生状态 - 过滤后的连接列表
  const filteredConnections = computed(() => {
    if (!filterMode.value) {
      return connections.value;
    }

    return connections.value.filter((conn) => {
      const name = storage.getConnectionName(conn);
      return name.toLowerCase().includes(filterMode.value.toLowerCase());
    });
  });

  /**
   * 初始化连接列表
   * 从 localStorage 加载所有连接配置
   */
  function initConnections() {
    const conns = storage.getConnections(true);
    connections.value = conns;
    globalSettings.value = storage.getSetting();
  }

  /**
   * 排序连接列表
   * 用于拖拽排序后的持久化
   *
   * @param {HTMLElement} el - 连接列表容器元素
   */
  function sortOrder(el) {
    if (!el) {
      return;
    }

    // 获取排序后的连接列表
    const sortedConnections = Array.from(el.querySelectorAll('[data-connection-key]'))
      .map((item) => {
        const key = item.getAttribute('data-connection-key');
        return connections.value.find(conn => storage.getConnectionKey(conn) === key);
      })
      .filter(Boolean);

    // 重新排序并保存
    if (sortedConnections.length > 0) {
      storage.reOrderAndStore(sortedConnections);
      connections.value = sortedConnections;
    }
  }

  /**
   * 添加新连接
   *
   * @param {Object} connection - 连接配置对象
   */
  function addConnection(connection) {
    storage.addConnection(connection);
    initConnections();
  }

  /**
   * 编辑连接
   *
   * @param {Object} connection - 连接配置对象
   * @param {string} oldKey - 旧的连接 key
   */
  function editConnection(connection, oldKey = '') {
    storage.editConnectionByKey(connection, oldKey);
    initConnections();
  }

  /**
   * 删除连接
   *
   * @param {Object} connection - 连接配置对象
   */
  function deleteConnection(connection) {
    storage.deleteConnection(connection);
    initConnections();
  }

  /**
   * 更新连接项的特定字段
   *
   * @param {Object} connection - 连接配置对象
   * @param {Object} items - 要更新的字段对象
   */
  function updateConnectionItem(connection, items = {}) {
    storage.editConnectionItem(connection, items);
    initConnections();
  }

  return {
    connections,
    globalSettings,
    filterMode,
    filteredConnections,
    initConnections,
    sortOrder,
    addConnection,
    editConnection,
    deleteConnection,
    updateConnectionItem,
  };
}
