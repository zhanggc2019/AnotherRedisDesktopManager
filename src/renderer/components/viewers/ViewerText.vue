<template>
  <div>
    <!-- </textarea> -->
    <el-input
      ref="textInput"
      v-model="contentDisplay"
      :disabled="disabled"
      type="textarea"
      @input="inputContent"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { ElMessageBox } from 'element-plus';

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

const { t } = useI18n();

const confirmChange = ref(false);
const contentDisplay = ref('');
const oldContentDisplay = ref('');

const initContent = () => {
  contentDisplay.value = props.content.toString();
  oldContentDisplay.value = contentDisplay.value;
};

const getContent = () => {
  // not changed
  if (!props.contentVisible && !confirmChange.value) {
    return props.content;
  }

  return Buffer.from(contentDisplay.value);
};

const inputContent = (value) => {
  // visible content do nothing
  if (props.contentVisible) {
    return;
  }

  // confirmed change content
  if (confirmChange.value) {
    return;
  }

  ElMessageBox.confirm(t('message.confirm_modify_unvisible_content')).then(() => {
    confirmChange.value = true;
  }).catch(() => {
    // recovery the input value
    contentDisplay.value = oldContentDisplay.value;
  });
};

watch(() => props.content, (val) => {
  // refresh
  contentDisplay.value = val.toString();
  oldContentDisplay.value = contentDisplay.value;
});

onMounted(() => {
  initContent();
});

defineExpose({
  getContent,
});
</script>
