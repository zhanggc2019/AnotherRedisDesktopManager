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
        :data="listData"
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
        @click="loadMore"
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
import * as util from '@/util'

const props = defineProps({
  client: Object,
  redisKey: [String, Buffer],
})

const { t } = useI18n()

const total = ref(0)
const filterValue = ref('')
const editDialog = ref(false)
const listData = ref([])
const beforeEditItem = ref({})
const editLineItem = ref({})
const loadingIcon = ref('')
const pageSize = 200
const searchPageSize = 2000
const pageIndex = ref(0)
const oneTimeListLength = ref(0)
const loadMoreDisable = ref(false)
const cancelScanning = ref(false)
const formatViewer = ref(null)
const contentTable = ref(null)

const dialogTitle = computed(() => {
  return beforeEditItem.value.value ? t('message.edit_line')
    : t('message.add_new_line')
})

watch(listData, (newValue, oldValue) => {
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
  const { filterValue: fv } = filterValue
  const pageSize_ = fv ? searchPageSize : pageSize

  const start = pageSize_ * pageIndex.value
  const end = start + pageSize_ - 1

  props.client.lrangeBuffer([props.redisKey, start, end]).then((reply) => {
    // scanning end
    if (!reply || !reply.length) {
      loadingIcon.value = ''
      loadMoreDisable.value = true
      return
    }

    const newListData = []
    for (const i of reply) {
      if (fv) {
        if (!i.includes(fv)) {
          continue
        }
      }

      newListData.push({ value: i })
    }

    oneTimeListLength.value += newListData.length
    listData.value = listData.value.concat(newListData)

    if (oneTimeListLength.value >= pageSize) {
      loadingIcon.value = ''
      oneTimeListLength.value = 0
      return
    }

    if (cancelScanning.value) {
      return
    }
    // continue scanning until to pagesize
    loadMore()
  }).catch((e) => {
    loadingIcon.value = ''
    loadMoreDisable.value = true
    ElMessage.error(e.message)
  })
}

const initTotal = () => {
  props.client.llen(props.redisKey).then((reply) => {
    total.value = reply
  }).catch((e) => {})
}

const resetTable = () => {
  listData.value = []
  pageIndex.value = 0
  oneTimeListLength.value = 0
  loadMoreDisable.value = false
}

const loadMore = () => {
  pageIndex.value++
  listScan()
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
  const lines = item ? [item] : listData.value
  const params = lines.map(line => util.bufToQuotation(line.value))

  const command = `RPUSH ${util.bufToQuotation(props.redisKey)} ${params.join(' ')}`
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
  const newLine = { value: afterValue }

  // edit line
  if (before.value) {
    // fix #1082, keep list order
    client.linsert(key, 'AFTER', before.value, afterValue).then((reply) => {
      if (reply > 0) {
        client.lrem(key, 1, before.value)
        listData.value.splice(listData.value.indexOf(before), 1, newLine)

        ElMessage.success({
          message: t('message.modify_success'),
          duration: 1000,
        })
      }
      // reply == -1, before.value has been removed
      else {
        ElMessage.error({
          message: `${t('message.modify_failed')}, ${t('message.value_not_exists')}`,
          duration: 2000,
        })
      }
    }).catch((e) => { ElMessage.error(e.message) })
  }
  // new line
  else {
    client.rpush(key, afterValue).then((reply) => {
      if (reply > 0) {
        listData.value.push(newLine)
        total.value++

        ElMessage.success({
          message: t('message.add_success'),
          duration: 1000,
        })
      }
    }).catch((e) => { ElMessage.error(e.message) })
  }
}

const deleteLine = (row) => {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_row_data'),
    { type: 'warning' },
  ).then(() => {
    props.client.lrem(
      props.redisKey,
      1,
      row.value,
    ).then((reply) => {
      if (reply > 0) {
        ElMessage.success({
          message: t('message.delete_success'),
          duration: 1000,
        })

        listData.value.splice(listData.value.indexOf(row), 1)
        total.value--
      } else {
        ElMessage.error({
          message: t('message.delete_failed'),
          duration: 1000,
        })
      }
    }).catch((e) => { ElMessage.error(e.message) })
  }).catch(() => {})
}

onMounted(() => {
  initShow()
})

onBeforeUnmount(() => {
  cancelScanning.value = true
})
</script>
