<template>
  <div>
    <!-- <el-tag v-if="!buffVisible" class='input-binary-tag' size="mini">[Hex]</el-tag> -->
    <el-input
      :disabled="disabled"
      :value="contentDisplay"
      :placeholder="placeholder"
      @change="updateContent($event)"
    >
      <template
        v-if="!buffVisible"
        #prefix
      >
        Hex
      </template>
    </el-input>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import * as util from '@/util';

const props = defineProps({
  content: { type: [Buffer, Object], default: () => Buffer.from('') },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
});

const emit = defineEmits(['update:content']);

const contentDisplay = computed(() => {
  if (!props.content) {
    return '';
  }

  return util.bufToString(props.content);
});

const buffVisible = computed(() => {
  if (!props.content) {
    return true;
  }

  return util.bufVisible(props.content);
});

const updateContent = (value) => {
  const newContent = buffVisible.value ? Buffer.from(value) : util.xToBuffer(value);
  emit('update:content', newContent);
};
</script>

<style type="text/css">
  .input-binary-tag {
    font-size: 80%;
  }
</style>
