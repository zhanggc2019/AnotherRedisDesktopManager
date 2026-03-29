<template>
  <el-input :model-value="innerValue" @input="handleInput" :type="inputType" :placeholder="placeholder">
    <template #suffix>
      <ElementIcon v-if="!hidepass" ref="toggler" class="toggler" name="el-icon-view" @click="togglePassword"></ElementIcon>
    </template>
  </el-input>
</template>

<script type="text/javascript">
import ElementIcon from '@/components/ElementIcon';

export default {
  data() {
    return {
      inputType: 'password',
      hideTextTime: 6000,
    };
  },
  components: { ElementIcon },
  props: ['value', 'modelValue', 'placeholder', 'hidepass'],
  computed: {
    innerValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
  },
  methods: {
    handleInput(newValue) {
      this.$emit('input', newValue);
      this.$emit('update:modelValue', newValue);
    },
    togglePassword() {
      clearTimeout(this.recoverTimer);

      if (!this.$refs.toggler) {
        return;
      }

      // show text
      if (this.inputType == 'password') {
        this.inputType = 'text';
        this.$refs.toggler.classList.add('toggler-text');

        // set time to hide text
        this.recoverTimer = setTimeout(() => {
          this.togglePassword();
        }, this.hideTextTime);
      }

      // back to password
      else {
        this.inputType = 'password';
        this.$refs.toggler.classList.remove('toggler-text');
      }
    },
  },
  beforeUnmount() {
    clearTimeout(this.recoverTimer);
  },
};
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
