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
import { bufToString, xToBuffer } from '@/util';

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

const contentDisplay = ref('');

const getContent = () => xToBuffer(contentDisplay.value);

watch(() => props.content, (val) => {
  // refresh
  contentDisplay.value = bufToString(val);
});

onMounted(() => {
  contentDisplay.value = bufToString(props.content);
});

defineExpose({
  getContent,
});
</script>
