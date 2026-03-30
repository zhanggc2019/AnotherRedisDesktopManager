<template>
  <!-- language select -->
  <el-select
    v-model="selectedLang"
    placeholder="Language"
    @change="changeLang"
  >
    <el-option
      v-for="item in getSupportedLanguages()"
      :key="item.code"
      :label="item.name"
      :value="item.code"
    />
  </el-select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';

const { locale, setLocale, getSupportedLanguages } = useI18n();
const selectedLang = ref('en');

function changeLang() {
  setLocale(selectedLang.value);
}

onMounted(() => {
  selectedLang.value = locale.value;
});
</script>
