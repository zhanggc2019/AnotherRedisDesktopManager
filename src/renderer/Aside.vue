<template>
  <div class="aside-outer-container">
    <div>
      <!-- new connection button -->
      <div class="aside-top-container">
        <el-button
          class="aside-setting-btn"
          type="primary"
          :icon="resolveElIcon('el-icon-time')"
          :title="t('message.command_log')+' Ctrl+g'"
          plain
          @click="commandLogDialog?.show()"
        />
        <el-button
          class="aside-setting-btn"
          type="primary"
          :icon="resolveElIcon('el-icon-setting')"
          :title="t('message.settings')+' Ctrl+,'"
          plain
          @click="settingDialog?.show()"
        />

        <div class="aside-new-connection-container">
          <el-button
            class="aside-new-connection-btn"
            type="info"
            :icon="resolveElIcon('el-icon-circle-plus')"
            :title="t('message.new_connection')+' Ctrl+n'"
            @click="addNewConnection"
          >
            {{ t('message.new_connection') }}
          </el-button>
        </div>
      </div>

      <!-- new connection dialog -->
      <NewConnectionDialog
        ref="newConnectionDialog"
        @edit-connection-finished="editConnectionFinished"
      />

      <!-- user settings -->
      <Setting ref="settingDialog" />

      <!-- redis command logs -->
      <CommandLog ref="commandLogDialog" />
      <!-- hot key tips dialog -->
      <HotKeys ref="hotKeysDialog" />
      <!-- custom shell formatter -->
      <CustomFormatter />
    </div>

    <!-- connection list -->
    <Connections ref="connections" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Setting from '@/components/Setting.vue';
import Connections from '@/components/Connections.vue';
import NewConnectionDialog from '@/components/NewConnectionDialog.vue';
import CommandLog from '@/components/CommandLog.vue';
import HotKeys from '@/components/HotKeys.vue';
import CustomFormatter from '@/components/CustomFormatter.vue';
import { resolveElIcon } from '@/element-plus-icons';
import { useI18n } from '@/composables/useI18n';
import shortcut from '@/shortcut';

// Composables
const { getTranslate } = useI18n();
const t = getTranslate();

// Template refs
const newConnectionDialog = ref(null);
const settingDialog = ref(null);
const commandLogDialog = ref(null);
const hotKeysDialog = ref(null);
const connections = ref(null);

// Methods
const editConnectionFinished = () => {
  connections.value?.initConnections();
};

const addNewConnection = () => {
  newConnectionDialog.value?.show();
};

const initShortcut = () => {
  // new connection
  shortcut.bind('ctrl+n, ⌘+n', () => {
    newConnectionDialog.value?.show();
    return false;
  });
  // settings
  shortcut.bind('ctrl+,', () => {
    settingDialog.value?.show();
    return false;
  });
  shortcut.bind('⌘+,', () => {
    settingDialog.value?.show();
    return false;
  });
  // logs
  shortcut.bind('ctrl+g, ⌘+g', () => {
    commandLogDialog.value?.show();
    return false;
  });
};

// Lifecycle
onMounted(() => {
  initShortcut();
});

onUnmounted(() => {
  // Clean up shortcuts if needed
  // Note: keymaster doesn't provide a direct unbind for all, so we leave them as is
});
</script>

<style type="text/css">
  .aside-top-container {
    margin-right: 8px;
  }
  .aside-top-container .aside-new-connection-container {
    margin-right: 109px;
  }
  .aside-new-connection-container .aside-new-connection-btn {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .aside-top-container .aside-setting-btn {
    float: right;
    width: 44px;
    margin-right: 5px;
  }

  .dark-mode .aside-top-container .el-button--info {
    color: #52a6fd;
    background: inherit;
  }
</style>
