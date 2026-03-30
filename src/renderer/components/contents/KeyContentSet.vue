<template>
  <div>
    <!-- table toolbar -->
    <div>
      <!-- add button -->
      <el-button
        type="primary"
        @click="showEditDialog({})"
      >
        {{ $t('message.add_new_line') }}
      </el-button>

      <!-- edit & add dialog -->
      <el-dialog
        v-model="editDialog"
        :title="dialogTitle"
        :close-on-click-modal="false"
        @open="openDialog"
      >
        <el-form>
          <el-form-item label="Value">
            <FormatViewer
              ref="formatViewer"
              :redis-key="redisKey"
              :data-map="editLineItem"
              :content="editLineItem.value"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDialog = false">
              {{ $t('el.messagebox.cancel') }}
            </el-button>
            <el-button
              type="primary"
              @click="editLine"
            >
              {{ $t('el.messagebox.confirm') }}
            </el-button>
          </div>
        </template>
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
        :data="setData"
      >
        <vxe-column
          type="seq"
          :title="'ID (Total: ' + total + ')'"
          width="150"
        />
        <vxe-column
          field="value"
          title="Value"
          sortable
        >
          <template #default="scope">
            {{ $util.cutString($util.bufToString(scope.row.value), 100) }}
          </template>
        </vxe-column>
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
              @click="$util.copyToClipboard(scope.row.value)"
            />
            <el-button
              type="text"
              :icon="resolveElIcon('el-icon-edit')"
              :title="$t('message.edit_line')"
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VxeTable, VxeColumn } from 'vxe-table'
import { useI18n } from '@/composables/useI18n'
import { resolveElIcon } from '@/element-plus-icons'
import FormatViewer from '@/components/FormatViewer.vue'
import * as util from '@/util'

const props = defineProps({
  client: Object,
  redisKey: [String, Buffer],
})

const { t } = useI18n()

const total = ref(0)
const filterValue = ref('')
const editDialog = ref(false)
const setData = ref([])
const beforeEditItem = ref({})
const editLineItem = ref({})
const loadingIcon = ref('')
const pageSize = 200
const searchPageSize = 2000
const oneTimeListLength = ref(0)
const scanStream = ref(null)
const loadMoreDisable = ref(false)
const formatViewer = ref(null)
const contentTable = ref(null)

const dialogTitle = computed(() => {
  return beforeEditItem.value.value ? t('message.edit_line')
    : t('message.add_new_line')
})

watch(setData, (newValue, oldValue) => {
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

  if (!scanStream.value) {
    initScanStream()
  } else {
    oneTimeListLength.value = 0
    scanStream.value.resume()
  }

  // total lines
  initTotal()
}

const initTotal = () => {
  props.client.scard(props.redisKey).then((reply) => {
    total.value = reply
  }).catch((e) => {})
}

const resetTable = () => {
  // stop scanning first, #815
  scanStream.value && scanStream.value.pause()
  setData.value = []
  scanStream.value = null
  oneTimeListLength.value = 0
  loadMoreDisable.value = false
}

const initScanStream = () => {
  const scanOption = { match: getScanMatch(), count: pageSize }
  scanOption.match != '*' && (scanOption.count = searchPageSize)

  scanStream.value = props.client.sscanBufferStream(
    props.redisKey,
    scanOption,
  )

  scanStream.value.on('data', (reply) => {
    const newSetData = []

    for (const i of reply) {
      newSetData.push({
        value: i,
      })
    }

    oneTimeListLength.value += newSetData.length
    setData.value = setData.value.concat(newSetData)

    if (oneTimeListLength.value >= pageSize) {
      scanStream.value.pause()
      loadingIcon.value = ''
    }
  })

  scanStream.value.on('end', () => {
    loadingIcon.value = ''
    loadMoreDisable.value = true
  })

  scanStream.value.on('error', (e) => {
    loadingIcon.value = ''
    loadMoreDisable.value = true
    ElMessage.error(e.message)
  })
}

const getScanMatch = () => {
  return filterValue.value ? `*${filterValue.value}*` : '*'
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
  const lines = item ? [item] : setData.value
  const params = lines.map(line => util.bufToQuotation(line.value))

  const command = `SADD ${util.bufToQuotation(props.redisKey)} ${params.join(' ')}`
  util.copyToClipboard(command)
  ElMessage.success({ message: t('message.copy_success'), duration: 800 })
}

const editLine = () => {
  const key = props.redisKey
  const { client } = props
  const before = beforeEditItem.value
  const afterValue = formatViewer.value?.getContent()

  if (!afterValue) {
    return
  }

  // not changed
  if (before.value && before.value.equals(afterValue)) {
    return editDialog.value = false
  }

  editDialog.value = false

  client.sadd(
    key,
    afterValue,
  ).then((reply) => {
    // add success
    if (reply == 1) {
      // edit key remove previous value
      if (before.value) {
        client.srem(key, before.value)
      }

      const newLine = { value: afterValue }
      // edit line
      if (before.value) {
        setData.value.splice(setData.value.indexOf(before), 1, newLine)
      }
      // new line
      else {
        setData.value.push(newLine)
        total.value++
      }

      ElMessage.success({
        message: t('message.add_success'),
        duration: 1000,
      })
    }

    // value exists
    else if (reply == 0) {
      ElMessage.error({
        message: t('message.value_exists'),
        duration: 1000,
      })
    }
  }).catch((e) => { ElMessage.error(e.message) })
}

const deleteLine = (row) => {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_row_data'),
    { type: 'warning' },
  ).then(() => {
    props.client.srem(
      props.redisKey,
      row.value,
    ).then((reply) => {
      if (reply == 1) {
        ElMessage.success({
          message: t('message.delete_success'),
          duration: 1000,
        })

        setData.value.splice(setData.value.indexOf(row), 1)
        total.value--
      }
    }).catch((e) => { ElMessage.error(e.message) })
  }).catch(() => {})
}

onMounted(() => {
  initShow()
})
</script>
