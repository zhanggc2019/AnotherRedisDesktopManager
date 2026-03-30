<template>
  <el-form class="key-content-string">
    <!-- key content textarea -->
    <el-form-item>
      <FormatViewer
        ref="formatViewer"
        :content="content"
        :binary="binary"
        :redis-key="redisKey"
        float=""
      />
    </el-form-item>

    <!-- save btn -->
    <el-button
      ref="saveBtn"
      type="primary"
      title="Ctrl+s"
      class="content-string-save-btn"
      @click="execSave"
    >
      {{ $t('message.save') }}
    </el-button>
  </el-form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { ElMessage } from 'element-plus'
import FormatViewer from '@/components/FormatViewer.vue'
import * as util from '@/util'
import * as shortcut from '@/shortcut'

const props = defineProps({
  client: Object,
  redisKey: [String, Buffer],
  hotKeyScope: String,
})

const { t } = useI18n()
const content = ref(Buffer.from(''))
const binary = ref(false)
const formatViewer = ref(null)
const saveBtn = ref(null)

const initShow = () => {
  props.client.callBuffer('JSON.GET', [props.redisKey]).then((reply) => {
    content.value = reply
  })
}

const setTTL = () => {
  // Access parent's keyHeader through bus or props
  // This is a workaround for accessing parent component's ref
  const keyTTLElement = document.querySelector('[data-key-ttl]')
  const ttl = keyTTLElement ? parseInt(keyTTLElement.getAttribute('data-key-ttl')) : 0

  if (ttl > 0) {
    props.client.expire(props.redisKey, ttl).catch((e) => {
      ElMessage.error(`Expire Error: ${e.message}`)
    })
  }
}

const execSave = () => {
  const contentValue = formatViewer.value?.getContent()

  // viewer check failed, do not save
  if (contentValue === false) {
    return
  }

  if (!util.isJson(contentValue)) {
    return ElMessage.error(t('message.json_format_failed'))
  }

  props.client.call('JSON.SET', [props.redisKey, '.', contentValue]).then((reply) => {
    if (reply === 'OK') {
      setTTL()
      initShow()

      ElMessage.success({
        message: t('message.modify_success'),
        duration: 1000,
      })
    } else {
      ElMessage.error({
        message: t('message.modify_failed'),
        duration: 1000,
      })
    }
  }).catch((e) => {
    ElMessage.error(e.message)
  })
}

const initShortcut = () => {
  shortcut.bind('ctrl+s, ⌘+s', props.hotKeyScope, () => {
    execSave()
    return false
  })
}

const dumpCommand = () => {
  const command = `JSON.SET ${util.bufToQuotation(props.redisKey)} . ${
    util.bufToQuotation(content.value)}`
  util.copyToClipboard(command)
  ElMessage.success({ message: t('message.copy_success'), duration: 800 })
}

onMounted(() => {
  initShow()
  initShortcut()
})
</script>
