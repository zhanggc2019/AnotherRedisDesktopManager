<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="true"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { Parser } from 'pickleparser';
import { ElMessage } from 'element-plus';

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const editor = ref(null);

const newContent = computed(() => {
  try {
    return (new Parser()).parse(props.content);
  } catch (e) {
    return 'Pickle parsed failed!';
  }
});

const getContent = () => {
  ElMessage.error('Pickle is readonly now!');
  return false;
};

const copyContent = () => editor.value.getRawContent();

defineExpose({
  getContent,
  copyContent,
});
</script>
