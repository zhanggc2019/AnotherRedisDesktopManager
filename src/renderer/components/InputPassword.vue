<template>
  <el-input
    :model-value="innerValue"
    :type="inputType"
    :placeholder="placeholder"
    @input="handleInput"
  >
    <template #suffix>
      <ElementIcon
        v-if="!hidepass"
        ref="toggler"
        class="toggler"
        name="el-icon-view"
        @click="togglePassword"
      />
    </template>
  </el-input>
</template>

<script setup>
import { ref, computed } from 'vue';
import ElementIcon from '@/components/ElementIcon.vue';

// Cleanup on unmount
import { onBeforeUnmount } from 'vue';

const props = defineProps({
  value: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hidepass: { type: Boolean, default: false },
});

const emit = defineEmits(['input', 'update:modelValue']);

const inputType = ref('password');
const hideTextTime = 6000;
let recoverTimer = null;
const toggler = ref(null);

const innerValue = computed(() => (props.modelValue !== undefined ? props.modelValue : props.value));

const handleInput = (newValue) => {
  emit('input', newValue);
  emit('update:modelValue', newValue);
};

const togglePassword = () => {
  clearTimeout(recoverTimer);

  if (!toggler.value) {
    return;
  }

  // show text
  if (inputType.value === 'password') {
    inputType.value = 'text';
    toggler.value.$el.classList.add('toggler-text');

    // set time to hide text
    recoverTimer = setTimeout(() => {
      togglePassword();
    }, hideTextTime);
  }
  // back to password
  else {
    inputType.value = 'password';
    toggler.value.$el.classList.remove('toggler-text');
  }
};
onBeforeUnmount(() => {
  clearTimeout(recoverTimer);
});
</script>

<style type="text/css" scoped>
  .toggler {
    cursor: pointer;
    font-weight: bold;
    margin-right: 4px;
  }
  .toggler:hover {
    color: #6895ee;
  }
  .toggler.toggler-text {
    color: #6895ee;
  }
</style>
