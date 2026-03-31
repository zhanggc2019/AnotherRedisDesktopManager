<template>
  <div
    :id="connectionAnchor"
    ref="connectionMenu"
    class="connection-menu"
    :class="{ 'menu-with-custom-color': !!config.color, 'is-opened': expanded }"
  >
    <div
      class="connection-menu-header"
      @click="handleHeaderClick"
    >
      <ConnectionMenu
        :config="config"
        :client="client"
        @change-color="setColor"
        @refresh-connection="openConnection(false, true)"
        @open-status="openStatusFromMenu"
        @open-cli="openCliFromMenu"
      />
    </div>

    <div
      v-show="expanded"
      class="connection-menu-body"
    >
      <OperateItem
        ref="operateItem"
        :config="config"
        :client="client"
      />

      <KeyList
        ref="keyList"
        :config="config"
        :global-settings="globalSettings"
        :client="client"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import redisClient from '@/redisClient'
import bus from '@/bus'
import KeyList from '@/components/KeyList.vue'
import OperateItem from '@/components/OperateItem.vue'
import ConnectionMenu from '@/components/ConnectionMenu.vue'
import { getConnectionName } from '@/storage'

const props = defineProps({
  config: Object,
  globalSettings: Object,
  index: Number,
})

const client = ref(null)
const expanded = ref(false)
const pingTimer = ref(null)
const pingInterval = 10000
const lastSelectedDb = ref(0)
const connectionMenu = ref(null)
const operateItem = ref(null)
const keyList = ref(null)

const resolvedConnectionName = computed(() => {
  return props.config.connectionName || getConnectionName(props.config)
})

const connectionAnchor = computed(() => {
  return `connection-anchor-${resolvedConnectionName.value}`
})

provide('connectionWrapper', {
  client,
  expanded,
  operateItem,
  keyList,
})

const expandPanel = () => {
  expanded.value = true
}

const collapsePanel = () => {
  expanded.value = false
}

const handleHeaderClick = () => {
  expandPanel()
  openConnection()
}

const initShow = () => {
  console.log('[ConnectionWrapper] initShow called');
  console.log('[ConnectionWrapper] operateItem.value:', operateItem.value);
  console.log('[ConnectionWrapper] keyList.value:', keyList.value);
  console.log('[ConnectionWrapper] client.value:', client.value);
  
  if (operateItem.value && operateItem.value.initShow) {
    console.log('[ConnectionWrapper] Calling operateItem.initShow');
    operateItem.value.initShow();
  } else {
    console.warn('[ConnectionWrapper] operateItem.value or initShow not available');
  }
  
  if (keyList.value && keyList.value.initShow) {
    console.log('[ConnectionWrapper] Calling keyList.initShow');
    keyList.value.initShow();
  } else {
    console.warn('[ConnectionWrapper] keyList.value or initShow not available');
  }
}

const initLastSelectedDb = () => {
  const db = parseInt(localStorage.getItem(`lastSelectedDb_${resolvedConnectionName.value}`))

  if (db > 0 && lastSelectedDb.value !== db) {
    lastSelectedDb.value = db
    operateItem.value && operateItem.value.setDb(db)
  }
}

const openConnection = (callback = false, forceOpen = false) => {
  expandPanel()
  scrollToConnection()
  initLastSelectedDb()

  if (client.value) {
    return forceOpen ? afterOpenConnection(client.value, callback) : false
  }

  if (operateItem.value) {
    operateItem.value.searchIcon = 'el-icon-loading'
  }

  const clientPromise = getRedisClient(props.config)

  clientPromise.then((realClient) => {
    // 确保client.value被设置
    client.value = realClient
    console.log('[ConnectionWrapper] client.value set in openConnection:', client.value);
    afterOpenConnection(realClient, callback)
  }).catch((e) => {
    console.error('[ConnectionWrapper] Failed to get redis client:', e);
  })
}

const afterOpenConnection = (realClient, callback = false) => {
  console.log('[ConnectionWrapper] afterOpenConnection called, client status:', realClient.status);
  console.log('[ConnectionWrapper] client.value:', client.value);
  
  if (realClient.status !== 'ready') {
    realClient.on('ready', () => {
      if (realClient.readyInited) {
        return
      }

      console.log('[ConnectionWrapper] Client ready event fired');
      realClient.readyInited = true
      bus.$emit('openStatus', realClient, resolvedConnectionName.value)
      startPingInterval()
      
      // 使用nextTick确保DOM更新后再调用initShow
      import('vue').then(({ nextTick }) => {
        nextTick(() => {
          console.log('[ConnectionWrapper] Calling initShow after nextTick');
          initShow()
        })
      })
      
      callback && callback()
    })
  } else {
    console.log('[ConnectionWrapper] Client already ready');
    
    // 使用nextTick确保DOM更新后再调用initShow
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        console.log('[ConnectionWrapper] Calling initShow after nextTick');
        initShow()
      })
    })
    
    callback && callback()
  }
}

const closeConnection = (connectionName) => {
  if (connectionName && (connectionName !== resolvedConnectionName.value)) {
    return
  }

  collapsePanel()
  bus.$emit('removeAllTab', connectionName)

  clearInterval(pingTimer.value)

  operateItem.value && operateItem.value.resetStatus()
  keyList.value && keyList.value.resetKeyList(true)

  client.value && client.value.quit && client.value.quit()
  client.value = null
}

const startPingInterval = () => {
  pingTimer.value = setInterval(() => {
    client.value && client.value.ping().then((reply) => {}).catch((e) => {})
  }, pingInterval)
}

const getRedisClient = (config) => {
  const configCopy = JSON.parse(JSON.stringify(config))
  configCopy.db = lastSelectedDb.value

  let clientPromise

  if (configCopy.sshOptions) {
    clientPromise = redisClient.createSSHConnection(
      configCopy.sshOptions, configCopy.host, configCopy.port, configCopy.auth, configCopy,
    )
  } else {
    clientPromise = redisClient.createConnection(
      configCopy.host, configCopy.port, configCopy.auth, configCopy,
    )
  }

  clientPromise.then((realClient) => {
    realClient.on('error', (error) => {
      ElMessage.error({
        message: `Client On Error: ${error} Config right?`,
        duration: 3000,
        customClass: 'redis-on-error-message',
      })

      bus.$emit('closeConnection')
    })
  }).catch((error) => {
    ElMessage.error(error.message)
    bus.$emit('closeConnection')
  })

  return clientPromise
}

const setColor = (color, save = true) => {
  const menuDom = connectionMenu.value
  const className = 'menu-with-custom-color'

  if (save) {
    // Save to setting - need to import editConnectionItem
    const { editConnectionItem } = require('@/storage')
    editConnectionItem(props.config, { color })
  }

  if (!color) {
    menuDom.classList.remove(className)
    menuDom.style.removeProperty('--menu-color')
  } else {
    menuDom.classList.add(className)
    menuDom.style.setProperty('--menu-color', color)
  }
}

const openStatusFromMenu = () => {
  expandPanel()
  openConnection(() => {
    bus.$emit('openStatus', client.value, resolvedConnectionName.value)
  })
}

const openCliFromMenu = () => {
  expandPanel()
  openConnection(() => {
    bus.$emit('openCli', client.value, resolvedConnectionName.value)
  })
}

const scrollToConnection = () => {
  setTimeout(() => {
    let scrollTop = 0
    const menus = document.querySelectorAll('.connections-wrap .connection-menu')

    for (const menu of menus) {
      if (menu.id === connectionAnchor.value) {
        break
      }
      scrollTop += (menu.clientHeight + 8)
    }

    const offset = document.querySelector('.connections-wrap .filter-input') ? 32 : 0
    document.querySelector('.connections-wrap').scrollTo({
      top: scrollTop + offset,
      behavior: 'smooth',
    })
  }, 320)
}

bus.$on('closeConnection', (connectionName = false) => {
  closeConnection(connectionName)
})

bus.$on('openConnection', (connectionName) => {
  if (connectionName && (connectionName === resolvedConnectionName.value)) {
    expandPanel()
    openConnection()
  }
})

onMounted(() => {
  setColor(props.config.color, false)
})

onBeforeUnmount(() => {
  closeConnection(resolvedConnectionName.value)
})
</script>

<style type="text/css">
  .connection-menu {
    margin-bottom: 8px;
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
    padding-right: 8px;
  }

  .connection-menu-body {
    padding: 6px 0 0 0;
  }

  .connection-menu-body .connection-form {
    padding-right: 8px;
  }

  /*this error shows first*/
  .redis-on-error-message {
    z-index: 9999 !important;
  }
</style>
