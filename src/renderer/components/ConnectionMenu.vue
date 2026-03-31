<template>
  <div class="connection-menu-title">
    <div class="connection-opt-icons">
      <!-- right menu operate icons -->
      <i
        :title="$t('message.redis_status')"
        class="connection-right-icon fa fa-home"
        :style="{ color: client ? '#7cad7c' : ''}"
        @click.stop.prevent="openStatus"
      />
      <i
        :title="$t('message.redis_console')"
        class="connection-right-icon fa fa-terminal font-weight-bold"
        @click.stop.prevent="openCli"
      />
      <ElementIcon
        :title="$t('message.refresh_connection')"
        name="el-icon-refresh"
        class="connection-right-icon font-weight-bold"
        @click.stop.prevent="refreshConnection"
      />

      <!-- more operate menu -->
      <el-dropdown
        class="connection-menu-more"
        placement="bottom-start"
        :show-timeout="100"
        :hide-timeout="300"
      >
        <ElementIcon
          name="el-icon-menu"
          class="connection-right-icon"
          @click.stop
        />
        <template #dropdown>
          <el-dropdown-menu class="connection-menu-more-ul">
            <el-dropdown-item @click="closeConnection">
              <span><i class="more-operate-ico fa fa-power-off" />&nbsp;{{ $t('message.close_connection') }}</span>
            </el-dropdown-item>
            <el-dropdown-item @click="showEditConnection">
              <span><ElementIcon
                name="el-icon-edit-outline"
                class="more-operate-ico"
              />&nbsp;{{ $t('message.edit_connection') }}</span>
            </el-dropdown-item>
            <el-dropdown-item @click="deleteConnection">
              <span><ElementIcon
                name="el-icon-delete"
                class="more-operate-ico"
              />&nbsp;{{ $t('message.del_connection') }}</span>
            </el-dropdown-item>
            <el-dropdown-item @click="duplicateConnection">
              <span><i class="more-operate-ico fa fa-clone" />&nbsp;{{ $t('message.duplicate_connection') }}</span>
            </el-dropdown-item>

            <!-- menu color picker -->
            <el-tooltip
              placement="right"
              effect="light"
            >
              <template #content>
                <el-color-picker
                  v-model="menuColor"
                  :predefine="['#f56c6c', '#F5C800', '#409EFF', '#85ce61', '#c6e2ff']"
                  @change="changeColor"
                />
              </template>

              <el-dropdown-item divided>
                <span><i class="more-operate-ico fa fa-bookmark-o" />&nbsp;{{ $t('message.mark_color') }}</span>
              </el-dropdown-item>
            </el-tooltip>

            <el-dropdown-item @click="memoryAnalisys">
              <span><i class="more-operate-ico fa fa-table" />&nbsp;{{ $t('message.memory_analysis') }}</span>
            </el-dropdown-item>
            <el-dropdown-item @click="slowLog">
              <span><i class="more-operate-ico fa fa-hourglass-start" />&nbsp;{{ $t('message.slow_log') }}</span>
            </el-dropdown-item>
            <el-dropdown-item
              divided
              @click="importKeys"
            >
              <span><ElementIcon
                name="el-icon-download"
                class="more-operate-ico"
              />&nbsp;{{ $t('message.import') }} Key</span>
            </el-dropdown-item>
            <el-dropdown-item @click="execFileCMDS">
              <span><i class="more-operate-ico fa fa-file-code-o" />&nbsp;{{ $t('message.import') }} CMD</span>
            </el-dropdown-item>
            <el-dropdown-item @click="flushDB">
              <span><i class="more-operate-ico fa fa-exclamation-triangle" />&nbsp;{{ $t('message.flushdb') }}</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div
      :title="connectionTitle()"
      class="connection-name"
    >
      {{ resolvedConnectionName }}
    </div>

    <!-- edit connection dialog -->
    <NewConnectionDialog
      ref="editConnectionDialog"
      :edit-mode="true"
      :config="config"
      @edit-connection-finished="editConnectionFinished"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { getConnectionName, addConnection, deleteConnection as deleteConnectionStorage, editConnectionItem } from '@/storage'
import electron from '@/electron'
import bus from '@/bus'
import NewConnectionDialog from '@/components/NewConnectionDialog.vue'
import ElementIcon from '@/components/ElementIcon.vue'
import splitargs from '@qii404/redis-splitargs'

const props = defineProps({
  config: Object,
  client: Object,
})

const emit = defineEmits(['changeColor', 'refreshConnection', 'open-status', 'open-cli'])

const { t } = useI18n()

const menuColor = ref('#409EFF')
const editConnectionDialog = ref(null)

const resolvedConnectionName = computed(() => {
  return props.config.connectionName || getConnectionName(props.config)
})

const connectionTitle = () => {
  const { config } = props
  const sep = '-----------'
  const lines = [
    resolvedConnectionName.value,
    sep,
    `${t('message.host')}: ${config.host}`,
    `${t('message.port')}: ${config.port}`,
  ]

  if (config.username) {
    lines.push(`${t('message.username')}: ${config.username}`)
  }
  if (config.separator) {
    lines.push(`${t('message.separator')}: "${config.separator}"`)
  }

  if (config.connectionReadOnly) {
    lines.push(`${sep}\nREADONLY`)
  }
  if (config.sshOptions) {
    lines.push(`${sep}\nSSH:`)
    lines.push(`  ${t('message.host')}: ${config.sshOptions.host}`)
    lines.push(`  ${t('message.port')}: ${config.sshOptions.port}`)
    lines.push(`  ${t('message.username')}: ${config.sshOptions.username}`)
  }
  if (config.cluster) {
    lines.push(`${sep}\nCLUSTER`)
  }
  if (config.sentinelOptions) {
    lines.push(`${sep}\nSENTINEL:`)
    lines.push(`  ${t('message.master_group_name')}: ${config.sentinelOptions.masterName}`)
  }

  return lines.join('\n')
}

const refreshConnection = () => {
  emit('refreshConnection')
}

const showEditConnection = () => {
  if (!props.client) {
    return editConnectionDialog.value.show()
  }

  ElMessageBox.confirm(
    t('message.close_to_edit_connection'),
    { type: 'warning' },
  ).then(() => {
    bus.$emit('closeConnection', resolvedConnectionName.value)
    editConnectionDialog.value.show()
  }).catch(() => {})
}

const closeConnection = () => {
  ElMessageBox.confirm(
    t('message.close_to_connection'),
    { type: 'warning' },
  ).then(() => {
    bus.$emit('closeConnection', resolvedConnectionName.value)
  }).catch(() => {})
}

const editConnectionFinished = (newConfig) => {
  bus.$emit('refreshConnections')
}

const duplicateConnection = () => {
  const newConfig = {
    ...props.config,
    key: undefined,
    order: undefined,
    connectionName: undefined,
  }

  addConnection(newConfig)

  bus.$emit('refreshConnections')
  setTimeout(() => {
    bus.$emit('duplicateConnection', newConfig)
  }, 100)
}

const deleteConnection = () => {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_connection'),
    { type: 'warning' },
  ).then(() => {
    deleteConnectionStorage(props.config)
    bus.$emit('refreshConnections')

    ElMessage.success({
      message: t('message.delete_success'),
      duration: 1000,
    })
  }).catch(() => {})
}

const openStatus = () => {
  if (!props.client) {
    emit('open-status')
    return
  }

  bus.$emit('openStatus', props.client, resolvedConnectionName.value)
}

const openCli = () => {
  if (!props.client) {
    emit('open-cli')
    return
  }

  bus.$emit('openCli', props.client, resolvedConnectionName.value)
}

const memoryAnalisys = () => {
  if (!props.client) {
    return
  }

  bus.$emit('memoryAnalysis', props.client, resolvedConnectionName.value)
}

const slowLog = () => {
  if (!props.client) {
    return
  }

  bus.$emit('slowLog', props.client, resolvedConnectionName.value)
}

const importKeys = () => {
  electron.showOpenDialog({
    properties: ['openFile'],
  }).then((reply) => {
    if (reply.canceled) {
      return
    }

    const succ = []
    const fail = []
    let count = 0

    const rl = require('readline').createInterface({
      input: require('fs').createReadStream(reply.filePaths[0]),
    })

    rl.on('line', (line) => {
      let [key, content, ttl] = line.split(',')

      if (!key || !content) {
        return
      }

      count++

      const notifyId = `import-keys-progress-${resolvedConnectionName.value}`
      if (count === 1) {
        ElNotification.success({
          message: `<p id="${notifyId}">Succ: 0, Fail: 0</p>`,
          duration: 0,
          dangerouslyUseHTMLString: true,
        })
      }

      key = Buffer.from(key, 'hex')
      content = Buffer.from(content, 'hex')
      ttl = ttl > 0 ? ttl : 0

      props.client.callBuffer('RESTORE', key, ttl, content, 'REPLACE').then((reply) => {
        succ.push(key)
      }).catch((e) => {
        fail.push(key)
      }).finally(() => {
        const notify = document.getElementById(notifyId)
        if (notify) {
          notify.innerHTML = `Succ: ${succ.length}, Fail: ${fail.length}`
        }
      })
    })

    rl.on('close', () => {
      if (count === 0) {
        return ElMessage.error('File parse failed.')
      }

      if (count > 10000) {
        ElMessage.success({
          message: t('message.import_success'),
          duration: 800,
        })
      }

      bus.$emit('refreshKeyList', props.client)
    })
  })
}

const execFileCMDS = () => {
  electron.showOpenDialog({
    properties: ['openFile'],
  }).then((reply) => {
    if (reply.canceled) {
      return
    }

    const succ = []
    const fail = []
    let count = 0

    const rl = require('readline').createInterface({
      input: require('fs').createReadStream(reply.filePaths[0]),
    })

    rl.on('line', (line) => {
      const paramsArr = splitargs(line, true)

      if (!paramsArr || !paramsArr.length) {
        return
      }

      count++

      const notifyId = `import-cmd-progress-${resolvedConnectionName.value}`
      if (count === 1) {
        ElNotification.success({
          message: `<p id="${notifyId}">Succ: 0, Fail: 0</p>`,
          duration: 0,
          dangerouslyUseHTMLString: true,
        })
      }

      props.client.callBuffer(...paramsArr).then((reply) => {
        succ.push(line)
      }).catch((e) => {
        fail.push(line)
      }).finally(() => {
        const notify = document.getElementById(notifyId)
        if (notify) {
          notify.innerHTML = `Succ: ${succ.length}, Fail: ${fail.length}`
        }
      })
    })

    rl.on('close', () => {
      if (count === 0) {
        return ElMessage.error('File parse failed.')
      }

      if (count > 10000) {
        ElMessage.success({
          message: t('message.import_success'),
          duration: 800,
        })
      }

      bus.$emit('refreshKeyList', props.client)
    })
  })
}

const flushDB = () => {
  if (!props.client) {
    return
  }

  const preDB = props.client.condition ? props.client.condition.select : 0
  const inputTxt = 'y'
  const placeholder = t('message.flushdb_prompt', { txt: inputTxt })

  ElMessageBox.prompt(t('message.confirm_flush_db', { db: preDB }), {
    inputValidator: value => ((value === inputTxt) ? true : placeholder),
    inputPlaceholder: placeholder,
  })
    .then((value) => {
      props.client.flushdb().then((reply) => {
        if (reply === 'OK') {
          ElMessage.success({
            message: t('message.delete_success'),
            duration: 1000,
          })

          refreshConnection()
        }
      }).catch((e) => {
        ElMessage.error(e.message)
      })
    })
    .catch((e) => {})
}

const changeColor = (color) => {
  emit('changeColor', color)
}

bus.$on('duplicateConnection', (newConfig) => {
  if (props.config.name !== newConfig.name) {
    return
  }

  showEditConnection()
})
</script>

<style type="text/css">
  .connection-menu-title {
    position: relative;
    min-height: 26px;
    padding: 2px 0 4px;
  }

  .connection-menu .connection-name {
    margin-left: 2px;
    margin-right: 115px;
    padding-right: 6px;
    word-break: keep-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: bold;
    font-size: 1.04em;
  }
  .connection-menu .connection-opt-icons {
    position: absolute;
    right: 8px;
    top: 0;
  }
  .connection-menu .connection-right-icon {
    display: inline-block;
    font-size: 1.16em;
    /*font-weight: bold;*/
    padding: 3px;
    margin-right: -4px;
    transition: background 0.2s;
  }
  .connection-menu .connection-right-icon:hover {
    /*color: #85878a;*/
    background: #dcdee0;
    border-radius: 3px;
  }
  .dark-mode .connection-menu .connection-right-icon:hover {
    background: #58707b;
  }

  /*fix more operation btn icon vertical-center*/
  .connection-menu-more {
    vertical-align: baseline;
  }
  /*more operation ul>ico*/
  .connection-menu-more-ul .more-operate-ico {
    width: 13px;
    text-align: center;
  }

  .font-weight-bold {
    font-weight: bold;
  }
</style>
