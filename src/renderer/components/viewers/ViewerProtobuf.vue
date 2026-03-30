<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="false"
    class="protobuf-viewer"
  >
    <div class="viewer-protobuf-header">
      <!-- type selector -->
      <el-select
        v-model="selectedType"
        filterable
        placeholder="Select Type"
        size="mini"
        class="type-selector"
      >
        <el-option
          v-for="t of types"
          :key="t"
          :label="t"
          :value="t"
        />
      </el-select>
      <!-- select proto file -->
      <el-button
        class="select-proto-btn"
        type="primary"
        size="mini"
        :icon="resolveElIcon('el-icon-upload2')"
        @click="selectProto"
      >
        Select Proto Files
      </el-button>
    </div>
    <!-- selected files -->
    <!-- <el-tag v-for="p of proto" :key="p" class="selected-proto-file-tag">{{ p }}</el-tag> -->
    <hr>
  </JsonEditor>
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { getData } from 'rawproto';
import electron from '@/electron';
import { resolveElIcon } from '@/element-plus-icons';
import { useI18n } from '@/composables/useI18n';
import { ElMessage } from 'element-plus';

const protobuf = require('protobufjs/minimal');

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const { t } = useI18n();
const editor = ref(null);
const proto = ref([]);
const protoRoot = ref(null);
const types = ref(['Rawproto']);
const selectedType = ref('Rawproto');

const newContent = computed(() => {
  try {
    if (selectedType.value === 'Rawproto') {
      return getData(props.content);
    }
    const type = protoRoot.value.lookupType(selectedType.value);
    const message = type.decode(props.content);
    return message.toJSON();
  } catch (e) {
    return 'Protobuf Decode Failed!';
  }
});

const traverseTypes = (current) => {
  if (current instanceof protobuf.Type) {
    types.value.push(current.fullName);
  }
  if (current.nestedArray) {
    current.nestedArray.forEach((nested) => {
      traverseTypes(nested);
    });
  }
};

const selectProto = () => {
  electron.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: '.proto',
        extensions: ['proto'],
      },
    ],
  }).then((result) => {
    if (result.canceled) return;
    proto.value = result.filePaths;
    types.value = ['Rawproto'];
    selectedType.value = 'Rawproto';

    protobuf.load(proto.value).then((root) => {
      protoRoot.value = root;
      // init types
      traverseTypes(root);
      // first type as default
      if (types.value.length > 0) {
        selectedType.value = types.value[1];
      }
    }).catch((e) => {
      ElMessage.error(e.message);
    });
  }).catch((e) => {
    ElMessage.error(e.message);
  });
};

const getContent = () => {
  if (!protoRoot.value) {
    ElMessage.error('Select a correct .proto file');
    return false;
  }

  if (!selectedType.value || selectedType.value === 'Rawproto') {
    ElMessage.error('Select a correct Type to encode');
    return false;
  }

  let content = editor.value.getRawContent();
  const type = protoRoot.value.lookupType(selectedType.value);

  try {
    content = JSON.parse(content);
    const err = type.verify(content);

    if (err) {
      ElMessage.error(`Proto Verify Failed: ${err}`);
      return false;
    }

    const message = type.create(content);
    return type.encode(message).finish();
  } catch (e) {
    ElMessage.error(t('message.json_format_failed'));
    return false;
  }
};

const copyContent = () => JSON.stringify(newContent.value);

defineExpose({
  getContent,
  copyContent,
});
</script>

<style type="text/css">
  .viewer-protobuf-header {
    display: flex;
    margin-top: 8px;
  }
  .viewer-protobuf-header .type-selector {
    flex: 1;
    margin-right: 10px;
  }
  .viewer-protobuf-header .select-proto-btn {
    margin-top: 2px;
    height: 27px;
  }
  .selected-proto-file-tag {
    margin-right: 4px;
  }

  /*text viewer box*/
  .key-content-string .text-formated-container.protobuf-viewer .monaco-editor-con {
    height: calc(100vh - 331px);
  }
</style>
