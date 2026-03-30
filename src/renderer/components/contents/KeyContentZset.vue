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

      <!-- toggle sort type -->
      &nbsp;
      <el-radio-group
        v-model="sortType"
        :disabled="!!filterValue"
        @change="initShow()"
      >
        <el-radio-button label="DESC">
          DESC <i class="fa fa-chevron-down" />
        </el-radio-button>
        <el-radio-button label="ASC">
          ASC <i class="fa fa-chevron-up" />
        </el-radio-button>
      </el-radio-group>

      <!-- edit & add dialog -->
      <el-dialog
        v-model="editDialog"
        :title="dialogTitle"
        :close-on-click-modal="false"
        @open="openDialog"
      >
        <el-form>
          <el-form-item label="Score">
            <el-input
              v-model="editLineItem.score"
              autocomplete="off"
            />
          </el-form-item>
          <el-form-item label="Member">
            <FormatViewer
              ref="formatViewer"
              :redis-key="redisKey"
              :data-map="editLineItem"
              :content="editLineItem.member"
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
        :data="zsetData"
      >
        <vxe-column
          type="seq"
          :title="'ID (Total: ' + total + ')'"
          width="150"
        />
        <vxe-column
          field="score"
          title="Score"
          sortable
          width="150"
        />
        <vxe-column
          field="member"
          title="Member"
          sortable
        >
          <template #default="scope">
            {{ $util.cutString($util.bufToString(scope.row.member), 100) }}
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
              @click="$util.copyToClipboard(scope.row.member)"
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
const zsetData = ref([])
const beforeEditItem = ref({})
const editLineItem = ref({})
const loadingIcon = ref('')
const pageSize = 200
const pageIndex = ref(0)
const searchPageSize = 2000
const oneTimeListLength = ref(0)
const scanStream = ref(null)
const loadMoreDisable = ref(false)
const sortType = ref('DESC')
const formatViewer = ref(null)
const contentTable = ref(null)

const dialogTitle = computed(() => {
  return beforeEditItem.value.member ? t('message.edit_line')
    : t('message.add_new_line')
})

watch(zsetData, (newValue, oldValue) => {
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

  // search mode, scan, random order
  if (getScanMatch() != '*') {
    getListScan()
  }

  // default mode, ordered
  else {
    getListRange(resetTable)
    pageIndex.value++
  }

  // total lines
  initTotal()
}

const initTotal = () => {
  props.client.zcard(props.redisKey).then((reply) => {
    total.value = reply
  }).catch((e) => {})
}

const resetTable = () => {
  // stop scanning first, #815
  scanStream.value && scanStream.value.pause()
  zsetData.value = []
  pageIndex.value = 0
  scanStream.value = null
  oneTimeListLength.value = 0
  loadMoreDisable.value = false
}

const getListRange = (resetTable) => {
  const start = pageSize * pageIndex.value
  const end = start + pageSize - 1
  const sortMethod = sortType.value === 'ASC' ? 'zrangeBuffer' : 'zrevrangeBuffer'

  props.client[sortMethod]([props.redisKey, start, end, 'WITHSCORES']).then((reply) => {
    const newZsetData = solveList(reply)

    zsetData.value = resetTable ? newZsetData : zsetData.value.concat(newZsetData)
    (newZsetData.length < pageSize) && (loadMoreDisable.value = true)
    loadingIcon.value = ''
  }).catch((e) => {
    loadingIcon.value = ''
    loadMoreDisable.value = true
    ElMessage.error(e.message)
  })
}

const getListScan = () => {
  if (!scanStream.value) {
    initScanStream()
  } else {
    oneTimeListLength.value = 0
    scanStream.value.resume()
  }
}

const initScanStream = () => {
  const scanOption = { match: getScanMatch(), count: pageSize }
  scanOption.match != '*' && (scanOption.count = searchPageSize)

  scanStream.value = props.client.zscanBufferStream(
    props.redisKey,
    scanOption,
  )

  scanStream.value.on('data', (reply) => {
    const newZsetData = solveList(reply)

    oneTimeListLength.value += newZsetData.length
    zsetData.value = zsetData.value.concat(newZsetData)

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

const solveList = (list) => {
  if (!list) {
    return []
  }

  const newZsetData = []

  for (let i = 0; i < list.length; i += 2) {
    newZsetData.push({
      score: Number(list[i + 1]),
      member: list[i],
    })
  }

  return newZsetData
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
  const lines = item ? [item] : zsetData.value
  const params = lines.map(line => `${String(line.score)} ${
    util.bufToQuotation(line.member)}`)

  const command = `ZADD ${util.bufToQuotation(props.redisKey)} ${params.join(' ')}`
  util.copyToClipboard(command)
  ElMessage.success({ message: t('message.copy_success'), duration: 800 })
}

const editLine = () => {
  const key = props.redisKey
  const { client } = props
  const before = beforeEditItem.value

  const afterScore = editLineItem.value.score
  const afterMember = formatViewer.value?.getContent()

  if (!afterMember || isNaN(afterScore)) {
    return
  }

  editDialog.value = false

  client.zadd(
    key,
    afterScore,
    afterMember,
  ).then((reply) => {
    // edit key member changed
    if (before.member && !before.member.equals(afterMember)) {
      client.zrem(key, before.member)
    }

    const newLine = { score: afterScore, member: afterMember }
    // edit line
    if (before.member) {
      zsetData.value.splice(zsetData.value.indexOf(before), 1, newLine)
    }
    // new line
    else {
      zsetData.value.push(newLine)
      total.value++
    }

    ElMessage.success({
      message: reply == 1 ? t('message.add_success') : t('message.modify_success'),
      duration: 1000,
    })
  }).catch((e) => { ElMessage.error(e.message) })
}

const deleteLine = (row) => {
  ElMessageBox.confirm(
    t('message.confirm_to_delete_row_data'),
    { type: 'warning' },
  ).then(() => {
    props.client.zrem(
      props.redisKey,
      row.member,
    ).then((reply) => {
      if (reply == 1) {
        ElMessage.success({
          message: t('message.delete_success'),
          duration: 1000,
        })

        zsetData.value.splice(zsetData.value.indexOf(row), 1)
        total.value--
      }
    }).catch((e) => { ElMessage.error(e.message) })
  }).catch(() => {})
}

onMounted(() => {
  initShow()
})
</script>
