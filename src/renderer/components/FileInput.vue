<template>
  <el-input
    :value="file"
    clearable
    :placeholder="placeholder"
    @clear="clearFile"
    @focus="focus"
  >
    <template #append>
      <el-button @click="showFileSelector">
        ...
      </el-button>
    </template>
  </el-input>
</template>

<script setup>
import electron from '@/electron';
import { ElMessage } from 'element-plus';

const props = defineProps({
  file: { type: String, default: '' },
  bookmark: { type: String, default: '' },
  placeholder: { type: String, default: 'Select File' },
});

const emit = defineEmits(['update:file', 'update:bookmark']);

const clearFile = () => {
  emit('update:file', '');
  emit('update:bookmark', '');
};

const focus = (e) => {
  // edit is forbidden, input blur
  e.target.blur();
};

const showFileSelector = () => {
  electron.showOpenDialog({
    securityScopedBookmarks: true,
    properties: ['openFile', 'showHiddenFiles'],
  }).then((reply) => {
    if (reply.canceled) {
      return;
    }

    reply.filePaths && emit('update:file', reply.filePaths[0]);
    reply.bookmarks && emit('update:bookmark', reply.bookmarks[0]);
  }).catch((e) => {
    ElMessage.error(`File Input Error: ${e.message}`);
  });
};
</script>
