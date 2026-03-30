<template>
  <div class="connections-wrap">
    <!-- search connections input -->
    <div
      v-if="connections.length>=filterEnableNum"
      class="filter-input"
    >
      <el-input
        v-model="filterMode"
        :suffix-icon="resolveElIcon('el-icon-search')"
        :placeholder="$t('message.search_connection')"
        clearable
        size="mini"
      />
    </div>

    <!-- connections list -->
    <div class="connections-list">
      <ConnectionWrapper
        v-for="item, index of filteredConnections"
        :key="item.key ? item.key : item.connectionName"
        :index="index"
        :global-settings="globalSettings"
        :config="item"
      />
    </div>

    <ScrollToTop
      parent-num="1"
      :pos-right="false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sortable from 'sortablejs'
import { resolveElIcon } from '@/element-plus-icons'
import { getConnections, getConnectionName, reOrderAndStore } from '@/storage'
import bus from '@/bus'
import ConnectionWrapper from '@/components/ConnectionWrapper'
import ScrollToTop from '@/components/ScrollToTop'

const connections = ref([])
const globalSettings = ref({})
const filterEnableNum = 4
const filterMode = ref('')

const filteredConnections = computed(() => {
  if (!filterMode.value) {
    return connections.value
  }

  return connections.value.filter(item => 
    item.name.toLowerCase().includes(filterMode.value.toLowerCase())
  )
})

const initConnections = () => {
  const connectionsList = getConnections(true)
  const slovedConnections = []

  for (const item of connectionsList) {
    item.connectionName = getConnectionName(item)
    delete item.db
    slovedConnections.push(item)
  }

  connections.value = slovedConnections
}

const sortOrder = () => {
  const dragWrapper = document.querySelector('.connections-list')
  Sortable.create(dragWrapper, {
    handle: '.connection-menu-header',
    animation: 400,
    direction: 'vertical',
    onEnd: (e) => {
      const { newIndex, oldIndex } = e
      const currentRow = connections.value.splice(oldIndex, 1)[0]
      connections.value.splice(newIndex, 0, currentRow)
      reOrderAndStore(connections.value)
    },
  })
}

bus.$on('refreshConnections', () => {
  initConnections()
})

bus.$on('reloadSettings', (settings) => {
  globalSettings.value = settings
})

onMounted(() => {
  initConnections()
  sortOrder()
})
</script>

<style type="text/css">
  .connections-wrap {
    height: calc(100vh - 59px);
    overflow-y: auto;
    margin-top: 11px;
  }
  .connections-wrap .filter-input {
    padding-right: 13px;
    margin-bottom: 4px;
  }
  /* set drag area min height, target to the end will be correct */
  .connections-wrap .connections-list {
    min-height: calc(100vh - 110px);
  }
</style>
