<template>
  <div>
    <el-container
      direction="vertical"
      class="key-tab-container"
    >
      <!-- key info -->
      <KeyHeader
        ref="keyHeader"
        :client="client"
        :redis-key="redisKey"
        :key-type="keyType"
        :hot-key-scope="hotKeyScope"
        class="key-header-info"
        @refresh-content="refreshContent"
        @dump-command="dumpCommand"
      />

      <!-- key content -->
      <component
        :is="componentName"
        ref="keyContent"
        :client="client"
        :redis-key="redisKey"
        :hot-key-scope="hotKeyScope"
        class="key-content-container"
      />
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from '@/composables/useI18n';
import KeyHeader from '@/components/KeyHeader.vue';
import KeyContentString from '@/components/contents/KeyContentString.vue';
import KeyContentHash from '@/components/contents/KeyContentHash.vue';
import KeyContentSet from '@/components/contents/KeyContentSet.vue';
import KeyContentZset from '@/components/contents/KeyContentZset.vue';
import KeyContentList from '@/components/contents/KeyContentList.vue';
import KeyContentStream from '@/components/contents/KeyContentStream.vue';
import KeyContentReJson from '@/components/contents/KeyContentReJson.vue';

const props = defineProps({
  client: Object,
  redisKey: [Buffer, String],
  keyType: String,
  hotKeyScope: String,
});

const { t } = useI18n();

const keyHeader = ref(null);
const keyContent = ref(null);

const componentName = computed(() => {
  const map = {
    string: 'KeyContentString',
    hash: 'KeyContentHash',
    zset: 'KeyContentZset',
    set: 'KeyContentSet',
    list: 'KeyContentList',
    stream: 'KeyContentStream',
    'ReJSON-RL': 'KeyContentReJson',
    json: 'KeyContentReJson', // upstash
    'tair-json': 'KeyContentReJson', // tair
  };

  if (map[props.keyType]) {
    return map[props.keyType];
  }
  // type not support, such as bf

  ElMessage.error(t('message.key_type_not_support'));
  return '';
});

function refreshContent() {
  props.client.exists(props.redisKey).then((reply) => {
    if (reply == 0) {
      // clear interval if auto refresh opened
      // keyHeader.value.removeInterval();
      return ElMessage.error({
        message: t('message.key_not_exists'),
        duration: 1000,
      });
    }

    keyContent.value && keyContent.value.initShow();
  }).catch((e) => {
    ElMessage.error(`Exists Error: ${e.message}`);
  });
}

function dumpCommand() {
  keyContent.value && keyContent.value.dumpCommand();
}
</script>

<style type="text/css">
  .key-tab-container {
    /*padding-left: 5px;*/
  }
  .key-header-info {
    margin-top: 6px;
  }
  .key-content-container {
    margin-top: 12px;
  }

  .content-more-container {
    text-align: center;
    margin-top: 10px;
  }
  .content-more-container .content-more-btn {
    width: 95%;
    padding-top: 5px;
    padding-bottom: 5px;
  }

  /*key content table wrapper*/
  .key-content-container .content-table-container {
    height: calc(100vh - 223px);
    margin-top: 10px;
    /*fix vex-table height*/
    overflow-y: hidden;
  }

  /* vxe table cell */
  .key-content-container .content-table-container .vxe-cell {
    overflow: hidden !important;
    line-height: 34px;
  }
  /*  vxe table radius*/
  .key-content-container .content-table-container .vxe-table--border-line {
    border-radius: 3px;
  }

  /*key-content-string such as String,ReJSON*/
  /*text viewer box*/
  .key-content-string .el-textarea textarea {
    font-size: 14px;
    height: calc(100vh - 231px);
  }
  /*json in monaco editor*/
  .key-content-string .text-formated-container .monaco-editor-con {
    height: calc(100vh - 275px);
  }
  .key-content-string .content-string-save-btn {
    width: 100px;
    float: right;
  }
  /*end of key-content-string*/
</style>
