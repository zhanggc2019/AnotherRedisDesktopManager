<template>
  <div class="memory-analysis-container">
    <el-card class="box-card">
      <!-- card title -->
      <template #header>
        <div class="clearfix">
          <!-- setting dialog -->
          <el-popover
            placement="bottom"
            width="40"
            trigger="hover"
          >
            <div>
              <p>If result is "0", the <b>MEMORY</b> command may be disabled on Redis.</p>
              <p style="margin: 0;">
                Filter Min Size:
              </p>
              <el-input
                v-model="minSizeKB"
                size="mini"
                @keyup.enter="initKeys()"
              >
                <template #suffix>
                  <i>KB</i>
                </template>
              </el-input>
            </div>
            <template #reference>
              <ElementIcon name="el-icon-setting" />
            </template>
          </el-popover>

          <span class="analysis-title">{{ $t('message.memory_analysis') }}</span>
          <ElementIcon
            v-if="isScanning"
            name="el-icon-loading"
            spin
          />
          <el-tag size="mini">
            Total: {{ keysList.length }} &nbsp;
            Size: {{ util.humanFileSize(totalSize) }}
          </el-tag>

          <!-- operate btn -->
          <el-button
            v-if="scanningEnd"
            class="operate-btn"
            type="primary"
            @click="initKeys"
          >
            <i class="fa fa-refresh"> {{ $t('message.restart') }}</i>
          </el-button>
          <el-button
            v-else-if="isScanning"
            class="operate-btn"
            type="danger"
            @click="toggleScanning(true)"
          >
            <i class="fa fa-pause"> {{ $t('message.pause') }}</i>
          </el-button>
          <el-button
            v-else
            class="operate-btn"
            @click="toggleScanning(false)"
          >
            <i class="fa fa-play"> {{ $t('message.begin') }}</i>
          </el-button>
        </div>
      </template>

      <!-- table header -->
      <div class="keys-header">
        <span class="header-title">
          Key
          <el-tag
            v-if="pattern"
            size="mini"
          ><i class="fa fa-search" /> {{ pattern }}</el-tag>
        </span>
        <span
          class="size-container"
          @click="toggleOrder"
        >
          <span class="header-title">Size</span>
          <ElementIcon name="el-icon-d-caret" />
        </span>
      </div>

      <!-- keys list -->
      <RecycleScroller
        v-slot="{ item, index }"
        class="keys-body"
        :items="keysList"
        :item-size="24"
        key-field="str"
      >
        <li @click="clickJump(item)">
          <span class="list-index">{{ index + 1 }}.</span>
          <span
            class="key-name"
            :title="item.str"
          >{{ item.str }}</span>
          <!-- <span class="size">{{ item.human }}</span> -->
          <span class="size">
            <el-tag size="mini">{{ item.human }}</el-tag>
          </span>
        </li>
      </RecycleScroller>

      <!-- table footer -->
      <div class="keys-footer">
        <el-tag>{{ $t('message.max_display', {num: scanMax}) }}</el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import ElementIcon from '@/components/ElementIcon.vue';
import util from '@/util';
import bus from '@/bus';

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
  hotKeyScope: {
    type: String,
    required: true,
  },
  pattern: {
    type: String,
    default: '',
  },
});

const keysList = ref([]);
const isScanning = ref(false);
const scanningEnd = ref(false);
const scanStreams = ref([]);
const sortOrder = ref('');
const scanMax = 200000;
const scanPageSize = 2000;
const totalSize = ref(0);
const minSizeKB = ref(0);
let scanningCount = 0;

const minSizeB = computed(() => parseInt(minSizeKB.value) * 1024);

function initKeys() {
  keysList.value = [];
  totalSize.value = 0;
  isScanning.value = true;
  scanningEnd.value = false;
  initScanStreamsAndScan(props.pattern ? props.pattern : '');
}

function initScanStreamsAndScan(pattern = '') {
  const nodes = props.client.nodes ? props.client.nodes('master') : [props.client];
  scanningCount = nodes.length;

  nodes.map((node) => {
    const scanOption = {
      match: `${pattern}*`,
      count: scanPageSize,
    };

    const stream = node.scanBufferStream(scanOption);
    scanStreams.value.push(stream);

    stream.on('data', (keys) => {
      // waiting for memory analysis
      stream.pause();

      // limit scanning max count
      if (keysList.value.length > scanMax) {
        window.$message.warning(`${util.t('message.max_scan', { num: scanMax })}, stopped.`);
        scanningEnd.value = true;
        return toggleScanning(true);
      }

      const keysWithMemory = [];
      const promise = initKeysMemory(keys, keysWithMemory);

      promise.then(() => {
        // add interval between rendering
        setTimeout(() => {
          keysList.value = keysList.value.concat(keysWithMemory);
          reOrder('desc');
          isScanning.value && stream.resume();
        }, 100);

        // size count
        totalSize.value += keysWithMemory.reduce((sum, item) => sum + parseInt(item.size), 0);
      });
    });

    stream.on('error', (e) => {
      toggleScanning(true);
      window.$message.error(`Memory Analysis Stream On Error: ${e.message}`);
    });

    stream.on('end', () => {
      // all nodes scan finished(cursor back to 0)
      if (--scanningCount <= 0) {
        isScanning.value = false;
        scanningEnd.value = true;
      }
    });
  });
}

function initKeysMemory(keys, keysWithMemory) {
  if (!keys) {
    return Promise.resolve();
  }

  const allPromise = [];

  for (const key of keys) {
    // not logging
    props.client.withoutLogging = true;
    const promise = props.client.call('MEMORY', 'USAGE', key).then((reply) => {
      // filter min size
      if (minSizeB.value && reply < minSizeB.value) {
        return;
      }
      keysWithMemory.push({
        key, str: util.bufToString(key), size: reply, human: util.humanFileSize(reply),
      });
    }).catch((e) => {
      keysWithMemory.push({
        key, str: util.bufToString(key), size: 0, human: 0,
      });
    });

    allPromise.push(promise);
  }

  return Promise.all(allPromise);
}

function clickJump(item) {
  bus.$emit('clickedKey', props.client, item.key, true);
}

function toggleScanning(pause = true) {
  // stop scanning
  if (pause) {
    isScanning.value = false;
    if (scanStreams.value.length) {
      for (const stream of scanStreams.value) {
        stream.pause && stream.pause();
      }
    }

    return;
  }

  if (scanningEnd.value) {
    return;
  }

  // resume scanning
  isScanning.value = true;
  if (scanStreams.value.length) {
    for (const stream of scanStreams.value) {
      stream.pause && stream.resume();
    }
  }
}

function toggleOrder() {
  if (isScanning.value) {
    return;
  }

  sortOrder.value = (sortOrder.value === 'desc' ? 'asc' : 'desc');
  reOrder();
}

function reOrder(order = null) {
  if (order !== null) {
    sortOrder.value = order;
  }

  // sorting
  if (sortOrder.value === 'asc') {
    keysList.value.sort((a, b) => a.size - b.size);
  } else {
    keysList.value.sort((a, b) => b.size - a.size);
  }
}

function initShortcut() {
  window.$shortcut.bind('ctrl+r, ⌘+r, f5', props.hotKeyScope, () => {
    // scanning not finished, return
    if (!scanningEnd.value) {
      return false;
    }

    initKeys();
    return false;
  });
}

onMounted(() => {
  initKeys();
  initShortcut();
});

onUnmounted(() => {
  window.$shortcut.deleteScope(props.hotKeyScope);
  toggleScanning(true);
});
</script>

<style type="text/css">
  .memory-analysis-container .analysis-title {
    font-weight: bold;
    font-size: 120%;
  }
  .memory-analysis-container .operate-btn {
    float: right;
  }

  /*keys header container*/
  .memory-analysis-container .keys-header {
    margin: 2px 0 14px 0;
    user-select: none;
  }
  .memory-analysis-container .keys-header .header-title {
    font-weight: bold;
  }
  .memory-analysis-container .keys-header .size-container {
    float: right;
    cursor: pointer;
  }

  /*keys body list*/
  .memory-analysis-container .keys-body {
    height: calc(100vh - 268px);
  }
  /*keys body li*/
  .memory-analysis-container .keys-body li {
    border-bottom: 1px solid #e6e6e6;
    cursor:  pointer;
    padding: 0 0 0 4px;
    margin-right: 2px;
    font-size: 92%;
    list-style: none;
    display: flex;
    /*same with item-size*/
    line-height: 24px;
  }
  .dark-mode .memory-analysis-container .keys-body li {
    border-bottom: 1px solid #3b4d57;
  }
  .memory-analysis-container .keys-body li:hover {
    background: #e6e6e6;
  }
  .dark-mode .memory-analysis-container .keys-body li:hover {
    background: #3b4d57;
  }
  /*key name*/
  .memory-analysis-container .keys-body li .key-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /*key size*/
  .memory-analysis-container .keys-body .size {
    /*font-size: 90%;*/
    margin-left: 20px;
    margin-right: 4px;
  }

  /*keys footer*/
  .memory-analysis-container .keys-footer {
    text-align: center;
    line-height: 40px;
  }
</style>
