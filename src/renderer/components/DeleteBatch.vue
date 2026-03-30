<template>
  <div>
    <el-card class="box-card del-batch-card">
      <!-- card title -->
      <template #header>
        <div class="clearfix">
          <span class="del-title"><i class="fa fa-exclamation-triangle" /> {{ $t('message.keys_to_be_deleted') }}</span>
          <ElementIcon
            v-if="loadingScan||loadingDelete"
            name="el-icon-loading"
            spin
          />
          <el-tag size="mini">
            <span v-if="loadingScan">Scanning... </span>
            <span v-if="loadingDelete">Deleting... </span>
            Total: {{ allKeysList.length }}
          </el-tag>

          <!-- del btn -->
          <el-button
            :disabled="loadingScan||loadingDelete||allKeysList.length == 0"
            style="float: right;"
            type="danger"
            @click="confirmDelete"
          >
            {{ $t('message.delete_all') }}
          </el-button>
          <!-- toggle scanning btn -->
          <el-button
            v-if="rule.pattern.length && !scanningEnd"
            type="text"
            style="float: right;"
            @click="toggleScanning()"
          >
            {{ loadingScan ? $t('message.pause') : $t('message.begin') }}&nbsp;
          </el-button>
        </div>
      </template>

      <!-- scan pattern -->
      <el-tag
        v-if="rule.pattern && rule.pattern.length"
        size="mini"
        style="margin-left: 10px;"
      >
        <i class="fa fa-search" /> {{ rule.pattern.join(' ') }}
      </el-tag>

      <!-- key list -->
      <RecycleScroller
        v-slot="{ item, index }"
        class="del-batch-key-list"
        :items="allKeysList"
        :item-size="20"
        key-field="str"
      >
        <li>
          <span class="list-index">{{ index + 1 }}.</span>
          <span
            class="key-name"
            :title="item.str"
          >{{ item.str }}</span>
        </li>
      </RecycleScroller>
    </el-card>
  </div>
</template>

<script setup>
import {
  ref, onMounted, onUnmounted,
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
  rule: {
    type: Object,
    required: true,
  },
  hotKeyScope: {
    type: String,
    required: true,
  },
});

const loadingScan = ref(false);
const loadingDelete = ref(false);
const scanStreams = ref([]);
const allKeysList = ref([]);
const scanningEnd = ref(false);
let scanningCount = 0;

function initKeys() {
  allKeysList.value = [];
  props.rule.key && props.rule.key.length && addToList(props.rule.key);

  if (props.rule.pattern && props.rule.pattern.length) {
    loadingScan.value = true;

    for (const pattern of props.rule.pattern) {
      initScanStreamsAndScan(pattern);
    }
  }
}

function initScanStreamsAndScan(pattern) {
  const nodes = props.client.nodes ? props.client.nodes('master') : [props.client];
  scanningCount = nodes.length;

  nodes.map((node) => {
    const scanOption = {
      match: `${pattern}*`,
      count: 20000,
    };

    const stream = node.scanBufferStream(scanOption);
    scanStreams.value.push(stream);

    stream.on('data', (keys) => {
      addToList(keys.sort());

      // pause for dom rendering
      stream.pause();
      setTimeout(() => {
        loadingScan.value && stream.resume();
      }, 100);
    });

    stream.on('error', (e) => {
      loadingScan.value = false;
      window.$message.error({
        message: `Delete Batch Stream On Error: ${e.message}`,
        duration: 1500,
      });
    });

    stream.on('end', () => {
      // all nodes scan finished(cursor back to 0)
      if (--scanningCount <= 0) {
        loadingScan.value = false;
        scanningEnd.value = true;
      }
    });
  });
}

function addToList(keys) {
  const list = [];
  for (const key of keys) {
    list.push({ key, str: util.bufToString(key) });
  }

  allKeysList.value = allKeysList.value.concat(list);
}

function toggleScanning(forcePause = null) {
  loadingScan.value = (forcePause === null ? !loadingScan.value : !forcePause);

  if (scanStreams.value.length) {
    for (const stream of scanStreams.value) {
      loadingScan.value ? stream.resume() : stream.pause();
    }
  }
}

function confirmDelete() {
  const keys = allKeysList.value;
  const total = keys.length;

  if (total <= 0) {
    return;
  }

  loadingDelete.value = true;
  let delPromise = null;

  // standalone Redis, batch delete
  if (!props.client.nodes) {
    let chunked = [];
    for (let i = 0; i < total; i++) {
      chunked.push(keys[i].key);

      // del 5000 keys one time
      if (chunked.length >= 5000) {
        delPromise = props.client.del(chunked);
        chunked = [];
      }
    }

    if (chunked.length) {
      delPromise = props.client.del(chunked);
    }
    // use final promise
    delPromise.then((reply) => {
      if (reply > 0) {
        afterDelete();
      } else {
        deleteFailed(util.t('message.delete_failed'));
      }
    }).catch((e) => {
      deleteFailed(e.message);
    });
  }

  // cluster, one key per time instead of batch
  else {
    for (let i = 0; i < total; i++) {
      delPromise = props.client.del(keys[i].key);
      delPromise.catch((e) => {});
    }

    // use final promise
    delPromise.then((reply) => {
      if (reply === 1) {
        afterDelete();
      } else {
        deleteFailed(util.t('message.delete_failed'));
      }
    }).catch((e) => {
      deleteFailed(e.message);
    });
  }
}

function afterDelete() {
  loadingDelete.value = false;
  allKeysList.value = [];

  window.$message.success(util.t('message.delete_success'));
  bus.$emit('refreshKeyList', props.client);

  // except pattern mode scanning not to end, close pre tab
  if (!props.rule.pattern.length || scanningEnd.value) {
    bus.$emit('removePreTab');
  }
}

function deleteFailed(msg = '') {
  if (msg) {
    window.$message.error(msg);
  }

  loadingScan.value = false;
  loadingDelete.value = false;
}

onMounted(() => {
  initKeys();
});

onUnmounted(() => {
  toggleScanning(true);
});
</script>

<style type="text/css">
  .del-title {
    color: #f56c6c;
    font-weight: bold;
    font-size: 120%;
  }
  .del-batch-card {
    /*margin-top: 10px;*/
  }
  .del-batch-key-list {
    height: calc(100vh - 204px);
    overflow: auto;
    padding-left: 10px;
    list-style: none;
    margin-top: 10px;
  }
  .del-batch-key-list li {
    color: #333;
    font-size: 92%;
    display: flex;
  }
  .dark-mode .del-batch-key-list li {
    color: #f7f7f7;
  }
  .del-batch-key-list li .key-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
