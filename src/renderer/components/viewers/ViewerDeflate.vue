<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="false"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { useUtil } from '@/composables/useUtil';

const JSONbig = require('@qii404/json-bigint')({ useNativeBigInt: false });
const zlib = require('zlib');

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const { isJson, zippedToString } = useUtil();
const editor = ref(null);

const formatStr = computed(() => zippedToString(props.content, 'deflate'));

const newContent = computed(() => {
  const str = formatStr.value;

  if (typeof str === 'string') {
    if (isJson(str)) {
      return JSONbig.parse(str);
    }

    return str;
  }

  return 'Zlib Deflate Parse Failed!';
});

const getContent = () => {
  const content = editor.value.getRawContent(true);
  return zlib.deflateSync(content);
};

const copyContent = () => formatStr.value;

defineExpose({
  getContent,
  copyContent,
});
</script>
