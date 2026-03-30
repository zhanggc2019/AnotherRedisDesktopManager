<template>
  <div class="format-viewer-container">
    <el-select
      v-model="selectedView"
      :disabled="overSize"
      class="format-selector"
      :style="selectStyle"
      size="mini"
      placeholder="Text"
    >
      <template #prefix>
        <span class="fa fa-sitemap" />
      </template>
      <el-option
        v-for="item of viewers"
        :key="item.text"
        :label="item.text"
        :value="item.text"
      />
      <!-- add custom -->
      <el-option
        :label="$t('message.custom')"
        value="addCustomFormatter"
      >
        <span><ElementIcon name="el-icon-edit-outline" /> {{ $t('message.custom') }}</span>
      </el-option>
    </el-select>
    <el-tag
      v-if="!contentVisible"
      size="mini"
      class="formater-binary-tag"
      :disable-transitions="true"
    >
      [Hex]
    </el-tag>
    <el-tag
      class="formater-binary-tag"
      size="mini"
      :disable-transitions="true"
    >
      Size: {{ $util.humanFileSize(buffSize) }}
    </el-tag>
    <el-button
      :title="$t(&quot;message.copy&quot;)"
      type="text"
      size="mini"
      @click="copyContent"
    >
      <ElementIcon name="el-icon-document" />{{ $t("message.copy") }}
    </el-button>
    <br>

    <component
      :is="viewerComponent"
      ref="viewer"
      :content="content"
      :name="selectedView"
      :content-visible="contentVisible"
      :disabled="disabled"
      :redis-key="redisKey"
      :data-map="dataMap"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import storage from '@/storage'
import bus from '@/bus'
import { $util, $message } from '@/main'
import ViewerText from '@/components/viewers/ViewerText.vue'
import ViewerHex from '@/components/viewers/ViewerHex.vue'
import ViewerJson from '@/components/viewers/ViewerJson.vue'
import ViewerBinary from '@/components/viewers/ViewerBinary.vue'
import ViewerPHPSerialize from '@/components/viewers/ViewerPHPSerialize.vue'
import ViewerBrotli from '@/components/viewers/ViewerBrotli.vue'
import ViewerGzip from '@/components/viewers/ViewerGzip.vue'
import ViewerDeflate from '@/components/viewers/ViewerDeflate.vue'
import ViewerMsgpack from '@/components/viewers/ViewerMsgpack.vue'
import ViewerOverSize from '@/components/viewers/ViewerOverSize.vue'
import ViewerCustom from '@/components/viewers/ViewerCustom.vue'
import ViewerProtobuf from '@/components/viewers/ViewerProtobuf.vue'
import ViewerDeflateRaw from '@/components/viewers/ViewerDeflateRaw.vue'
import ViewerJavaSerialize from '@/components/viewers/ViewerJavaSerialize.vue'
import ViewerPickle from '@/components/viewers/ViewerPickle.vue'
import ElementIcon from '@/components/ElementIcon.vue'

const props = defineProps({
  float: { default: 'right' },
  content: { default: () => Buffer.from('') },
  disabled: { type: Boolean, default: false },
  redisKey: { default: () => Buffer.from('') },
  dataMap: { type: Object, default: () => {} },
})

const { t } = useI18n()

const viewer = ref(null)
const viewerComponent = ref('ViewerText')
const selectedView = ref('Text')
const viewers = ref([
  { value: 'ViewerText', text: 'Text' },
  { value: 'ViewerHex', text: 'Hex' },
  { value: 'ViewerJson', text: 'Json' },
  { value: 'ViewerBinary', text: 'Binary' },
  { value: 'ViewerMsgpack', text: 'Msgpack' },
  { value: 'ViewerPHPSerialize', text: 'PHPSerialize' },
  { value: 'ViewerJavaSerialize', text: 'JavaSerialize' },
  { value: 'ViewerPickle', text: 'Pickle' },
  { value: 'ViewerBrotli', text: 'Brotli' },
  { value: 'ViewerGzip', text: 'Gzip' },
  { value: 'ViewerDeflate', text: 'Deflate' },
  { value: 'ViewerDeflateRaw', text: 'DeflateRaw' },
  { value: 'ViewerProtobuf', text: 'Protobuf' },
])
const overSizeBytes = 20971520 // 20MB
const autoFormated = ref(false)

const selectStyle = computed(() => ({
  float: props.float,
}))

const contentVisible = computed(() => {
  if (overSize.value) {
    return true
  }
  return $util.bufVisible(props.content)
})

const buffSize = computed(() => Buffer.byteLength(props.content))

const overSize = computed(() => buffSize.value > overSizeBytes)

const viewersMap = computed(() => {
  const map = { OverSize: 'ViewerOverSize' }
  viewers.value.forEach((item) => {
    map[item.text] = item.value
  })
  return map
})

const getContent = () => {
  if (typeof viewer.value?.getContent === 'function') {
    return viewer.value.getContent()
  }
  return props.content
}

const changeViewer = (viewerName) => {
  selectedView.value = viewerName
  viewerComponent.value = viewersMap.value[viewerName]
}

const addCustomFormatter = () => {
  bus.$emit('addCustomFormatter')
  autoFormat()
}

const autoFormat = () => {
  if (!props.content || !props.content.length) {
    return changeViewer('Text')
  }

  if (overSize.value) {
    return changeViewer('OverSize')
  }

  if ($util.isJson(props.content)) {
    return changeViewer('Json')
  }
  if ($util.isPHPSerialize(props.content)) {
    return changeViewer('PHPSerialize')
  }
  if ($util.isJavaSerialize(props.content)) {
    return changeViewer('JavaSerialize')
  }
  if ($util.isPickle(props.content)) {
    return changeViewer('Pickle')
  }
  if ($util.isMsgpack(props.content)) {
    return changeViewer('Msgpack')
  }
  if ($util.isBrotli(props.content)) {
    return changeViewer('Brotli')
  }
  if ($util.isGzip(props.content)) {
    return changeViewer('Gzip')
  }
  if ($util.isDeflate(props.content)) {
    return changeViewer('Deflate')
  }
  if ($util.isProtobuf(props.content)) {
    return changeViewer('Protobuf')
  }
  if ($util.isDeflateRaw(props.content)) {
    return changeViewer('DeflateRaw')
  }

  if (!contentVisible.value) {
    return changeViewer('Hex')
  }

  return changeViewer('Text')
}

const copyContent = () => {
  const content = (typeof viewer.value?.copyContent === 'function')
    ? viewer.value.copyContent()
    : props.content

  $util.copyToClipboard(content)
  $message.success(t('message.copy_success'))
}

const loadCustomViewers = () => {
  const formatters = storage.getCustomFormatter()

  if (!formatters || !formatters.length) {
    return
  }

  formatters.forEach((formatter) => {
    viewers.value.push({ value: 'ViewerCustom', text: formatter.name, type: 'custom' })
  })
}

const removeCustom = () => {
  viewers.value = viewers.value.filter(item => item.type !== 'custom')
}

watch(() => props.content, () => {
  if (autoFormated.value) {
    return
  }
  autoFormat()
  autoFormated.value = true
})

watch(selectedView, (viewer, previousViewer) => {
  if (viewer === 'addCustomFormatter') {
    selectedView.value = previousViewer || 'Text'
    addCustomFormatter()
    return
  }

  viewerComponent.value = ''
  nextTick(() => {
    viewerComponent.value = viewersMap.value[viewer]
  })
})

onMounted(() => {
  autoFormat()
  loadCustomViewers()
  bus.$on('refreshViewers', () => {
    removeCustom()
    loadCustomViewers()
  })
})

defineExpose({
  getContent,
  changeViewer,
})
</script>

<style type="text/css">
  .format-selector {
    width: 130px;
  }
  .format-selector .el-input__inner {
    height: 22px !important;
  }

  /*outline same with text viewer's .el-textarea__inner*/
  .text-formated-container {
    border: 1px solid #dcdfe6;
    padding: 5px 10px;
    border-radius: 4px;
  }
  .dark-mode .text-formated-container {
    border-color: #7f8ea5;
  }

  .format-viewer-container textarea {
    min-height: 194px !important;
    height: calc(100vh - 686px);
  }

  .collapse-container {
    height: 27px;
  }

  .collapse-container .collapse-btn {
    float: right;
    padding: 9px 0;
  }
  .formater-binary-tag {
    font-size: 80%;
  }
</style>
