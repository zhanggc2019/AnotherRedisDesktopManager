import { ref, watch } from 'vue';
import * as util from '../util';

/**
 * useKeyList - Key 列表管理 Composable
 * 
 * 管理 Redis Key 列表的状态和操作，包括：
 * - Key 列表的加载和刷新
 * - 搜索和过滤
 * - 树形结构的展开/折叠状态
 * 
 * @param {Ref} client - Redis 客户端引用
 * @param {Object} options - 配置选项
 * @returns {Object} 返回响应式状态和方法
 */
export function useKeyList(client, options = {}) {
  // 响应式状态
  const keyList = ref([]);
  const loading = ref(false);
  const searchPattern = ref('');
  const treeOpenStatus = ref(new Set());
  const listMode = ref(options.listMode || 'tree'); // 'tree' 或 'list'
  const separator = ref(options.separator || ':');

  /**
   * 加载 Key 列表
   * 从 Redis 获取指定数据库的所有 Key
   * 
   * @param {Object} redisClient - Redis 客户端实例
   * @param {number} db - 数据库编号
   * @param {string} pattern - 搜索模式（可选）
   */
  async function loadKeys(redisClient, db, pattern = '*') {
    if (!redisClient) {
      return;
    }

    loading.value = true;

    try {
      // 切换数据库
      await redisClient.select(db);

      // 获取 Key 列表
      const keys = await redisClient.keys(pattern);

      // 根据模式转换为树形或列表结构
      if (listMode.value === 'tree') {
        keyList.value = util.keysToTree(keys, separator.value, treeOpenStatus.value);
      } else {
        keyList.value = util.keysToList(keys);
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
      keyList.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * 刷新 Key 列表
   * 重新加载当前数据库的 Key 列表
   */
  async function refreshKeys() {
    if (!client.value) {
      return;
    }

    const pattern = searchPattern.value || '*';
    await loadKeys(client.value, client.value.options.db || 0, pattern);
  }

  /**
   * 搜索 Key
   * 根据搜索模式加载匹配的 Key
   * 
   * @param {string} pattern - 搜索模式（支持 Redis KEYS 命令的通配符）
   */
  async function searchKeys(pattern) {
    searchPattern.value = pattern;
    await refreshKeys();
  }

  /**
   * 切换树节点的展开/折叠状态
   * 
   * @param {string} nodeKey - 节点的唯一标识
   */
  function toggleNodeOpen(nodeKey) {
    if (treeOpenStatus.value.has(nodeKey)) {
      treeOpenStatus.value.delete(nodeKey);
    } else {
      treeOpenStatus.value.add(nodeKey);
    }

    // 重新生成树结构以反映展开状态
    if (client.value && listMode.value === 'tree') {
      const keys = keyList.value.map((item) => {
        if (item.nameBuffer) {
          return Buffer.from(item.nameBuffer.data);
        }
        return item.name;
      });
      keyList.value = util.keysToTree(keys, separator.value, treeOpenStatus.value);
    }
  }

  /**
   * 清空 Key 列表
   */
  function clearKeys() {
    keyList.value = [];
    searchPattern.value = '';
    treeOpenStatus.value.clear();
  }

  /**
   * 监听客户端变化，自动刷新 Key 列表
   */
  watch(
    () => client?.value,
    (newClient) => {
      if (newClient) {
        refreshKeys();
      } else {
        clearKeys();
      }
    },
  );

  return {
    keyList,
    loading,
    searchPattern,
    treeOpenStatus,
    listMode,
    separator,
    loadKeys,
    refreshKeys,
    searchKeys,
    toggleNodeOpen,
    clearKeys,
  };
}
