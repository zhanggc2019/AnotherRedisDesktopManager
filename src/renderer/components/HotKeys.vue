<template>
  <el-dialog
    v-model="visible"
    :title="$t('message.hotkey')"
    custom-class="hotkey-tips-dialog"
    append-to-body
  >
    <el-table :data="keys">
      <el-table-column
        prop="key"
        width="180"
        label="Key"
      />
      <el-table-column
        prop="desc"
        label="Description"
      />
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';

const visible = ref(false);
const { getTranslate } = useI18n();
const t = getTranslate();

const keys = computed(() => [
  { key: 'Ctrl + n / ⌘ + n', desc: t('message.new_connection') },
  { key: 'Ctrl + , / ⌘ + ,', desc: t('message.settings') },
  { key: 'Ctrl + g / ⌘ + g', desc: t('message.command_log') },
  { key: 'Ctrl + w / ⌘ + w', desc: `${t('message.close')} Tab` },
  { key: '⌘ + h', desc: t('message.hide_window') },
  { key: 'Ctrl + [h/m] / ⌘ + m', desc: t('message.minimize_window') },
  { key: 'Ctrl + Enter / ⌘ + Enter', desc: t('message.maximize_window') },
  { key: 'Ctrl + r / ⌘ + r / F5', desc: `${t('message.refresh_connection')} [Key tab, Info tab]` },
  { key: 'Ctrl + d / ⌘ + d', desc: `${t('el.upload.delete')} [Key tab]` },
  { key: 'Ctrl + s / ⌘ + s', desc: `${t('message.save')} [Key tab]` },
  { key: 'Ctrl + l / ⌘ + l', desc: `${t('message.clean_up')} [Console tab]` },
  { key: 'Ctrl / ⌘ + click key', desc: t('message.open_new_tab') },
  { key: 'Ctrl + ? / ⌘ + ?', desc: `${t('message.hotkey')} Tips` },
]);

function show() {
  visible.value = true;
}

onMounted(() => {
  window.$shortcut.bind('ctrl+/, ⌘+/', () => {
    show();
    return false;
  });
});

defineExpose({
  show,
});
</script>
