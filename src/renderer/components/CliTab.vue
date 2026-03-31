<template>
  <div class="tab-cli">
    <!-- result container -->
    <CliContent
      ref="editor"
      :content="contentStr"
    />

    <!-- input params -->
    <el-autocomplete
      ref="cliParams"
      v-model="params"
      class="input-suggestion"
      autocomplete="off"
      :debounce="10"
      :disabled="subscribeMode || monitorMode"
      :fetch-suggestions="inputSuggestion"
      :placeholder="$t('message.enter_to_exec')"
      :select-when-unmatched="true"
      :trigger-on-focus="false"
      popper-class="cli-console-suggestion"
      @select="cliParams?.focus()"
      @keyup.enter="consoleExec"
      @keyup.up="searchUp"
      @keyup.down="searchDown"
    />

    <!-- stop sub\monitor btn -->
    <el-button
      v-if="subscribeMode"
      type="danger"
      class="stop-subscribe"
      @click="stopSubscribe"
    >
      Stop Subscribe
    </el-button>
    <el-button
      v-else-if="monitorMode"
      type="danger"
      class="stop-subscribe"
      @click="stopMonitor"
    >
      Stop Monitor
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import commands from '@/commands'
import splitargs from '@qii404/redis-splitargs'
import electron from '@/electron'
import bus from '@/bus'
import { getStorageKeyByName } from '@/storage'
import { bufToString } from '@/util'
import CliContent from '@/components/CliContent.vue'

const { allCMD } = commands

const props = defineProps({
  client: Object,
  hotKeyScope: String,
})

const { t } = useI18n()

const params = ref('')
const content = ref([])
const historyIndex = ref(0)
const inputSuggestionItems = ref([])
const multiQueue = ref(null)
const subscribeMode = ref(false)
const monitorMode = ref(false)
const maxHistory = 2000
const editor = ref(null)
const cliParams = ref(null)

let anoClient = null
let cb = null
let monitorInstance = null
let removeClosingWindowListener = null
let shortcut = null

const paramsTrim = computed(() => params.value.replace(/^\s+|\s+$/g, ''))

const paramsArr = computed(() => {
  try {
    const arr = splitargs(paramsTrim.value, true)
    arr[0] = arr[0].toString().toLowerCase()
    return arr
  } catch (e) {
    return [paramsTrim.value]
  }
})

const contentStr = computed(() => {
  if (content.value.length > maxHistory) {
    content.value.splice(0, content.value.length - maxHistory)
  }
  return `${content.value.join('\n')}\n`
})

const initShow = () => {
  if (!props.client) {
    return
  }

  anoClient = props.client.duplicate()
  bindSubscribeMessage()
  scrollToBottom('> connecting......')

  anoClient.on('ready', () => {
    if (!anoClient.cliInited) {
      initCliContent()
    }
    anoClient.cliInited = true
  })

  nextTick(() => {
    cliParams.value?.focus()
  })
}

const initCliContent = () => {
  scrollToBottom(`> ${anoClient.options.connectionName} connected!`)
}

const tabClick = () => {
  nextTick(() => {
    cliParams.value?.focus()
  })
}

const inputSuggestion = (input, cb) => {
  cb = cb
  if (!paramsTrim.value) {
    cb([])
    return
  }

  let items = inputSuggestionItems.value.filter(item => 
    item.toLowerCase().indexOf(input.toLowerCase()) !== -1
  )

  items = addCMDTips(items)
  const suggestions = [...new Set(items)].map(item => ({ value: item }))
  cb(suggestions)
}

const addCMDTips = (items = []) => {
  const cmd = paramsArr.value[0].toUpperCase()

  if (!cmd) {
    return items
  }

  for (const key in allCMD) {
    if (key.startsWith(cmd)) {
      const tip = allCMD[key]
      if (typeof tip === 'string') {
        items.unshift(tip)
      } else {
        items = tip.concat(items)
      }
    }
  }

  return items
}

const bindSubscribeMessage = () => {
  anoClient.on('message', (channel, message) => {
    scrollToBottom(`\n${channel}\n${message}`)
  })

  anoClient.on('pmessage', (pattern, channel, message) => {
    scrollToBottom(`\n${pattern}\n${channel}\n${message}`)
  })
}

const stopSubscribe = () => {
  subscribeMode.value = false
  const subSet = anoClient.condition.subscriber.set

  if (!subSet) {
    return
  }

  Object.keys(subSet.subscribe).length && anoClient.unsubscribe()
  Object.keys(subSet.psubscribe).length && anoClient.punsubscribe()
}

const stopMonitor = () => {
  monitorMode.value = false
  monitorInstance && monitorInstance.disconnect()
}

const consoleExec = () => {
  const paramValue = paramsTrim.value
  const arr = paramsArr.value

  params.value = ''
  content.value.push(`> ${paramValue}`)

  appendToHistory(paramValue)

  if (arr[0] === 'exit' || arr[0] === 'quit') {
    return bus.$emit('removePreTab')
  }

  if (arr[0] === 'clear') {
    return content.value = []
  }

  if (arr[0] === 'help') {
    return scrollToBottom('Input your command and select from tips')
  }

  if (arr[0] === 'multi') {
    multiQueue.value = []
    return scrollToBottom('OK')
  }

  if (arr[0] === 'discard') {
    if (!Array.isArray(multiQueue.value)) {
      return scrollToBottom('(error) ERR DISCARD without MULTI')
    }
    multiQueue.value = null
    return scrollToBottom('OK')
  }

  if (arr[0] === 'exec') {
    if (!Array.isArray(multiQueue.value)) {
      return scrollToBottom('(error) ERR EXEC without MULTI')
    }

    anoClient.multi(multiQueue.value).execBuffer((err, reply) => {
      if (err) {
        content.value.push(`${err}`)
      } else {
        content.value.push(resolveResult(reply).trim())
      }
      scrollToBottom()
    })

    return multiQueue.value = null
  }

  if (Array.isArray(multiQueue.value)) {
    multiQueue.value.push(['callBuffer', arr[0], ...arr.slice(1)])
    return scrollToBottom('QUEUED')
  }

  if (/subscribe/.test(arr[0])) {
    subscribeMode.value = true
  }

  if (arr[0] === 'monitor') {
    anoClient.monitor().then((monitor) => {
      monitorMode.value = true
      scrollToBottom('OK')
      monitorInstance = monitor
      monitorInstance.on('monitor', (time, args, source, database) => {
        scrollToBottom(`${time} [${database} ${source}] ${args.join(' ')}`)
      })
    })
    return
  }

  const promise = anoClient.callBuffer(arr[0], arr.slice(1))

  promise.then((reply) => {
    content.value.push(resolveResult(reply).trim())
    execFinished(arr)
    scrollToBottom()
  }).catch((err) => {
    multiQueue.value = null
    scrollToBottom(err.message)
  })
}

const execFinished = (params) => {
  const operate = params[0].toLowerCase()

  if (operate === 'select' && !isNaN(params[1])) {
    bus.$emit('changeDb', anoClient, params[1])
  }

  if (['hmset', 'hset', 'lpush', 'rpush', 'set', 'sadd', 'zadd', 'xadd', 'json.set'].includes(operate)) {
    bus.$emit('refreshKeyList', props.client, Buffer.from(params[1]), 'add')
  }
  if (['del'].includes(operate)) {
    bus.$emit('refreshKeyList', props.client, Buffer.from(params[1]), 'del')
  }
}

const scrollToBottom = (append = '') => {
  if (append) {
    content.value.push(append)
  }

  nextTick(() => {
    if (editor.value) {
      return editor.value.scrollToBottom()
    }
  })
}

const appendToHistory = (paramValue) => {
  if (!paramValue || !paramValue.length) {
    return
  }

  if (inputSuggestionItems.value[inputSuggestionItems.value.length - 1] !== paramValue) {
    inputSuggestionItems.value.push(paramValue)
  }

  historyIndex.value = inputSuggestionItems.value.length
}

const resolveResult = (result) => {
  let append = ''

  if (typeof result === 'object' && result !== null && !Buffer.isBuffer(result)) {
    const isArray = Array.isArray(result)

    for (const i in result) {
      if (typeof result[i] === 'object' && result[i] !== null && !Buffer.isBuffer(result[i])) {
        if (result[i][0] === null) {
          append += resolveResult(result[i][1])
        } else {
          append += resolveResult(result[i])
        }
      } else {
        append += `${(isArray ? '' : (`${bufToString(i)}\n`))
                  + bufToString(result[i])}\n`
      }
    }
  } else {
    append = `${bufToString(result)}\n`
  }

  return append
}

const searchUp = () => {
  if (suggesttionShowing()) {
    return
  }

  if (--historyIndex.value < 0) {
    historyIndex.value = 0
  }

  if (!inputSuggestionItems.value[historyIndex.value]) {
    params.value = ''
    return
  }

  params.value = inputSuggestionItems.value[historyIndex.value]
}

const searchDown = () => {
  if (suggesttionShowing()) {
    return
  }

  if (++historyIndex.value > inputSuggestionItems.value.length) {
    historyIndex.value = inputSuggestionItems.value.length
  }

  if (!inputSuggestionItems.value[historyIndex.value]) {
    params.value = ''
    return
  }

  params.value = inputSuggestionItems.value[historyIndex.value]
}

const suggesttionShowing = () => {
  const ele = document.querySelector('.cli-console-suggestion')
  return ele && ele.style.display !== 'none'
}

const initShortcut = () => {
  shortcut = window.$shortcut
  shortcut.bind('ctrl+l, ⌘+l', props.hotKeyScope, () => {
    content.value = []
  })
}

const initHistoryTips = () => {
  const key = getStorageKeyByName('cli_tip', props.client.options.connectionName)
  const tips = localStorage.getItem(key)

  inputSuggestionItems.value = tips ? JSON.parse(tips) : []

  removeClosingWindowListener = electron.on('closingWindow', () => {
    storeCommandTips()
  })
}

const storeCommandTips = () => {
  const key = getStorageKeyByName('cli_tip', props.client.options.connectionName)
  localStorage.setItem(key, JSON.stringify(inputSuggestionItems.value.slice(-200)))
}

bus.$on('changeDb', (client, dbIndex) => {
  if (!anoClient || client.options.connectionName !== anoClient.options.connectionName) {
    return
  }

  if (anoClient.condition.select === dbIndex) {
    return
  }

  anoClient.select(dbIndex)
})

onMounted(() => {
  initShow()
  initShortcut()
  initHistoryTips()
})

onBeforeUnmount(() => {
  anoClient && anoClient.quit && anoClient.quit()
  shortcut && shortcut.deleteScope(props.hotKeyScope)
  removeClosingWindowListener && removeClosingWindowListener()
  storeCommandTips()
})

defineExpose({
  tabClick,
})
</script>

<style type="text/css">
  .tab-cli .input-suggestion {
    width: 100%;
    margin-top: 2px;
  }

  .tab-cli .input-suggestion input {
    color: #babdc1;
    background: #263238;
    border-top: 0px;
    border-radius: 0 0 4px 4px;
  }
  .dark-mode .tab-cli .input-suggestion input  {
    color: #f7f7f7;
    background: #324148;
  }

  .tab-cli .input-suggestion input::-webkit-input-placeholder {
    color: #8a8b8e;
  }

  .tab-cli .stop-subscribe {
    position: fixed;
    right: 34px;
    bottom: 68px;
  }
</style>
