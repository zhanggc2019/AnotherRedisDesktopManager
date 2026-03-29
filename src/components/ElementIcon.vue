<template>
  <el-icon v-if="resolvedIcon" :class="{ 'is-loading': spin }">
    <component :is="resolvedIcon"></component>
  </el-icon>
</template>

<script>
import { resolveElIcon } from '@/element-plus-icons';

export default {
  name: 'ElementIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
    spin: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    resolvedIcon() {
      return resolveElIcon(this.name);
    },
  },
};
</script>
