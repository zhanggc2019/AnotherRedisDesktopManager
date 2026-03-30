<template>
  <JsonEditor
    ref="editor"
    :content="newContent"
    :read-only="isPHPClass"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '@/components/JsonEditor.vue';
import { unserialize, serialize } from 'php-serialize';
import { useI18n } from '@/composables/useI18n';
import { ElMessage } from 'element-plus';

const props = defineProps({
  content: {
    type: [String, Buffer],
    required: true,
  },
});

const { t } = useI18n();
const editor = ref(null);
const isPHPClass = ref(false);

const newContent = computed(() => {
  try {
    const content = unserialize(props.content, {}, { strict: false });

    if (content && content.__PHP_Incomplete_Class_Name) {
      isPHPClass.value = true;
    }

    return content;
  } catch (e) {
    return t('message.php_unserialize_format_failed');
  }
});

const getContent = () => {
  let content = editor.value.getRawContent();

  // raw content is an object
  if (typeof newContent.value !== 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      // object parse failed
      ElMessage.error({
        message: `Raw content is an object, but now parse object failed: ${e.message}`,
        duration: 6000,
      });

      return false;
    }
  }

  return serialize(content);
};

defineExpose({
  getContent,
});
</script>
