<template>
  <div ref="tabsRoot">
    <el-tabs
      v-model="selectedTabName"
      class="tabs-container"
      type="card"
      closable
      @tab-remove="removeTab"
      @tab-click="tabClick"
    >
      <el-tab-pane
        v-for="(item) in tabs"
        :key="item.name"
        :name="item.name"
      >
        <template #label>
          <span :title="item.title">
            <ElementIcon
              v-if="isElIconName(iconNameByComponent(item.component))"
              :name="iconNameByComponent(item.component)"
            />
            <i
              v-else
              :class="iconNameByComponent(item.component)"
            />
            <span>{{ item.label }}</span>
          </span>
        </template>

        <Status
          v-if="item.component === 'status'"
          :client="item.client"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
        <CliTab
          v-else-if="item.component === 'cli'"
          :ref="(component) => setTabContentRef(item.name, component)"
          :client="item.client"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
        <DeleteBatch
          v-else-if="item.component === 'delbatch'"
          :client="item.client"
          :rule="item.rule"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
        <MemoryAnalysis
          v-else-if="item.component === 'memory'"
          :client="item.client"
          :pattern="item.pattern"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
        <SlowLog
          v-else-if="item.component === 'slowlog'"
          :client="item.client"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
        <KeyDetail
          v-else
          :client="item.client"
          :redis-key="item.redisKey"
          :key-type="item.keyType"
          class="tab-content-wrappe"
          :hot-key-scope="item.name"
        />
      </el-tab-pane>
    </el-tabs>

    <div
      ref="tabContextMenu"
      class="tabs-context-menu"
    >
      <ul>
        <li @click="removeTab(preTabId)">
          {{ $t('message.close') }}
        </li>
        <li @click="removeOtherTabs('other')">
          {{ $t('message.close_other') }}
        </li>
        <li @click="removeOtherTabs('right')">
          {{ $t('message.close_right') }}
        </li>
        <li @click="removeOtherTabs('left')">
          {{ $t('message.close_left') }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import Status from '@/components/Status.vue'
import CliTab from '@/components/CliTab.vue'
import KeyDetail from '@/components/KeyDetail.vue'
import DeleteBatch from '@/components/DeleteBatch.vue'
import MemoryAnalysis from '@/components/MemoryAnalysis.vue'
import SlowLog from '@/components/SlowLog.vue'
import ElementIcon from '@/components/ElementIcon.vue'
import { isElIconName } from '@/element-plus-icons'
import { cutString, bufToString } from '@/util'
import bus from '@/bus'

const { t } = useI18n()

const selectedTabName = ref('')
const tabs = ref([])
const tabContentRefs = ref({})
const tabsRoot = ref(null)
const tabContextMenu = ref(null)
let preTabId = ''
let shortcut = null

const getTabsRoot = () => {
  return tabsRoot.value instanceof HTMLElement ? tabsRoot.value : null
}

const getTabsHeader = () => {
  const root = getTabsRoot()
  return root ? root.querySelector('.el-tabs__header') : null
}

const getTabHeaderItems = () => {
  const header = getTabsHeader()
  return header ? header.querySelectorAll('.el-tabs__item') : []
}

const removeTab = (removeName) => {
  if (!removeName) {
    return
  }

  delete tabContentRefs.value[removeName]

  let nextSelectTab

  if (selectedTabName.value === removeName) {
    tabs.value.forEach((tab, index) => {
      if (tab.name === removeName) {
        nextSelectTab = tabs.value[index + 1] || tabs.value[index - 1]
      }
    })
  }

  if (nextSelectTab) {
    selectedTabName.value = nextSelectTab.name
  }
  tabs.value = tabs.value.filter(tab => tab.name !== removeName)

  shortcut && shortcut.deleteScope(removeName)
  shortcut && shortcut.setScope(selectedTabName.value)
}

const tabClick = (tab, event) => {
  shortcut && shortcut.setScope(selectedTabName.value)

  const activeTabContent = tabContentRefs.value[selectedTabName.value]

  if (activeTabContent && (typeof activeTabContent.tabClick === 'function')) {
    activeTabContent.tabClick()
  }
}

const setTabContentRef = (name, component) => {
  if (!component) {
    delete tabContentRefs.value[name]
    return
  }

  tabContentRefs.value[name] = component
}

const addStatusTab = (client, tabName, newTab = true) => {
  const newTabItem = {
    name: `status_${tabName}`,
    label: cutString(tabName),
    title: tabName,
    client,
    component: 'status',
  }

  addTab(newTabItem, newTab)
}

const addCliTab = (client, tabName, newTab = true) => {
  const newTabItem = {
    name: `cli_${tabName}_${Math.random()}`,
    label: cutString(tabName),
    title: tabName,
    client,
    component: 'cli',
  }

  addTab(newTabItem, newTab)
}

const addDelBatchTab = (client, tabName, rule = {}) => {
  const newTabItem = {
    name: `del_batch_${tabName}_${Math.random()}`,
    label: cutString(tabName),
    title: tabName,
    client,
    component: 'delbatch',
    rule,
  }

  addTab(newTabItem, true)
}

const addMemoryTab = (client, tabName, pattern = '') => {
  const newTabItem = {
    name: `memory_analysis_${tabName}_${Math.random()}`,
    label: cutString(tabName),
    title: tabName,
    client,
    component: 'memory',
    pattern,
  }

  addTab(newTabItem, true)
}

const addSlowLogTab = (client, tabName) => {
  const newTabItem = {
    name: `slowlog_${tabName}_${Math.random()}`,
    label: cutString(tabName),
    title: tabName,
    client,
    component: 'slowlog',
  }

  addTab(newTabItem, true)
}

const initKeyTabItem = (client, key, type) => {
  const dbIndex = client.condition ? client.condition.select : 0
  const { connectionName } = client.options
  const keyStr = bufToString(key)

  const label = `${cutString(keyStr)} | ${cutString(connectionName)} | DB${dbIndex}`
  const name = `${keyStr} | ${connectionName} | DB${dbIndex}`

  return {
    name,
    label,
    title: name,
    client,
    component: 'key',
    redisKey: key,
    keyType: type,
  }
}

const addKeyTab = (client, key, newTab = false) => {
  client.type(key).then((type) => {
    if (type === 'none') {
      ElMessage.error({
        message: `${key} ${t('message.key_not_exists')}`,
        duration: 1000,
      })
      return
    }

    addTab(initKeyTabItem(client, key, type), newTab)
  }).catch((e) => {
    ElMessage.error(`Type Error: ${e.message}`)
  })
}

const addTab = (newTabItem, newTab = false) => {
  let exists = false

  tabs.value.forEach((item) => {
    if (item.name === newTabItem.name) {
      exists = true
    }
  })

  if (exists) {
    selectedTabName.value = newTabItem.name
    shortcut && shortcut.setScope(selectedTabName.value)
    return
  }

  if (newTab) {
    tabs.value.push(newTabItem)
  } else {
    let replaced = false

    tabs.value = tabs.value.map((item) => {
      if (item.name === selectedTabName.value && item.component === 'key') {
        replaced = true
        return newTabItem
      }

      return item
    })

    if (!replaced) {
      tabs.value.push(newTabItem)
    }
  }

  selectedTabName.value = newTabItem.name
  shortcut && shortcut.setScope(selectedTabName.value)
}

const iconNameByComponent = (component) => {
  const map = {
    cli: 'fa fa-terminal',
    status: 'el-icon-info',
    delbatch: 'el-icon-delete',
    memory: 'fa fa-table',
    slowlog: 'fa fa-hourglass-start',
  }

  const icon = map[component]
  return icon || 'fa fa-key'
}

const initShortcut = () => {
  shortcut = window.$shortcut
  shortcut.bind('ctrl+w, ⌘+w', () => {
    const closeWindow = !tabs.value.length
    removeTab(selectedTabName.value)
    return closeWindow
  })
}

const wheelToggleTabs = (event) => {
  let index = tabs.value.findIndex(item => item.name === selectedTabName.value)

  event.deltaY < 0 ? index-- : index++

  if (!tabs.value[index]) {
    return
  }

  selectedTabName.value = tabs.value[index].name
}

const hideAllMenus = () => {
  const menus = document.querySelectorAll('.tabs-context-menu')

  if (menus.length === 0) {
    return
  }

  for (const menu of menus) {
    menu.style.display = 'none'
  }
}

const openContextMenu = (event) => {
  preTabId = ''
  hideAllMenus()

  const items = getTabHeaderItems()

  if (!items.length) {
    return
  }

  for (const item of items) {
    if (item.contains(event.target)) {
      preTabId = item.id.substr(4)
    }
  }

  if (!preTabId) {
    return
  }

  const menu = tabContextMenu.value
  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`
  menu.style.display = 'block'

  document.addEventListener('click', hideAllMenus, { once: true })
}

const removeOtherTabs = (type = 'right') => {
  const index = tabs.value.findIndex(item => item.name === preTabId)

  if (index === -1) {
    return
  }

  switch (type) {
    case 'right': {
      tabs.value = tabs.value.slice(0, index + 1)
      break
    }
    case 'left': {
      tabs.value = tabs.value.slice(index)
      break
    }
    case 'other': {
      tabs.value = tabs.value.filter(item => item.name === preTabId)
      break
    }
  }

  const selectedTabExists = !!tabs.value.find(item => item.name === selectedTabName.value)
  if (!selectedTabExists) {
    selectedTabName.value = preTabId
  }
}

const bindTabEvents = () => {
  const header = getTabsHeader()
  if (header) {
    header.addEventListener('contextmenu', openContextMenu)
    header.addEventListener('wheel', wheelToggleTabs, { passive: true })
  }
}

watch(selectedTabName, (value) => {
  if (value) {
    shortcut && shortcut.setScope(value)
  }
})

// Bus event listeners
bus.$on('clickedKey', (client, key, newTab = false) => {
  addKeyTab(client, key, newTab)
})

bus.$on('openStatus', (client, tabName) => {
  addStatusTab(client, tabName)
})

bus.$on('openCli', (client, tabName) => {
  addCliTab(client, tabName)
})

bus.$on('openDelBatch', (client, tabName, rule = {}) => {
  addDelBatchTab(client, tabName, rule)
})

bus.$on('memoryAnalysis', (client, tabName, pattern = '') => {
  addMemoryTab(client, tabName, pattern)
})

bus.$on('slowLog', (client, tabName) => {
  addSlowLogTab(client, tabName)
})

bus.$on('removePreTab', () => {
  removeTab(selectedTabName.value)
})

bus.$on('removeAllTab', (connectionName) => {
  if (!connectionName) {
    tabs.value = []
    return
  }

  tabs.value = tabs.value.filter(tab => tab.client.options.connectionName !== connectionName)

  if (tabs.value.length) {
    const filteredTab = tabs.value.filter(tab => tab.name === selectedTabName.value)
    if (!filteredTab.length) {
      selectedTabName.value = tabs.value[0].name
    }
  }
})

nextTick(() => {
  initShortcut()
  bindTabEvents()
})
</script>

<style type="text/css">
  /*tabs header height*/
  .tabs-container .el-tabs__item {
    height: 34px;
    line-height: 34px;
  }
  .tabs-container .el-tabs__nav-next, .tabs-container .el-tabs__nav-prev {
    line-height: 34px;
  }
  /*height end*/

  .tab-content-wrappe {
    height: calc(100vh - 67px);
    overflow-x: hidden;
    overflow-y: auto;
    /*padding-left: 5px;*/
    padding-right: 8px;
  }

  /*tabs context menu*/
  .tabs-context-menu {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    padding: 0px;
    z-index: 99999;
    border-radius: 3px;
    border: 2px solid lightgrey;
    background: #fafafa;
  }
  .dark-mode .tabs-context-menu {
    background: #263238;
  }

  .tabs-context-menu ul {
    list-style: none;
    padding: 0px;
    margin: 0;
  }
  .tabs-context-menu ul li:not(:last-child) {
    border-bottom: 1px solid lightgrey;
  }

  .tabs-context-menu ul li {
    font-size: 13.4px;
    padding: 6px 10px;
    cursor: pointer;
    color: #263238;
  }
  .dark-mode .tabs-context-menu ul li {
    color: #fff;
  }

  .tabs-context-menu ul li:hover {
    background: #e4e2e2;
  }
  .dark-mode .tabs-context-menu ul li:hover {
    background: #344A4E;
  }
  /*context menu end*/
</style>
