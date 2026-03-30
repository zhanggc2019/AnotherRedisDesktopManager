<template>
  <div>
    <!-- key list -->
    <component
      :is="keyListType"
      :config="props.config"
      :client="props.client"
      :keyList="keyList"
      @exportBatch="exportBatch">
    </component>

    <div class='keys-load-more-wrapper'>
      <!-- load more -->
      <el-button
        ref='scanMoreBtn'
        class='load-more-keys'
        :icon="resolveElIcon(searching && !loadingAll ? 'el-icon-loading' : '')"
        :disabled='scanMoreDisabled || searching'
        @click='refreshKeyList(false)'>
        {{ t('message.load_more_keys') }}
      </el-button>

      <!-- load all -->
      <!-- fix el-tooltip 200ms delay when closing -->
      <el-tooltip v-if='showLoadAllKeys' :disabled="!loadAllTooltip"
        @mouseenter="loadAllTooltip=true" @mouseleave="loadAllTooltip=false"
        effect="dark" :content="t('message.load_all_keys_tip')"
        placement="bottom" :open-delay=380 :enterable='false'>
        <el-button
          class='load-more-keys'
          type= 'danger'
          :icon="resolveElIcon(searching && loadingAll ? 'el-icon-loading' : '')"
          :disabled='searching'
          @click='loadAllKeys()'>
          {{ t('message.load_all_keys') }}
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import {
  ref, computed, watch, inject, onMounted,
} from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from '@/composables/useI18n';
import { resolveElIcon } from '@/element-plus-icons';
import bus from '@/bus';
import { createAndDownloadFile } from '@/util';
import KeyListVirtualTree from '@/components/KeyListVirtualTree.vue';

const props = defineProps({
  client: Object,
  config: Object,
  globalSettings: Object,
});

const emit = defineEmits(['exportBatch']);

const { t } = useI18n();

const connectionWrapper = inject('connectionWrapper');

const keyList = ref([]);
const keyListType = ref('KeyListVirtualTree');
const searchPageSize = 10000;
let scanStreams = [];
let scanningCount = 0;
const scanMoreDisabled = ref(false);
let onePageKeysCount = 0;
const loadAllTooltip = ref(true);
const loadingAll = ref(false);

const keysPageSize = computed(() => {
  const keysPageSize = parseInt(props.globalSettings.keysPageSize);

  // custom defined size
  if (keysPageSize) {
    // cluster mode, pageSize = size / masterNodes
    if (props.client.nodes) {
      const nodeCount = props.client.nodes('master').length;
      return nodeCount ? parseInt(keysPageSize / nodeCount) : keysPageSize;
    }

    // common mode
    return keysPageSize;
  }

  return 500;
});

const showLoadAllKeys = computed(() => {
  // force show
  return true;
  // return props.globalSettings.showLoadAllKeys
});

const searching = computed(() => {
  const operateItem = getOperateItem();
  return !!operateItem && operateItem.searchIcon == 'el-icon-loading';
});

function getOperateItem() {
  return connectionWrapper && connectionWrapper.$refs
    ? connectionWrapper.$refs.operateItem
    : null;
}

function initShow() {
  refreshKeyList();
}

function setDb(db) {
  (props.client.condition.select != db) && props.client.select(db);
}

function refreshKeyList(resetKeyList = true) {
  // reset previous list, not append mode
  resetKeyList && resetList();

  // show searching status
  setSearchStatus();

  // extract search
  const operateItem = getOperateItem();
  if (operateItem && operateItem.searchExact === true) {
    return refreshKeyListExact();
  }

  // init scanStream
  if (!scanStreams.length) {
    initScanStreamsAndScan();
  }

  // scan more, resume previous scanStream
  else {
    // reset one page scan param
    onePageKeysCount = 0;

    for (const stream of scanStreams) {
      stream.resume();
    }
  }
}

function loadAllKeys() {
  resetList();
  loadingAll.value = true;

  // show searching status
  setSearchStatus();
  initScanStreamsAndScan(true);
}

function initScanStreamsAndScan(loadAll = false) {
  const nodes = props.client.nodes ? props.client.nodes('master') : [props.client];
  const keysPageSizeVal = loadAll ? 50000 : keysPageSize.value;
  scanningCount = nodes.length;

  nodes.map((node) => {
    const scanOption = {
      match: getMatchMode(),
      count: keysPageSizeVal,
    };

    // scan count is bigger when in search mode
    scanOption.match != '*' && (scanOption.count = searchPageSize);

    const stream = node.scanBufferStream(scanOption);
    scanStreams.push(stream);

    stream.on('data', (keys) => {
      if (!keys.length) {
        return;
      }

      keyList.value = keyList.value.concat(keys);
      onePageKeysCount += keys.length;

      // scan once reaches page size
      if (onePageKeysCount >= keysPageSizeVal && loadAll === false) {
        // temp stop
        stream.pause();
        resetSearchStatus();
      }
    });

    stream.on('error', (e) => {
      resetSearchStatus();

      // scan command disabled, other functions may be used normally
      if (
        (e.message.includes('unknown command') && e.message.includes('scan'))
        || e.message.includes("command 'SCAN' is not allowed")
      ) {
        return ElMessage.error({
          message: t('message.scan_disabled'),
          duration: 1500,
        });
      }

      // other errors
      ElMessage.error({
        message: `Stream On Error: ${e.message}`,
        duration: 1500,
      });

      setTimeout(() => {
        bus.$emit('closeConnection');
      }, 50);
    });

    stream.on('end', () => {
      // all nodes scan finished(cusor back to 0)
      if (--scanningCount <= 0) {
        scanMoreDisabled.value = true;
        resetSearchStatus();
      }
    });
  });
}

function resetList() {
  // cancel scanning
  cancelScanning();
  keyList.value = [];
  scanStreams = [];
  onePageKeysCount = 0;
  scanMoreDisabled.value = false;
  loadingAll.value = false;
}

function setSearchStatus() {
  const operateItem = getOperateItem();
  if (!operateItem) {
    return;
  }

  // search loading
  operateItem.searchIcon = 'el-icon-loading';
  // show cancel scanning btn after scanning for a while
  operateItem.toggleCancelIcon(true);
}

function resetSearchStatus() {
  const operateItem = getOperateItem();
  if (!operateItem) {
    loadingAll.value = false;
    return;
  }

  // search input icon recover
  operateItem.searchIcon = 'el-icon-search';
  // remove cancel scanning btn
  operateItem.toggleCancelIcon(false);
  // reset loading all status
  loadingAll.value = false;
}

function refreshKeyListExact() {
  const match = getMatchMode(false);

  props.client.exists(match).then((reply) => {
    keyList.value = (reply == 1) ? [Buffer.from(match)] : [];
  }).catch((e) => {
    ElMessage.error(e.message);
  }).finally(() => {
    scanMoreDisabled.value = true;
    resetSearchStatus();
  });
}

function cancelScanning() {
  if (scanStreams.length) {
    for (const stream of scanStreams) {
      stream.pause && stream.pause();
    }
  }
}

function getMatchMode(fillStar = true) {
  const operateItem = getOperateItem();
  let match = operateItem ? operateItem.searchMatch : '';

  match = match || '*';

  if (fillStar && !match.match(/\*/)) {
    match = (`*${match}*`);
  }

  return match;
}

function removeKeyFromKeyList(key) {
  if (!keyList.value) {
    return false;
  }

  for (const i in keyList.value) {
    if (keyList.value[i].equals(key)) {
      keyList.value.splice(i, 1);
      break;
    }
  }
}

function addKeyToKeyList(key) {
  if (!keyList.value) {
    return false;
  }

  for (const i in keyList.value) {
    if (keyList.value[i].equals(key)) {
      // exists already
      return;
    }
  }

  keyList.value.push(key);
}

function exportBatch(keys) {
  const lines = [];
  const failed = [];
  const promiseQueue = [];

  for (const key of keys) {
    const promise = props.client.callBuffer('DUMP', key);
    const promise1 = props.client.callBuffer('PTTL', key);
    promiseQueue.push(promise, promise1);
  }

  Promise.allSettled(promiseQueue).then((reply) => {
    for (let i = 0; i < reply.length; i += 2) {
      if (reply[i].status === 'fulfilled') {
        const key = keys[i / 2].toString('hex');
        const value = reply[i].value.toString('hex');
        const ttl = reply[i + 1].value;

        const line = `${key},${value},${ttl}`;
        lines.push(line);
      }
    }

    // save to file
    const file = `Dump_${(new Date()).toISOString().substr(0, 10).replaceAll('-', '')}.csv`;
    createAndDownloadFile(file, lines.join('\n'));
  });
}

onMounted(() => {
  // add or remove key from key list directly
  bus.$on('refreshKeyList', (client, key = '', type = 'del') => {
    // refresh only self connection key list
    if (client !== props.client) {
      return;
    }

    // refresh directly
    if (!key) {
      return refreshKeyList();
    }

    (type == 'del') && removeKeyFromKeyList(key);
    (type == 'add') && addKeyToKeyList(key);
  });
});

watch(
  () => props.globalSettings,
  (newSetting, oldSetting) => {
    if (!props.client) {
      return;
    }
    // keys number changed, reload scan streams
    if (newSetting.keysPageSize != oldSetting.keysPageSize) {
      refreshKeyList();
    }
  },
);
</script>

<style type="text/css">
  .keys-load-more-wrapper {
    display: flex;
  }
  .keys-load-more-wrapper .load-more-keys {
    margin: 10px 5px;
    padding: 0;
    display: block;
    height: 22px;
    width: 100%;
    font-size: 75%;
  }

</style>
