<template>
  <div>
    <!-- auto refresh row -->
    <el-row>
      <el-col>
        <div style="float: right;">
          <el-tag type="info">
            <ElementIcon name="el-icon-refresh" />
            {{ $t('message.auto_refresh') }}
          </el-tag>

          <el-tooltip
            class="item"
            effect="dark"
            :content="$t('message.auto_refresh_tip', {interval: refreshInterval / 1000})"
            placement="bottom"
          >
            <el-switch
              v-model="autoRefresh"
              @change="refreshInit"
            />
          </el-tooltip>
        </div>
      </el-col>
    </el-row>

    <!-- server status row -->
    <el-row
      :gutter="10"
      class="status-container status-card"
    >
      <!-- server -->
      <el-col :span="8">
        <el-card class="box-card">
          <template #header>
            <div>
              <i class="fa fa-server" />
              <span>{{ $t('message.server') }}</span>
            </div>
          </template>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.redis_version') }}:
              <span class="server-status-text">{{ connectionStatus.redis_version }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              OS:
              <span
                class="server-status-text"
                :title="connectionStatus.os"
              >{{ connectionStatus.os }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.process_id') }}:
              <span class="server-status-text">{{ connectionStatus.process_id }}</span>
            </el-tag>
          </p>
        </el-card>
      </el-col>

      <!-- memory row -->
      <el-col :span="8">
        <el-card class="box-card">
          <template #header>
            <div>
              <i class="fa fa-microchip" />
              <span>{{ $t('message.memory') }}</span>
            </div>
          </template>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.used_memory') }}:
              <span class="server-status-text">{{ $util.humanFileSize(connectionStatus.used_memory) }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.used_memory_peak') }}:
              <span class="server-status-text">{{ $util.humanFileSize(connectionStatus.used_memory_peak) }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.used_memory_lua') }}:
              <span class="server-status-text">{{ $util.humanFileSize(connectionStatus.used_memory_lua) }}</span>
            </el-tag>
          </p>
        </el-card>
      </el-col>

      <!-- stats row -->
      <el-col :span="8">
        <el-card class="box-card">
          <template #header>
            <div>
              <i class="fa fa-thermometer-three-quarters" />
              <span>{{ $t('message.stats') }}</span>
            </div>
          </template>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.connected_clients') }}:
              <span class="server-status-text">{{ connectionStatus.connected_clients }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.total_connections_received') }}:
              <span class="server-status-text">{{ connectionStatus.total_connections_received }}</span>
            </el-tag>
          </p>

          <p class="server-status-tag-p">
            <el-tag
              class="server-status-container"
              type="info"
              size="big"
            >
              {{ $t('message.total_commands_processed') }}:
              <span class="server-status-text">{{ connectionStatus.total_commands_processed }}</span>
            </el-tag>
          </p>
        </el-card>
      </el-col>
    </el-row>

    <!-- cluster key statistics -->
    <el-row class="status-card">
      <el-col>
        <el-card class="box-card">
          <template #header>
            <div>
              <i class="fa fa-bar-chart" />
              <span>{{ $t('message.key_statistics') }}</span>
            </div>
          </template>

          <el-table
            :data="DBKeys"
            stripe
          >
            <el-table-column
              v-if="isCluster"
              prop="name"
              sortable
              label="Node"
            />
            <el-table-column
              prop="db"
              sortable
              label="DB"
            />
            <el-table-column
              sortable
              prop="keys_show"
              label="Keys"
              :sort-method="sortByKeys"
            />
            <el-table-column
              sortable
              prop="expires_show"
              label="Expires"
              :sort-method="sortByExpires"
            />
            <!-- avg_ttl: tooltip can't be removed!, or the table's height will change -->
            <el-table-column
              sortable
              prop="avg_ttl_show"
              :show-overflow-tooltip="true"
              label="Avg TTL"
              :sort-method="sortByTTL"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- redis all info -->
    <el-row class="status-card">
      <el-col>
        <el-card class="box-card">
          <template #header>
            <div>
              <i class="fa fa-info-circle" />
              <span>{{ $t('message.all_redis_info') }}</span>
              <!-- search input -->
              <el-input
                v-model="allInfoFilter"
                size="mini"
                :suffix-icon="resolveElIcon('el-icon-search')"
                class="status-filter-input"
              />
            </div>
          </template>

          <el-table
            :data="AllRedisInfo"
            stripe
          >
            <el-table-column
              prop="key"
              sortable
              label="Key"
            />
            <el-table-column
              prop="value"
              :show-overflow-tooltip="true"
              label="Value"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <ScrollToTop parent-num="1" />
  </div>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import ScrollToTop from '@/components/ScrollToTop.vue';
import ElementIcon from '@/components/ElementIcon.vue';
import { resolveElIcon } from '@/element-plus-icons';
import util from '@/util';

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
  hotKeyScope: {
    type: String,
    required: true,
  },
});

const autoRefresh = ref(false);
const refreshTimer = ref(null);
const refreshInterval = 2000;
const connectionStatus = ref({});
const allInfoFilter = ref('');
const DBKeys = ref([]);

const AllRedisInfo = computed(() => {
  const infos = [];
  const filter = allInfoFilter.value.toLowerCase();

  // filter mode
  if (filter) {
    for (const i in connectionStatus.value) {
      if (i.includes(filter)) {
        infos.push({ key: i, value: connectionStatus.value[i] });
      }
    }
  }
  // all info
  else {
    for (const i in connectionStatus.value) {
      infos.push({ key: i, value: connectionStatus.value[i] });
    }
  }

  return infos;
});

const isCluster = computed(() => connectionStatus.value.cluster_enabled === '1');

function initShow() {
  props.client.info().then((reply) => {
    connectionStatus.value = initStatus(reply);
    // set global param
    props.client.ardmRedisVersion = connectionStatus.value.redis_version;

    // init db keys info
    if (isCluster.value) {
      initClusterKeys();
    } else {
      DBKeys.value = initDbKeys(connectionStatus.value);
    }
  }).catch((e) => {
    // info command may be disabled
    if (e.message.includes('unknown command')) {
      window.$message.error({
        message: util.t('message.info_disabled'),
        duration: 3000,
      });
    }
    // no auth not show
    else if (e.message.includes('NOAUTH')) {} else {
      window.$message.error(e.message);
    }
  });
}

function refreshInit() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }

  if (autoRefresh.value) {
    initShow();

    refreshTimer.value = setInterval(() => {
      initShow();
    }, refreshInterval);
  }
}

function sortByKeys(a, b) {
  return a.keys - b.keys;
}

function sortByExpires(a, b) {
  return a.expires - b.expires;
}

function sortByTTL(a, b) {
  return a.avg_ttl - b.avg_ttl;
}

function initStatus(content) {
  if (!content) {
    return {};
  }

  content = content.split('\n');
  const lines = {};

  for (let i of content) {
    i = i.replace(/\s/ig, '');
    if (i.startsWith('#') || !i) continue;

    const kv = i.split(':');
    lines[kv[0]] = kv[1];
  }

  return lines;
}

function initDbKeys(status, name = undefined) {
  const dbs = [];

  for (const i in status) {
    // fix #1101 unexpected db prefix
    // if (i.startsWith('db')) {
    if (/^db\d+/.test(i)) {
      const array = status[i].split(',');

      const keys = parseInt(array[0] ? array[0].split('=')[1] : NaN);
      const expires = parseInt(array[1] ? array[1].split('=')[1] : NaN);
      const avg_ttl = parseInt(array[2] ? array[2].split('=')[1] : NaN);

      // #1261 locale to the key count
      dbs.push({
        db: i,
        keys,
        expires,
        avg_ttl,
        keys_show: keys.toLocaleString(),
        expires_show: expires.toLocaleString(),
        avg_ttl_show: avg_ttl.toLocaleString(),
        name,
      });
    }
  }

  return dbs;
}

function initClusterKeys() {
  // const nodes = props.client.nodes('master');
  const nodes = props.client.nodes ? props.client.nodes('master') : [props.client];

  if (!nodes || !nodes.length) {
    return;
  }

  // get real node name in ssh+cluster, instead of local port
  const { natMap } = props.client.options;
  const clusterNodeNames = {};

  if (natMap && Object.keys(natMap).length) {
    for (const real in natMap) {
      clusterNodeNames[`${natMap[real].host}:${natMap[real].port}`] = real;
    }
  }

  nodes.map((node) => {
    node.call('INFO', 'KEYSPACE').then((reply) => {
      const { options } = node;

      // fix #1221 node name in ssh+cluster
      let name = `${options.host}:${options.port}`;
      name = clusterNodeNames[name] || name;

      const keys = initDbKeys(initStatus(reply), name);

      // clear only when first reply, avoid jitter
      if (DBKeys.value.length === nodes.length) {
        DBKeys.value = [];
      }

      DBKeys.value = DBKeys.value.concat(keys);
      // sort by node name
      DBKeys.value.sort((a, b) => (a.name > b.name ? 1 : -1));
    }).catch((e) => {
      window.$message.error(e.message);
    });
  });
}

function initShortcut() {
  window.$shortcut.bind('ctrl+r, ⌘+r, f5', props.hotKeyScope, () => {
    initShow();
    return false;
  });
}

onMounted(() => {
  initShow();
  refreshInit();
  initShortcut();
});

onUnmounted(() => {
  // clear interval when tab is closed
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }
  window.$shortcut.deleteScope(props.hotKeyScope);
});
</script>

<style type="text/css">
  .el-row.status-card {
    margin-top: 20px;
  }
  .server-status-tag-p {
    height: 32px;
  }
  .server-status-container{
    width: 100%;
    overflow-x: hidden;
    text-overflow: ellipsis;
  }
  .server-status-text{
    color: #43b50b;
  }
  .status-filter-input {
    float: right;
    width: 100px;
  }

  /*fix table height changes[scrollTop changes] when tab toggled*/
  .status-card .el-table__header-wrapper{
      height: 50px;
  }
  .status-card .el-table__body-wrapper{
      /*height: calc(100% - 50px) !important;*/
  }
</style>
