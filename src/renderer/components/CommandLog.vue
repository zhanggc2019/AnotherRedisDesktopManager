<template>
  <el-dialog
    v-model="visible"
    :title="$t('message.command_log')"
    custom-class="command-log-dialog"
    width="90%"
    append-to-body
    @open="openDialog"
  >
    <!-- key list -->
    <div class="command-log-list">
      <vxe-table
        ref="commandLogList"
        size="mini"
        max-height="100%"
        border="none"
        show-overflow="title"
        :scroll-y="{enabled: true}"
        :row-config="{isHover: true, height: 24}"
        :column-config="{resizable: true}"
        :empty-text="$t('el.table.emptyText')"
        :data="logsShow"
      >
        <vxe-column
          field="time"
          title="Time"
          width="90"
        />
        <vxe-column
          field="name"
          title="Connection"
          width="168"
        />
        <vxe-column
          field="cmd"
          title="CMD"
          width="130"
          class-name="command-cmd"
        />
        <vxe-column
          field="args"
          title="Args"
          min-width="90"
        />
        <vxe-column
          field="cost"
          title="Cost(ms)"
          width="90"
          class-name="command-cost"
        />
      </vxe-table>
    </div>

    <!-- filter -->
    <el-input
      v-model="filter"
      size="mini"
      style="max-width: 200px;"
      :placeholder="$t('message.key_to_search')"
    />&nbsp;
    <!-- show only write commands -->
    <el-checkbox v-model="showOnlyWrite">
      Only Write
    </el-checkbox>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="logs=[]">
          {{ $t('el.colorpicker.clear') }}
        </el-button>
        <el-button @click="visible=false">
          {{ $t('el.messagebox.cancel') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import { writeCMD } from '@/commands.js';
import { VxeTable, VxeColumn } from 'vxe-table';
import bus from '@/bus';

const visible = ref(false);
const logs = ref([]);
const maxLength = 5000;
const filter = ref('');
const showOnlyWrite = ref(false);
const commandLogList = ref(null);

const logsShow = computed(() => {
  let result = logs.value;

  if (showOnlyWrite.value) {
    result = result.filter(item => writeCMD[item.cmd.toUpperCase()]);
  }

  if (filter.value) {
    result = result.filter(item => item.cmd.includes(filter.value) || item.args.includes(filter.value));
  }

  return result;
});

function show() {
  visible.value = true;
}

function openDialog() {
  scrollToBottom();
}

function scrollToBottom() {
  setTimeout(() => {
    commandLogList.value && commandLogList.value.scrollTo(0, 99999999);
  }, 0);
}

function handleCommandLog(record) {
  // hide ping
  if (record.command.name === 'ping') {
    return;
  }

  logs.value.push({
    cmd: record.command.name,
    args: (record.command.name === 'auth') ? '***' : record.command.args.map(item => (item.length > 100 ? (`${item.slice(0, 100)}...`) : item.toString())).join(' '),
    cost: record.cost.toFixed(2),
    time: record.time.toTimeString().substr(0, 8),
    name: record.connectionName,
  });

  logs.value.length > maxLength && (logs.value = logs.value.slice(-maxLength));
  visible.value && scrollToBottom();
}

onMounted(() => {
  bus.$on('commandLog', handleCommandLog);
});

onUnmounted(() => {
  bus.$off('commandLog', handleCommandLog);
});

defineExpose({
  show,
});
</script>

<style type="text/css">
  .command-log-dialog.el-dialog {
    margin-top: 10vh !important;
  }
  .command-log-list {
    padding: 6px;
    min-height: 150px;
    height: calc(90vh - 307px);
    border: 1px solid grey;
    border-radius: 5px;
    margin-bottom: 12px;
  }

  .command-log-list .command-cmd {
    font-weight: bold;
    font-size: 110%;
  }
  .command-log-list .command-cost {
    color: #e59090;
  }
</style>
