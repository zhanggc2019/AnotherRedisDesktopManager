<template>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElNotification, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import electron from '@/electron'
import bus from '@/bus'

const { t } = useI18n()

const manual = ref(false)
const updateChecking = ref(false)
const downloadProcessShow = ref(false)
let unbindListeners = null

const setProgressBar = (percent) => {
  const progress = document.getElementById('ardm-download-progress')
  if (downloadProcessShow.value && progress) {
    progress.textContent = `${percent}%`
  }
}

const resetDownloadProcess = () => {
  updateChecking.value = false
  downloadProcessShow.value = false
}

const bindRendererListener = () => {
  // already bind listening
  if (unbindListeners) {
    return
  }

  unbindListeners = [
    electron.on('update-available', (arg) => {
      ElNotification.closeAll()

      const ignoreUpdateKey = `IgnoreUpdateVersion_${arg.version}`
      // version ignored
      if (!manual.value && localStorage[ignoreUpdateKey]) {
        return resetDownloadProcess()
      }

      ElMessageBox.confirm(arg.releaseNotes, {
        title: `${t('message.update_available')}: ${arg.version}`,
        confirmButtonText: t('message.begin_update'),
        cancelButtonText: t('message.ignore_this_version'),
        dangerouslyUseHTMLString: true,
        duration: 0,
      }).then(() => {
        // update btn clicked
        manual.value = true
        electron.send('continue-update')
      }).catch(() => {
        // ignore this version
        localStorage[ignoreUpdateKey] = true
        resetDownloadProcess()
      })
    }),
    electron.on('update-not-available', () => {
      ElNotification.closeAll()
      resetDownloadProcess()

      // latest version
      if (manual.value) {
        ElNotification.success({
          title: t('message.update_not_available'),
          duration: 2000,
        })
      }
    }),
    electron.on('update-error', (arg) => {
      resetDownloadProcess()

      let message = ''
      const error = (arg.code ? arg.code : arg.message).toLowerCase()

      // auto update check at app init
      if (!manual.value || !error) {
        return
      }

      // mac not support auto update
      if (error.includes('zip') && error.includes('file')) {
        message = t('message.mac_not_support_auto_update')
      }
      // err_internet_disconnected err_name_not_resolved err_connection_refused
      else {
        message = `${t('message.update_error')}: ${error}`
      }

      ElNotification.error({
        message,
        duration: 0,
        dangerouslyUseHTMLString: true,
      })
    }),
    electron.on('download-progress', (arg) => {
      if (!downloadProcessShow.value) {
        ElNotification({
          message: '<div id="ardm-download-progress">0%</div>',
          duration: 0,
          customClass: 'download-progress-container',
          dangerouslyUseHTMLString: true,
        })

        downloadProcessShow.value = true
      }

      setProgressBar(Math.floor(arg.percent))
    }),
    electron.on('update-downloaded', () => {
      setProgressBar(100)
      resetDownloadProcess()
      ElNotification.success({
        title: t('message.update_downloaded'),
        duration: 0,
      })
    }),
  ]
}

bus.$on('update-check', (manualCheck = false) => {
  manual.value = manualCheck

  // update checking running...
  if (updateChecking.value) {
    return
  }

  updateChecking.value = true
  ElNotification.closeAll()

  electron.send('update-check')
})

onMounted(() => {
  bindRendererListener()
})

onBeforeUnmount(() => {
  if (unbindListeners) {
    unbindListeners.forEach(unbind => unbind())
    unbindListeners = null
  }
})
</script>

<style type="text/css">
  .download-progress-container .el-progress {
    width: 280px;
  }
</style>
