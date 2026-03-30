<template>
  <div class="size-too-large-viewer">
    <el-alert
      :closable="false"
      :title="alertTitle"
      type="error"
    />
    <el-input
      :disabled="true"
      type="textarea"
      :value="contentDisplay"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUtil } from '@/composables/useUtil';

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
  contentVisible: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const { bufToString } = useUtil();

const firstChars = 20000;

const contentDisplay = computed(() => `${bufToString(props.content.slice(0, firstChars), false)
}...Show only the first ${firstChars} characters, the rest has been hidden...`);

const alertTitle = computed(() => `Size too large, show only the first ${firstChars} characters and you cannot edit it.`);
</script>

<style type="text/css">
  .size-too-large-viewer .el-alert {
    margin: 3px 0 8px 0;
    color: #f56c6c;
    background-color: #f9dbdb;
  }

  /*text viewer box*/
  .key-content-string .size-too-large-viewer .el-textarea textarea {
    height: calc(100vh - 290px);
  }
</style>
