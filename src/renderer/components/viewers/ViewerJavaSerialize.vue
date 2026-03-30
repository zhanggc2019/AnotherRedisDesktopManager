<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="true"
  />
</template>

<script setup>
import { computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { ObjectInputStream } from 'java-object-serialization';
import { ElMessage } from 'element-plus';

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const newContent = computed(() => {
  try {
    // ref RedisInsight
    const result = (new ObjectInputStream(props.content)).readObject();

    if (typeof result !== 'object') {
      return result;
    }

    const fields = Array.from(result.fields, ([key, value]) => ({ [key]: value }));
    return { ...result, fields };
  } catch (e) {
    return 'Java unserialize failed!';
  }
});

const getContent = () => {
  ElMessage.error('Java unserialization is readonly now!');
  return false;
};

const copyContent = () => editor.value.getRawContent();

defineExpose({
  getContent,
  copyContent,
});
</script>
