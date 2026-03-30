<template>
  <div>
    <!-- </textarea> -->
    <el-input
      ref="textInput"
      v-model="contentDisplay"
      :disabled="disabled"
      type="textarea"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
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

const { bufToBinary, binaryStringToBuffer } = useUtil();

const contentDisplay = ref('');

const getContent = () => binaryStringToBuffer(contentDisplay.value);

watch(() => props.content, (val) => {
  // refresh
  contentDisplay.value = bufToBinary(val);
});

onMounted(() => {
  contentDisplay.value = bufToBinary(props.content);
});

defineExpose({
  getContent,
});
</script>
