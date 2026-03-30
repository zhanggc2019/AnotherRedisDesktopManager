<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="false"
  />
</template>

<script setup>
import { ref } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { decode, encode } from 'algo-msgpack-with-bigint';
import { useI18n } from '@/composables/useI18n';
import { ElMessage } from 'element-plus';

const JSONbig = require('@qii404/json-bigint')({ useNativeBigInt: true });

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const { t } = useI18n();
const editor = ref(null);

const newContent = (() => {
  try {
    return decode(props.content);
  } catch (e) {
    return t('message.msgpack_format_failed');
  }
})();

const getContent = () => {
  let content = editor.value.getRawContent();

  // raw content is an object
  if (typeof newContent !== 'string') {
    try {
      content = JSONbig.parse(content);
    } catch (e) {
      // object parse failed
      ElMessage.error({
        message: `Raw content is an object, but now parse object failed: ${e.message}`,
        duration: 6000,
      });

      return false;
    }
  }

  // encode returns Uint8Array
  return Buffer.from(encode(content));
};

const copyContent = () => {
  const content = decode(props.content);
  return (typeof content === 'object') ? JSONbig.stringify(content) : content;
};

defineExpose({
  getContent,
  copyContent,
});
</script>
