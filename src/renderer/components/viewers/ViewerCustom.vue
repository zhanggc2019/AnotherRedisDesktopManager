<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    class="viewer-custom-editor"
  >
    <p
      :title="fullCommand"
      class="command-preview"
    >
      <el-button
        size="mini"
        class="viewer-custom-copy-raw"
        :title="t(&quot;message.copy&quot;)"
        :icon="resolveElIcon('el-icon-document')"
        type="text"
        @click="copyToClipboard(fullCommand)"
      />
      {{ previewCommand }}
    </p>
  </JsonEditor>
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import storage from '@/storage';
import electron from '@/electron';
import { resolveElIcon } from '@/element-plus-icons';
import { useI18n } from '@/composables/useI18n';
import { useUtil } from '@/composables/useUtil';
import { ElMessage } from 'element-plus';

// Watch for content changes
import { watch } from 'vue';

// Initialize on mount
import { onMounted } from 'vue';

const shell = require('child_process');
const fs = require('fs');
const path = require('path');

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  dataMap: {
    type: Object,
    default: () => ({}),
  },
  redisKey: {
    type: [String, Buffer],
    required: true,
  },
});

const { t } = useI18n();
const { copyToClipboard, cutString, isJson } = useUtil();

const editor = ref(null);
const execResult = ref('');
const fullCommand = ref('');
const previewCommand = ref('');
const previewContentMax = 50;
const writeHexFileSize = 8000;

const newContent = computed(() => {
  if (isJson(execResult.value)) {
    return JSON.parse(execResult.value);
  }

  return execResult.value;
});

const getCommand = () => {
  const formatter = storage.getCustomFormatter(props.name);

  if (!formatter) {
    return false;
  }

  const { command } = formatter;
  const { params } = formatter;
  const paramsReplaced = replaceTemplate(params);

  return `"${command}" ${paramsReplaced}`;
};

const replaceTemplate = (params) => {
  if (!params) {
    return '';
  }

  const dataMap = props.dataMap ? props.dataMap : {};
  const mapObj = {
    '{KEY}': props.redisKey,
    // "{VALUE}": this.content,
    '{FIELD}': dataMap.key,
    '{SCORE}': dataMap.score,
    '{MEMBER}': dataMap.member,
  };

  const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  return params.replace(re, matched => mapObj[matched]);
};

const exec = () => {
  try {
    shell.exec(fullCommand.value, (error, stdout, stderr) => {
      if (error || stderr) {
        execResult.value = error ? error.message : stderr;
      } else {
        execResult.value = stdout.trim();
      }
    });
  } catch (e) {
    return execResult.value = e.message;
  }
};

const execCommand = () => {
  if (!props.content || !props.content.length) {
    return execResult.value = '';
  }

  const command = getCommand();
  const hexStr = props.content.toString('hex');

  if (!command) {
    return execResult.value = 'Command Error, Check Config!';
  }

  fullCommand.value = command.replace(
    '{VALUE}',
    props.content,
  );

  // in case of long content in template
  previewCommand.value = command.replace(
    '{VALUE}',
    cutString(props.content.toString(), previewContentMax),
  );

  // if content is too long, write to file simultaneously
  // hex str is about 2 times of real size
  if (hexStr.length > writeHexFileSize) {
    electron.invoke('getTempPath').then((reply) => {
      // target file name
      const fileName = `ardm_cv_${props.redisKey.toString('hex')}`;
      const filePath = path.join(reply, fileName);

      fs.writeFile(filePath, hexStr, (err) => {
        if (err) {
          return ElMessage.error(err);
        }

        fullCommand.value = fullCommand.value
          .replace('{HEX_FILE}', filePath)
          .replace('{HEX}', '<Content Too Long, Use {HEX_FILE} Instead!>');
        previewCommand.value = previewCommand.value
          .replace('{HEX_FILE}', filePath)
          .replace('{HEX}', '<Content Too Long, Use {HEX_FILE} Instead!>');

        exec();
      });
    });
  }
  // common content just exec
  else {
    fullCommand.value = fullCommand.value
      .replace('{HEX}', hexStr)
      .replace('{HEX_FILE}', '<Use {HEX} Instead!>');

    previewCommand.value = previewCommand.value
      .replace(
        '{HEX}',
        cutString(hexStr, previewContentMax),
      )
      .replace('{HEX_FILE}', '<Use {HEX} Instead!>');

    exec();
  }
};

const getContent = () => editor.value.getRawContent();

const copyContent = () => fullCommand.value;
watch(() => props.content, () => {
  execCommand();
});
onMounted(() => {
  execCommand();
});

defineExpose({
  getContent,
  copyContent,
});
</script>

<style type="text/css">
.text-formated-container .command-preview {
  color: #9798a7;
  word-break: break-all;
  height: 40px;
  overflow-y: auto;
  line-height: 20px;
  margin-bottom: 2px;
}
/*copy raw command btn*/
.text-formated-container .command-preview .viewer-custom-copy-raw {
  padding: 0;
}

/*make monaco less height in custom viewer*/
.key-content-string .text-formated-container.viewer-custom-editor .monaco-editor-con {
  height: calc(100vh - 331px);
/*  min-height: 50px;*/
}
</style>
