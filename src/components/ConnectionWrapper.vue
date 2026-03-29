<template>
  <div
    ref="connectionMenu"
    :id="connectionAnchor"
    class="connection-menu"
    :class="{ 'menu-with-custom-color': !!config.color, 'is-opened': expanded }">
    <div class="connection-menu-header" @click="handleHeaderClick">
      <ConnectionMenu
        :config="config"
        :client='client'
        @changeColor='setColor'
        @refreshConnection='openConnection(false, true)'
        @open-status="openStatusFromMenu"
        @open-cli="openCliFromMenu">
      </ConnectionMenu>
    </div>

    <div v-show="expanded" class="connection-menu-body">
      <OperateItem
        ref='operateItem'
        :config="config"
        :client='client'>
      </OperateItem>

      <KeyList
        ref='keyList'
        :config="config"
        :globalSettings='globalSettings'
        :client='client'>
      </KeyList>
    </div>
  </div>
</template>

<script type="text/javascript">
import redisClient from '@/redisClient.js';
import KeyList from '@/components/KeyList';
import OperateItem from '@/components/OperateItem';
import ConnectionMenu from '@/components/ConnectionMenu';

export default {
  provide() {
    return {
      connectionWrapper: this,
    };
  },
  data() {
    return {
      client: null,
      expanded: false,
      pingTimer: null,
      pingInterval: 10000, // ms
      lastSelectedDb: 0,
    };
  },
  props: ['config', 'globalSettings', 'index'],
  components: { ConnectionMenu, OperateItem, KeyList },
  created() {
    this.$bus.$on('closeConnection', (connectionName = false) => {
      this.closeConnection(connectionName);
    });
    // open connection
    this.$bus.$on('openConnection', (connectionName) => {
      if (connectionName && (connectionName == this.resolvedConnectionName)) {
        this.expandPanel();
        this.openConnection();
      }
    });
  },
  computed: {
    resolvedConnectionName() {
      return this.config.connectionName || this.$storage.getConnectionName(this.config);
    },
    connectionAnchor() {
      return `connection-anchor-${this.resolvedConnectionName}`;
    },
  },
  methods: {
    expandPanel() {
      this.expanded = true;
    },
    collapsePanel() {
      this.expanded = false;
    },
    handleHeaderClick() {
      this.expandPanel();
      this.openConnection();
    },
    initShow() {
      this.$refs.operateItem.initShow();
      this.$refs.keyList.initShow();
    },
    initLastSelectedDb() {
      const db = parseInt(localStorage.getItem(`lastSelectedDb_${this.resolvedConnectionName}`));

      if (db > 0 && this.lastSelectedDb != db) {
        this.lastSelectedDb = db;
        this.$refs.operateItem && this.$refs.operateItem.setDb(db);
      }
    },
    openConnection(callback = false, forceOpen = false) {
      this.expandPanel();
      // scroll to connection
      this.scrollToConnection();
      // recovery last selected db
      this.initLastSelectedDb();

      // opened, do nothing
      if (this.client) {
        return forceOpen ? this.afterOpenConnection(this.client, callback) : false;
      }

      // set searching status first
      this.$refs.operateItem.searchIcon = 'el-icon-loading';

      // create a new client
      const clientPromise = this.getRedisClient(this.config);

      clientPromise.then((realClient) => {
        this.afterOpenConnection(realClient, callback);
      }).catch((e) => {});
    },
    afterOpenConnection(client, callback = false) {
      // new connection, not ready
      if (client.status != 'ready') {
        client.on('ready', () => {
          if (client.readyInited) {
            return;
          }

          client.readyInited = true;
          // open status tab
          this.$bus.$emit('openStatus', client, this.resolvedConnectionName);
          this.startPingInterval();

          this.initShow();
          callback && callback();
        });
      }

      // connection is ready
      else {
        this.initShow();
        callback && callback();
      }
    },
    closeConnection(connectionName) {
      // if connectionName is not passed, close all connections
      if (connectionName && (connectionName != this.resolvedConnectionName)) {
        return;
      }

      this.collapsePanel();
      this.$bus.$emit('removeAllTab', connectionName);

      // clear ping interval
      clearInterval(this.pingTimer);

      // reset operateItem items
      this.$refs.operateItem && this.$refs.operateItem.resetStatus();
      // reset keyList items
      this.$refs.keyList && this.$refs.keyList.resetKeyList(true);

      this.client && this.client.quit && this.client.quit();
      this.client = null;
    },
    startPingInterval() {
      this.pingTimer = setInterval(() => {
        this.client && this.client.ping().then((reply) => {}).catch((e) => {
          // this.$message.error('Ping Error: ' + e.message);
        });
      }, this.pingInterval);
    },
    getRedisClient(config) {
      // prevent changing back to raw config, such as config.db
      const configCopy = JSON.parse(JSON.stringify(config));
      // select db
      configCopy.db = this.lastSelectedDb;

      // ssh client
      if (configCopy.sshOptions) {
        var clientPromise = redisClient.createSSHConnection(
          configCopy.sshOptions, configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }
      // normal client
      else {
        var clientPromise = redisClient.createConnection(
          configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }

      clientPromise.then((client) => {
        this.client = client;

        client.on('error', (error) => {
          this.$message.error({
            message: `Client On Error: ${error} Config right?`,
            duration: 3000,
            customClass: 'redis-on-error-message',
          });

          this.$bus.$emit('closeConnection');
        });
      }).catch((error) => {
        this.$message.error(error.message);
        this.$bus.$emit('closeConnection');
      });

      return clientPromise;
    },
    setColor(color, save = true) {
      const menuDom = this.$refs.connectionMenu;
      const className = 'menu-with-custom-color';

      // save to setting
      save && this.$storage.editConnectionItem(this.config, { color });

      if (!color) {
        menuDom.classList.remove(className);
        this.$el.style.removeProperty('--menu-color');
      } else {
        menuDom.classList.add(className);
        this.$el.style.setProperty('--menu-color', color);
      }
    },
    openStatusFromMenu() {
      this.expandPanel();
      this.openConnection(() => {
        this.$bus.$emit('openStatus', this.client, this.resolvedConnectionName);
      });
    },
    openCliFromMenu() {
      this.expandPanel();
      this.openConnection(() => {
        this.$bus.$emit('openCli', this.client, this.resolvedConnectionName);
      });
    },
    scrollToConnection() {
      this.$nextTick(() => {
        setTimeout(() => {
          let scrollTop = 0;
          const menus = document.querySelectorAll('.connections-wrap .connection-menu');

          // calc height sum of all above menus
          for (const menu of menus) {
            if (menu.id === this.connectionAnchor) {
              break;
            }
            scrollTop += (menu.clientHeight + 8);
          }

          // if connections filter input exists, scroll more
          // 32 = height('.filter-input')+margin
          const offset = document.querySelector('.connections-wrap .filter-input') ? 32 : 0;
          document.querySelector('.connections-wrap').scrollTo({
            top: scrollTop + offset,
            behavior: 'smooth',
          });
        }, 320);
      });
    },
  },
  mounted() {
    this.setColor(this.config.color, false);
  },
  beforeUnmount() {
    this.closeConnection(this.resolvedConnectionName);
  },
};
</script>

<style type="text/css">
  .connection-menu {
    margin-bottom: 8px;
    padding-right: 6px;
    border-right: 0;
    border-left: 1px solid #ebeef5;
  }

  .connection-menu.menu-with-custom-color {
    border-left: 5px solid var(--menu-color);
    border-radius: 4px 0 0 4px;
    padding-left: 3px;
  }

  .connection-menu-header {
    cursor: pointer;
    user-select: none;
  }

  .connection-menu-body {
    padding-top: 6px;
  }

  /*this error shows first*/
  .redis-on-error-message {
    z-index:9999 !important;
  }
</style>
