import { ref, computed } from 'vue';
import redisClientModule from '../redisClient';

/**
 * useRedisClient - Redis 客户端管理 Composable
 *
 * 管理 Redis 客户端连接的状态和操作，包括：
 * - 客户端连接和断开
 * - 连接状态管理
 * - SSH 隧道支持
 * - 集群和 Sentinel 支持
 *
 * @returns {Object} 返回响应式状态和方法
 */
export function useRedisClient() {
  // 响应式状态
  const client = ref(null);
  const connecting = ref(false);
  const connected = ref(false);
  const error = ref(null);
  const connectionConfig = ref(null);

  // 计算派生状态
  const isConnected = computed(() => connected.value && client.value !== null);

  /**
   * 创建 Redis 连接
   * 支持 Standalone、Cluster、Sentinel、SSH 隧道等多种连接方式
   *
   * @param {Object} config - 连接配置
   * @param {string} config.host - Redis 主机地址
   * @param {number} config.port - Redis 端口
   * @param {string} config.auth - Redis 密码
   * @param {Object} config.sshOptions - SSH 隧道配置（可选）
   * @param {boolean} config.cluster - 是否为集群模式
   * @param {Object} config.sentinelOptions - Sentinel 配置（可选）
   * @returns {Promise<void>}
   */
  async function connect(config) {
    if (connecting.value) {
      return;
    }

    connecting.value = true;
    error.value = null;

    try {
      connectionConfig.value = config;

      let newClient;

      // SSH 隧道连接
      if (config.sshOptions) {
        newClient = await redisClientModule.createSSHConnection(
          config.sshOptions,
          config.host,
          config.port,
          config.auth,
          config,
        );
      }
      // 普通连接
      else {
        newClient = await redisClientModule.createConnection(
          config.host,
          config.port,
          config.auth,
          config,
        );
      }

      // 设置连接事件监听
      setupClientListeners(newClient);

      client.value = newClient;
      connected.value = true;
    } catch (err) {
      error.value = err;
      client.value = null;
      connected.value = false;
      console.error('Failed to connect to Redis:', err);
      throw err;
    } finally {
      connecting.value = false;
    }
  }

  /**
   * 设置客户端事件监听
   *
   * @param {Object} redisClient - Redis 客户端实例
   */
  function setupClientListeners(redisClient) {
    if (!redisClient) {
      return;
    }

    redisClient.on('ready', () => {
      connected.value = true;
      error.value = null;
    });

    redisClient.on('error', (err) => {
      error.value = err;
      console.error('Redis client error:', err);
    });

    redisClient.on('close', () => {
      connected.value = false;
    });

    redisClient.on('reconnecting', () => {
      connected.value = false;
    });
  }

  /**
   * 断开 Redis 连接
   *
   * @returns {Promise<void>}
   */
  async function disconnect() {
    if (!client.value) {
      return;
    }

    try {
      await client.value.quit();
    } catch (err) {
      console.error('Error disconnecting from Redis:', err);
      // 强制关闭连接
      client.value.disconnect();
    } finally {
      client.value = null;
      connected.value = false;
      connectionConfig.value = null;
      error.value = null;
    }
  }

  /**
   * 执行 Redis 命令
   *
   * @param {string} command - 命令名称
   * @param {...any} args - 命令参数
   * @returns {Promise<any>}
   */
  async function executeCommand(command, ...args) {
    if (!client.value) {
      throw new Error('Redis client not connected');
    }

    try {
      return await client.value.call(command, ...args);
    } catch (err) {
      error.value = err;
      throw err;
    }
  }

  /**
   * 获取连接信息
   *
   * @returns {Object} 连接信息
   */
  function getConnectionInfo() {
    if (!client.value) {
      return null;
    }

    return {
      host: client.value.options.host,
      port: client.value.options.port,
      db: client.value.options.db || 0,
      status: connected.value ? 'connected' : 'disconnected',
    };
  }

  /**
   * 选择数据库
   *
   * @param {number} db - 数据库编号
   * @returns {Promise<void>}
   */
  async function selectDatabase(db) {
    if (!client.value) {
      throw new Error('Redis client not connected');
    }

    try {
      await client.value.select(db);
    } catch (err) {
      error.value = err;
      throw err;
    }
  }

  /**
   * 获取数据库统计信息
   *
   * @returns {Promise<Object>}
   */
  async function getInfo() {
    if (!client.value) {
      throw new Error('Redis client not connected');
    }

    try {
      return await client.value.info();
    } catch (err) {
      error.value = err;
      throw err;
    }
  }

  return {
    client,
    connecting,
    connected,
    isConnected,
    error,
    connectionConfig,
    connect,
    disconnect,
    executeCommand,
    getConnectionInfo,
    selectDatabase,
    getInfo,
  };
}
