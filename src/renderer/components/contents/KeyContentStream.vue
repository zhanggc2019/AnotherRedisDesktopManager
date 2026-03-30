<template>
  <div class="key-content-stream">
    <!-- table toolbar -->
    <div>
      <el-form :inline="true">
        <el-form-item>
          <!-- add button -->
          <el-button
            type="primary"
            @click="showEditDialog({id:&quot;*&quot;})"
          >
            {{ $t('message.add_new_line') }}
          </el-button>
          <!-- groups info -->
          <el-button
            type="primary"
            @click="initGroups"
          >
            Groups
          </el-button>
        </el-form-item>
        <!-- max value -->
        <el-form-item label="Max">
          <el-input
            v-model="maxId"
            type="primary"
            placeholder="Max ID, default +"
            :title="$t(&quot;message.enter_to_search&quot;)"
            size="mini"
            @keyup.enter="initShow"
          >
            Max
          </el-input>
        </el-form-item>
        <!-- min value -->
        <el-form-item label="Min">
          <el-input
            v-model="minId"
            type="primary"
            placeholder="Min ID, default -"
            :title="$t(&quot;message.enter_to_search&quot;)"
            size="mini"
            @keyup.enter="initShow"
          >
            Min
          </el-input>
        </el-form-item>
      </el-form>

      <!-- edit & add dialog -->
      <el-dialog
        v-model="editDialog"
        :title="dialogTitle"
        :close-on-click-modal="false"
        @open="openDialog"
      >
        <el-form>
          <el-form-item label="ID">
            <InputBinary
              :disabled="!!beforeEditItem.contentString"
              :content="editLineItem.id"
              @update:content="editLineItem.id = $event"
            />
          </el-form-item>

          <el-form-item label="Value (JSON string)">
            <FormatViewer
              ref="formatViewer"
              :redis-key="redisKey"
              :data-map="editLineItem"
              :disabled="!!beforeEditItem.contentString"
              :content="editLineItem.contentString"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDialog = false">
              {{ $t('el.messagebox.cancel') }}
            </el-button>
            <el-button
              v-if="!beforeEditItem.contentString"
              type="primary"
              @click="editLine"
            >
              {{ $t('el.messagebox.confirm') }}
            </el-button>
          </div>
        </template>
      </el-dialog>

      <!-- groups info dialog -->
      <el-dialog
        v-model="groupsVisible"
        width="760px"
        title="Groups"
      >
        <el-table
          ref="groupsTable"
          size="mini"
          min-height="300"
          :data="groups"
          @expand-change="initCousumers"
          @row-click="toggleGroupRow"
        >
          <el-table-column type="expand">
            <template #default="props">
              <el-table :data="consumersDict[props.row.name]">
                <el-table-column width="62px" />
                <el-table-column
                  label="Consumer Name"
                  prop="name"
                />
                <el-table-column
                  label="Pending"
                  prop="pending"
                />
                <el-table-column
                  label="Idle"
                  prop="idle"
                />
              </el-table>
            </template>
          </el-table-column>
          <el-table-column
            label="Group Name"
            prop="name"
          />
          <el-table-column
            label="Consumers"
            prop="consumers"
          />
          <el-table-column
            label="Pending"
            prop="pending"
          />
          <el-table-column
            label="Last Delivered Id"
            prop="last-delivered-id"
          />
        </el-table>
      </el-dialog>
    </div>

    <!-- vxe table must get a container with a fixed height -->
    <div class="content-table-container">
      <vxe-table
        ref="contentTable"
        size="mini"
        max-height="100%"
        min-height="72px"
        border="default"
        stripe
        show-overflow="title"
        :scroll-y="{enabled: true}"
        :row-config="{isHover: true, height: 34}"
        :column-config="{resizable: true}"
        :empty-text="$t('el.table.emptyText')"
        :data="lineData"
      >
        <vxe-column
          type="seq"
          :title="'ID (Total: ' + total + ')'"
          width="150"
        />
        <vxe-column
          field="id"
          title="ID"
          sortable
        />
        <vxe-column
          field="contentString"
          title="Value"
          sortable
        />
        <vxe-column
          title="Operate"
          width="166"
        >
          <template #header>
            <el-input
              v-model="filterValue"
              size="mini"
              :placeholder="$t('message.key_to_search')"
              :suffix-icon="resolveElIcon(loadingIcon)"
              @keyup.enter="initShow()"
            />
          </template>
          <template #default="scope">
            <el-button
              type="text"
              :icon="resolveElIcon('el-icon-document')"
              :title="$t('message.copy')"
              @click="$util.copyToClipboard(scope.row.contentString)"
            />
            <el-button
              type="text"
              :icon="resolveElIcon('el-icon-view')"
              :title="$t('message.detail')"
              @click="showEditDialog(scope.row)"
            />
            <el-button
              type="text"
              :icon="resolveElIcon('el-icon-delete')"
              :title="$t('el.upload.delete')"
              @click="deleteLine(scope.row)"
            />
            <el-button
              type="text"
              icon="fa fa-code"
              :title="$t('message.dump_to_clipboard')"
              @click="dumpCommand(scope.row)"
            />
          </template>
        </vxe-column>
      </vxe-table>
    </div>

    <!-- load more content -->
    <div class="content-more-container">
      <el-button
        size="mini"
        :icon="loadingIcon"
        :disabled="loadMoreDisable"
        class="content-more-btn"
        @click="initShow(false)"
      >
        {{ $t('message.load_more_keys') }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VxeTable, VxeColumn } from 'vxe-table'
import { useI18n } from '@/composables/useI18n'
import { resolveElIcon } from '@/element-plus-icons'
import FormatViewer from '@/components/FormatViewer.vue'
import InputBinary from '@/components/InputBinary.vue'
import * as util from '@/util'

const props = defineProps({
  client: Object,
  redisKey: [String, Buffer],
})

const { t } = useI18n()

const total = ref(0)
const editDialog = ref(false)
const lineData = ref([])
const beforeEditItem = ref({})
const editLineItem = ref({})
const loadingIcon = ref('')
const pageSize = 200
const searchPageSize = 2000
const loadMoreDisable = ref(false)
const minId = ref('-')
const maxId = ref('+')
const lastId = ref(Buffer.from(''))
const oneTimeListLength = ref(0)
const filterValue = ref('')
const groupsVisible = ref(false)
const groups = ref([])
const consumersDict = ref({})
const cancelScanning = ref(false)
const formatViewer = ref(null)
const contentTable = ref(null)
const groupsTable = ref(null)

const dialogTitle = computed(() => {
  return beforeEditItem.value.contentString ? t('message.detail')
    : t('message.add_new_line')
})

watch(lineData, (newValue, oldValue) => {
  // scroll to bottom while loading more
  if (oldValue.length && (newValue.length > oldValue.length)) {
    nextTick(() => {
      contentTable.value && contentTable.value.scrollTo(0, 99999999)
    })
  }
})

const initShow = (resetTable = true) => {
  if (resetTable) resetTable()
  loadingIcon.value = 'el-icon-loading'

  // scan
  listScan()
  // total lines
  initTotal()
}

const listScan = () => {
  const maxIdVal = lastId.value.equals(Buffer.from(''))
    ? (maxId.value ? maxId.value : '+')
    : lastId.value
  // +1 for padding the repeat
  const pageSizeVal = filterValue.value ? searchPageSize
    : (lineData.value.length ? pageSize + 1 : pageSize)

  props.client.xrevrangeBuffer([
    props.redisKey,
    maxIdVal,
    minId.value ? minId.value : '-',
    'COUNT',
    pageSizeVal,
  ]).then((reply) => {
    if (!reply.length) {
      return loadingIcon.value = ''
    }

    // last line of this page
    const lastLine = reply[reply.length - 1]

    // scanning end
    if (lastId.value.equals(lastLine[0])) {
      loadingIcon.value = ''
      oneTimeListLength.value = 0
      return
    }

    const newLineData = []

    for (const stream of reply) {
      const streamId = stream[0]
      const flatDict = stream[1]

      // skip first line, it is repeat with the last one of previous page
      if (lastId.value.equals(streamId)) {
        continue
      }

      const content = {}
      const line = { id: streamId, content }
      // add key value map
      for (let i = 0; i < flatDict.length; i += 2) {
        content[util.bufToString(flatDict[i])] = util.bufToString(flatDict[i + 1])
      }

      line.contentString = JSON.stringify(line.content)

      // filter k&v
      if (filterValue.value && !line.contentString.includes(filterValue.value)) {
        continue
      }
      newLineData.push(line)
    }

    // record last id for next load
    lastId.value = lastLine[0]

    oneTimeListLength.value += newLineData.length
    lineData.value = lineData.value.concat(newLineData)

    if (oneTimeListLength.value >= pageSize) {
      loadingIcon.value = ''
      oneTimeListLength.value = 0
      return
    }

    if (cancelScanning.value) {
      return
    }
    // continue scanning until to pagesize
    listScan()
  }).catch((e) => {
    loadingIcon.value = ''
    ElMessage.error(e.message)
  })
}

const initTotal = () => {
  props.client.xlen(props.redisKey).then((reply) => {
    total.value = reply
  })
}

const resetTable = () => {
  lineData.value = []
  lastId.value = Buffer.from('')
  oneTimeListLength.value = 0
  loadMoreDisable.value = false
}

const openDialog = () => {
  nextTick(() => {
    formatViewer.value?.autoFormat()
  })
}

const showEditDialog = (row) => {
  editLineItem.value = util.cloneObjWithBuff(row)
  beforeEditItem.value = row
  editDialog.value = true
}

const dumpCommand = (item) => {
  const lines = item ? [item] : lineData.value
  const params = lines.map((line) => {
    const command = `XADD ${util.bufToQuotation(props.redisKey)} ${line.id} `

    const dicts = []
    for (const field in line.content) {
      dicts.push(util.bufToQuotation(field), util.bufToQuotation(line.content[field]))
    }

    return `${command} ${dicts.join(' ')}`
  })

  // reverse: id asc order
  util.copyToClipboard(params.reverse().join('\n'))
  ElMessage.success({ message: t('message.copy_success'), duration: 800 })
}

const editLine = () => {
  const afterId = editLineItem.value.id
  const afterValue = formatViewer.value?.getContent()

  if (!afterId || !afterValue) {
    return
  }

  if (!util.isJson(afterValue)) {
    return ElMessage.error(t('message.json_format_failed'))
  }

  const mapList = []
  const jsonObj = JSON.parse(afterValue)

  for (const k in jsonObj) {
    mapList.push(...[k, jsonObj[k]])
  }

  props.client.xadd(
    props.redisKey,
    afterId,
    mapList,
  ).then((reply) => {
    // reply is id
    if (reply) {
      const newLine = { id: reply, content: jsonObj, contentString: afterValue }
      lineData.value.unshift(newLine)
      total.value++
      editDialog.value = false

      ElMessage.success({
        message: t('message.add_success'),
        duration: 1000,
      })
    }
  }).catch((e) => {
    ElMessage.error(e.message)
  })
}

const deleteLine = (row) => {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_row_data'),
    { type: 'warning' },
  ).then(() => {
    props.client.xdel(
      props.redisKey,
      row.id,
    ).then((reply) => {
      if (reply == 1) {
        ElMessage.success({
          message: t('message.delete_success'),
          duration: 1000,
        })

        lineData.value.splice(lineData.value.indexOf(row), 1)
        total.value--
      }
    })
  }).catch(() => {})
}

const initGroups = () => {
  // reset status
  groups.value = []
  consumersDict.value = {}
  // show dialog
  groupsVisible.value = true

  props.client.call('XINFO', 'GROUPS', props.redisKey).then((reply) => {
    groups.value = formatInfo(reply)
  })
}

const initConsumers = (row, expandedRows) => {
  // exec only when opening
  if (!expandedRows.filter(item => item.name === row.name).length) {
    return
  }

  props.client.call('XINFO', 'CONSUMERS', props.redisKey, row.name).then((reply) => {
    consumersDict.value = {
      ...consumersDict.value,
      [row.name]: formatInfo(reply),
    }
  })
}

const toggleGroupRow = (row) => {
  groupsTable.value.toggleRowExpansion(row)
}

const formatInfo = (lines) => {
  const formatted = []

  for (const line of lines) {
    const dict = {}

    for (let j = 0; j < line.length - 1; j += 2) {
      dict[line[j]] = line[j + 1]
    }

    formatted.push(dict)
  }

  return formatted
}

onMounted(() => {
  initShow()
})

onBeforeUnmount(() => {
  cancelScanning.value = true
})
</script>

<style type="text/css">
  /*key content table wrapper*/
  /*less height due to stream top tools*/
  .key-content-stream.key-content-container .content-table-container {
    height: calc(100vh - 232px);
    margin-top: 0px;
  }
</style>
