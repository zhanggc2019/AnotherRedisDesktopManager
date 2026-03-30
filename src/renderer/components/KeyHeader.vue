<template>
  <div>
    <!-- key name -->
    <div class="key-header-item key-name-input">
      <el-input
        ref="keyNameInput"
        :value="bufToString(keyName)"
        :title="t('message.click_enter_to_rename')"
        placeholder="KeyName"
        @change="changeKeyInput"
        @keyup.enter="renameKey"
      >
        <template #prepend>
          <span class="key-detail-type">{{ props.keyType }}</span>
        </template>
        <template #suffix>
          <i
            class="fa fa-check el-input__icon cursor-pointer"
            :title="t('message.click_enter_to_rename')"
            @click="renameKey"
          />
        </template>
      </el-input>
    </div>

    <!-- key ttl -->
    <div class="key-header-item key-ttl-input">
      <el-input
        v-model="keyTTL"
        type="number"
        :title="leftTime(keyTTL)"
        @keyup.enter="ttlKey"
      >
        <template #prepend>
          <span>TTL</span>
        </template>
        <template #suffix>
          <!-- remove expire -->
          <i
            class="fa fa-history el-input__icon cursor-pointer"
            :title="t('message.persist')+', -1'"
            @click="persistKey"
          />
          <!-- save ttl -->
          <i
            class="fa fa-check el-input__icon cursor-pointer"
            :title="t('message.click_enter_to_ttl')"
            @click="ttlKey"
          />
        </template>
      </el-input>
    </div>

    <!-- del & refresh btn -->
    <div class="key-header-item key-header-btn-con">
      <!-- del btn -->
      <el-button
        ref="deleteBtn"
        type="danger"
        :icon="resolveElIcon('el-icon-delete')"
        :title="t('el.upload.delete')+' Ctrl+d'"
        @click="deleteKey"
      />
      <!-- refresh btn -->
      <!-- <el-button ref='refreshBtn' type="success" @click="refreshKey" icon="el-icon-refresh" :title="t('message.refresh_connection')+' Ctrl+r / F5'"></el-button> -->

      <!-- refresh btn component -->
      <el-popover
        placement="bottom"
        :open-delay="500"
        trigger="hover"
      >
        <el-tag type="info">
          <ElementIcon name="el-icon-refresh" />
          {{ t('message.auto_refresh') }}
        </el-tag>

        <el-tooltip
          :content="t('message.auto_refresh_tip', {interval: refreshInterval / 1000})"
          effect="dark"
          placement="bottom"
        >
          <el-switch
            v-model="autoRefresh"
            @change="refreshInit"
          />
        </el-tooltip>

        <!-- refresh btn -->
        <template #reference>
          <el-button
            ref="refreshBtn"
            type="success"
            :icon="resolveElIcon('el-icon-refresh')"
            :title="t('message.refresh_connection')+' Ctrl+r / F5'"
            :class="autoRefresh?'rotating':''"
            @click="refreshKey"
          />
        </template>
      </el-popover>

      <!-- dump btn -->
      <el-button
        ref="dumpBtn"
        type="primary"
        icon="fa fa-code"
        :title="t('message.dump_to_clipboard')"
        @click="dumpCommand"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ElementIcon from '@/components/ElementIcon.vue';
import { resolveElIcon } from '@/element-plus-icons';
import { useI18n } from '@/composables/useI18n';
import {
  bufToString, bufVisible, xToBuffer, leftTime,
} from '@/util';
import bus from '@/bus';
import shortcut from '@/shortcut';

const props = defineProps({
  client: Object,
  redisKey: [Buffer, String],
  keyType: String,
  hotKeyScope: String,
});

const emit = defineEmits(['refreshContent', 'dumpCommand']);

const { t } = useI18n();

const keyNameInput = ref(null);
const deleteBtn = ref(null);
const refreshBtn = ref(null);
const dumpBtn = ref(null);

const keyName = ref(props.redisKey);
const keyTTL = ref(-1);
const binary = ref(false);
const autoRefresh = ref(false);
const refreshInterval = 2000;
let refreshTimer = null;

function initShow() {
  const key = props.redisKey;
  const { client } = props;

  // reset name input
  keyName.value = key;
  binary.value = !bufVisible(key);

  client.ttl(key).then((reply) => {
    keyTTL.value = reply;
  }).catch((e) => {
    ElMessage.error(`TTL Error: ${e.message}`);
  });
}

function changeKeyInput(keyInput) {
  keyName.value = binary.value ? xToBuffer(keyInput) : Buffer.from(keyInput);
}

function refreshKey() {
  initShow();
  emit('refreshContent');
}

function refreshInit() {
  refreshTimer && clearInterval(refreshTimer);

  if (autoRefresh.value) {
    refreshKey();

    refreshTimer = setInterval(() => {
      refreshKey();
    }, refreshInterval);
  }
}

function removeInterval() {
  autoRefresh.value = false;
  refreshInit();
}

function dumpCommand() {
  emit('dumpCommand');
}

function deleteKey() {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_key', { key: bufToString(props.redisKey) }),
    { type: 'warning' },
  )
    .then(() => {
      props.client.del(props.redisKey).then((reply) => {
        if (reply == 1) {
          ElMessage.success({
            message: t('message.delete_success'),
            duration: 1000,
          });

          bus.$emit('removePreTab');
          refreshKeyList(props.redisKey);
        } else {
          ElMessage.error({
            message: `${props.redisKey} ${t('message.delete_failed')}`,
            duration: 1000,
          });
        }
      }).catch((e) => { ElMessage.error(e.message); });
    }).catch(() => {});
}

function renameKey(e) {
  // input blur to prevent trigger twice by enter
  e && e.srcElement.blur();

  if (keyName.value.equals(props.redisKey)) {
    return;
  }

  const inputTxt = 'y';
  const placeholder = t('message.flushdb_prompt', { txt: inputTxt });

  // force confirm rename operation
  ElMessageBox.prompt(
    t('message.confirm_to_rename_key', {
      old: bufToString(props.redisKey),
      new: bufToString(keyName.value),
    }), {
      inputValidator: value => ((value == inputTxt) ? true : placeholder),
      inputPlaceholder: placeholder,
    },
  ).then(() => {
    props.client.rename(props.redisKey, keyName.value).then((reply) => {
      if (reply === 'OK') {
        ElMessage.success({
          message: t('message.modify_success'),
          duration: 1000,
        });

        refreshKeyList(props.redisKey);
        refreshKeyList(keyName.value, 'add');
        bus.$emit('clickedKey', props.client, keyName.value);
      }
    }).catch((e) => {
      ElMessage.error(`Rename Error: ${e.message}`);
    });
  }).catch(() => {});
}

function ttlKey() {
  // -1 persist key
  if (keyTTL.value == -1) {
    return persistKey();
  }

  // ttl <= 0
  if (keyTTL.value <= 0) {
    ElMessageBox.confirm(
      t('message.ttl_delete'),
      { type: 'warning' },
    )
      .then(() => {
        setTTL(true);
      })
      .catch(() => {});
  } else {
    setTTL();
  }
}

function setTTL(keyDeleted = false) {
  props.client.expire(props.redisKey, keyTTL.value).then((reply) => {
    if (reply == 1) {
      ElMessage.success({
        message: t('message.modify_success'),
        duration: 1000,
      });

      if (keyDeleted) {
        refreshKeyList(props.redisKey);
        bus.$emit('removePreTab');
      }
    }
  }).catch((e) => {
    ElMessage.error(`Expire Error: ${e.message}`);
  });
}

function persistKey() {
  props.client.persist(props.redisKey).then(() => {
    initShow();
    ElMessage.success(t('message.modify_success'));
  }).catch((e) => {
    ElMessage.error(`Persist Error: ${e.message}`);
  });
}

function refreshKeyList(key, type = 'del') {
  bus.$emit('refreshKeyList', props.client, key, type);
}

function initShortcut() {
  // refresh
  shortcut.bind('ctrl+r, ⌘+r, f5', props.hotKeyScope, () => {
    // make input blur first
    deleteBtn.value.$el.focus();
    refreshKey();

    return false;
  });
  // delete
  shortcut.bind('ctrl+d, ⌘+d', props.hotKeyScope, () => {
    deleteKey();
    return false;
  });
}

onMounted(() => {
  initShow();
  initShortcut();
});

onBeforeUnmount(() => {
  clearInterval(refreshTimer);
  shortcut.deleteScope(props.hotKeyScope);
});
</script>

<style type="text/css">
  .key-detail-type {
    text-transform: capitalize;
    text-align: center;
    min-width: 34px;
    display: inline-block;
  }
  .cursor-pointer {
    cursor: pointer;
  }

  .key-header-item {
    /*padding-right: 15px;*/
    /*margin-bottom: 10px;*/
    float: left;
  }

  .key-header-item.key-name-input {
    width: calc(100% - 402px);
    min-width: 218px;
    max-width: 800px;
    margin-right: 15px;
    margin-bottom: 10px;
  }
  .key-header-item.key-ttl-input {
    width: 218px;
    margin-right: 15px;
    margin-bottom: 10px;
  }
  /*hide number input button*/
  .key-header-item.key-ttl-input input::-webkit-inner-spin-button,
  .key-header-item.key-ttl-input input::-webkit-outer-spin-button {
    appearance: none;
  }

  .key-header-item.key-header-btn-con .el-button+.el-button {
    margin-left: 4px;
  }

  /*refresh btn rotating*/
  .key-header-info .key-header-btn-con .rotating .el-icon{
    animation: rotate 1.5s linear infinite;
  }

</style>
