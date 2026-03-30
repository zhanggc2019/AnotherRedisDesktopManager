<template>
  <el-icon
    v-if="resolvedIcon"
    :class="{ 'is-loading': spin }"
  >
    <component :is="resolvedIcon" />
  </el-icon>
</template>

<script setup>
import { computed } from 'vue';
import { resolveElIcon } from '@/element-plus-icons';

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  spin: {
    type: Boolean,
    default: false,
  },
});

const resolvedIcon = computed(() => resolveElIcon(props.name));
</script>
