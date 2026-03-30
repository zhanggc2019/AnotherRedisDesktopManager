<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="disabled||false"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';

const JSONbig = require('@qii404/json-bigint')({ useNativeBigInt: false });

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const jsonIsString = ref(false);
const editor = ref(null);

const newContent = computed(() => {
  try {
    const parsedObj = JSONbig.parse(props.content);
    // if JSON.parse returns string, means raw content like "{\"name\":\"age\"}"
    // (JSON string wrapped with quotation) issue #909
    if (typeof parsedObj === 'string') {
      jsonIsString.value = true;
    }
    return parsedObj;
  } catch (e) {
    // parse failed, return raw content to edit instead of error
    return props.content.toString();
  }
});

const getContent = () => {
  const content = editor.value.getContent();

  if (!content) {
    return false;
  }

  // json in string, quotation wrapped and escaped,
  if (jsonIsString.value) {
    return JSONbig.stringify(content.toString());
  }

  return content;
};

defineExpose({
  getContent,
});
</script>
