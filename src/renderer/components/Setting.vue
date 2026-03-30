<template>
  <!-- setting dialog -->
  <el-dialog
    v-model="visible"
    :title="t('message.settings')"
    custom-class="setting-main-dialog"
  >
    <el-form
      label-position="top"
      size="mini"
    >
      <el-card
        :header="t('message.ui_settings')"
        class="setting-card"
      >
        <el-row
          :gutter="10"
          justify="space-between"
          type="flex"
          class="setting-row"
        >
          <el-col
            :sm="12"
            :lg="5"
          >
            <!-- theme select-->
            <el-form-item :label="t('message.theme_select')">
              <el-select
                v-model="themeMode"
                @change="changeTheme"
              >
                <el-option
                  v-for="(label, theme) in themeList"
                  :key="theme"
                  :value="theme"
                  :label="label"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col
            :sm="12"
            :lg="7"
          >
            <!-- language select -->
            <el-form-item :label="t('message.select_lang')">
              <LanguageSelector />
            </el-form-item>
          </el-col>
          <el-col
            :sm="12"
            :lg="5"
          >
            <!-- zoom page -->
            <el-form-item :label="t('message.page_zoom')">
              <el-input-number
                v-model="form.zoomFactor"
                size="mini"
                placeholder="1.0"
                :min="0.5"
                :max="2.0"
                :step="0.1"
                :precision="1"
                @change="changeZoom"
              />
            </el-form-item>
          </el-col>
          <el-col
            :sm="12"
            :lg="7"
          >
            <!-- font-family -->
            <el-form-item :label="t('message.font_family')">
              <template #label>
                <span>
                  {{ t('message.font_family') }}
                  <el-popover
                    placement="top-start"
                    :title="t('message.font_faq_title')"
                    trigger="hover"
                  >
                    <template #reference>
                      <ElementIcon name="el-icon-question" />
                    </template>
                    <p v-html="t('message.font_faq')" />
                  </el-popover>
                  <ElementIcon
                    v-if="loadingFonts"
                    name="el-icon-loading"
                    spin
                  />
                </span>
              </template>
              <!-- font-family select -->
              <el-select
                v-model="form.fontFamily"
                allow-create
                default-first-option
                filterable
                multiple
                class="setting-font-select"
                @visible-change="getAllFonts"
              >
                <el-option
                  v-for="(font, index) in allFonts"
                  :key="index"
                  :label="font"
                  :value="font"
                >
                  <!-- for better performance, do not display font-family -->
                  <!-- :style="{'font-family': font}"> -->
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card
        :header="t('message.common_settings')"
        class="setting-card"
      >
        <el-row
          :gutter="20"
          justify="space-between"
          type="flex"
          class="setting-row"
        >
          <el-col
            :sm="12"
            :lg="12"
          >
            <!-- keys per loading -->
            <el-form-item>
              <el-input-number
                v-model="form.keysPageSize"
                size="mini"
                placeholder="500"
                :min="10"
                :max="20000"
                :step="50"
              />&nbsp;
              <!-- load all switch -->
              <!-- <el-switch v-model='form.showLoadAllKeys'></el-switch>
              {{ t('message.show_load_all_keys') }} -->

              <template #label>
                <span>
                  {{ t('message.keys_per_loading') }}
                  <el-popover
                    :content="t('message.keys_per_loading_tip')"
                    placement="top-start"
                    trigger="hover"
                  >
                    <template #reference>
                      <ElementIcon name="el-icon-question" />
                    </template>
                  </el-popover>
                </span>
              </template>
            </el-form-item>
          </el-col>
          <el-col
            :sm="12"
            :lg="12"
          >
            <!-- export connections -->
            <el-form-item :label="t('message.config_connections')">
              <el-button
                :icon="resolveElIcon('el-icon-upload2')"
                @click="exportConnection"
              >
                {{ t('message.export') }}
              </el-button>
              <el-button
                :icon="resolveElIcon('el-icon-download')"
                @click="showImportDialog"
              >
                {{ t('message.import') }}
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card class="setting-card">
        <template #header>
          <div>
            {{ t('message.pre_version') }}
            <el-tag type="info">
              {{ appVersion }}
            </el-tag>
          </div>
        </template>
        <div class="current-version">
          <a
            href="###"
            @click.stop.prevent="showHotkeys"
          >{{ t('message.hotkey') }}</a>
          <a
            href="###"
            @click.stop.prevent="clearCache"
          >{{ t('message.clear_cache') }}</a>
          <a
            href="###"
            @click.stop.prevent="checkUpdate"
          >{{ t('message.check_update') }}</a>
          <a href="https://github.com/qishibo/AnotherRedisDesktopManager/releases">{{ t('message.manual_update') }}</a>
          <a href="https://github.com/qishibo/AnotherRedisDesktopManager/">{{ t('message.project_home') }}</a>
        </div>
      </el-card>
    </el-form>

    <!-- import file dialog -->
    <el-dialog
      v-model="importConnectionVisible"
      width="400px"
      :title="t('message.select_import_file')"
      append-to-body
    >
      <el-upload
        ref="configUpload"
        :auto-upload="false"
        :multiple="false"
        action=""
        :limit="1"
        :on-change="loadConnectionFile"
        drag
      >
        <ElementIcon name="el-icon-upload" />
        <div class="el-upload__text">
          {{ t('message.put_file_here') }}
        </div>
      </el-upload>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importConnnection">
            {{ t('el.messagebox.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">
          {{ t('el.messagebox.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="saveSettings"
        >
          {{ t('el.messagebox.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted, nextTick,
} from 'vue';
import { useI18n } from '@/composables/useI18n';
import storage from '@/storage.js';
import electron from '@/electron';
import bus from '@/bus';
import util from '@/util';
import LanguageSelector from '@/components/LanguageSelector.vue';
import ElementIcon from '@/components/ElementIcon.vue';
import { resolveElIcon } from '@/element-plus-icons';

const visible = ref(false);
const form = ref({
  fontFamily: '',
  zoomFactor: 1.0,
  keysPageSize: 500,
  showLoadAllKeys: false,
});
const importConnectionVisible = ref(false);
const connectionFileContent = ref('');
const appVersion = (new URL(window.location.href)).searchParams.get('version');
const allFonts = ref([]);
const loadingFonts = ref(false);
const themeMode = ref('system');
let removeFontListener = null;

const { getTranslate } = useI18n();
const t = getTranslate();

// themeList computed to activate i18n
const themeList = computed(() => ({
  system: t('message.theme_system'),
  light: t('message.theme_light'),
  dark: t('message.theme_dark'),
}));

function show() {
  visible.value = true;
}

function restoreSettings() {
  const settings = storage.getSetting();
  form.value = {
    ...form.value,
    ...settings,
    fontFamily: Array.isArray(settings.fontFamily)
      ? settings.fontFamily
      : (settings.fontFamily ? [settings.fontFamily] : []),
    zoomFactor: Number(settings.zoomFactor || form.value.zoomFactor),
    keysPageSize: Number(settings.keysPageSize || form.value.keysPageSize),
  };

  // theme
  let { theme } = localStorage;
  if (!Object.keys(themeList.value).includes(theme)) {
    theme = 'system';
  }

  themeMode.value = theme;
}

function saveSettings() {
  storage.saveSettings(form.value);

  visible.value = false;
  bus.$emit('reloadSettings', Object.assign({}, form.value));
}

function changeTheme() {
  localStorage.theme = themeMode.value;
  bus.$emit('changeTheme', themeMode.value);
}

function changeZoom() {
  let { zoomFactor } = form.value;

  zoomFactor = zoomFactor || 1.0;
  electron.setZoomFactor(zoomFactor);
}

function showImportDialog() {
  importConnectionVisible.value = true;
}

function loadConnectionFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    connectionFileContent.value = event.target.result;
  };
  reader.readAsText(file.raw);
}

function importConnnection() {
  importConnectionVisible.value = false;
  let config = util.base64Decode(connectionFileContent.value);

  if (!config) {
    return;
  }

  config = JSON.parse(config);
  // remove all connections first
  storage.setConnections({});
  // close all connections
  bus.$emit('closeConnection');
  bus.$emit('refreshConnections');

  for (const line of config) {
    storage.addConnection(line);
  }

  nextTick(() => {
    bus.$emit('refreshConnections');
  });

  window.$message.success({
    message: t('message.import_success'),
    duration: 1000,
  });
}

function exportConnection() {
  let connections = storage.getConnections(true);
  connections = util.base64Encode(JSON.stringify(connections));
  util.createAndDownloadFile('connections.ano', connections);
  visible.value = false;
}

function checkUpdate() {
  window.$message.info({
    message: `${t('message.update_checking')}`,
    duration: 1500,
  });

  bus.$emit('update-check', true);
}

function bindGetAllFonts() {
  removeFontListener = electron.on('send-all-fonts', (fonts) => {
    fonts.unshift('Default Initial');

    allFonts.value = [...new Set(fonts)];
    loadingFonts.value = false;
  });
}

function getAllFonts() {
  if (allFonts.value.length === 0) {
    loadingFonts.value = true;
    electron.send('get-all-fonts');
  }
}

function clearCache() {
  window.$confirm(t('message.clear_cache_tip')).then(() => {
    localStorage.clear();
    window.$message.success(t('message.delete_success'));
    window.location.reload();
  }).catch((e) => {
  });
}

function showHotkeys() {
  // This will be handled by parent component reference
  const hotKeysDialog = document.querySelector('[data-hotkeys-dialog]');
  if (hotKeysDialog && hotKeysDialog.__vue__) {
    hotKeysDialog.__vue__.show();
  }
}

onMounted(() => {
  restoreSettings();
  bindGetAllFonts();
});

onUnmounted(() => {
  removeFontListener && removeFontListener();
});

defineExpose({
  show,
});
</script>

<style type="text/css">
.setting-main-dialog {
  width: 80%;
  max-width: 900px;
  margin-top: 7vh !important;
}

.dark-mode .el-upload-dragger {
  background: inherit;
}

.setting-main-dialog .current-version a {
  color: grey;
  font-size: 95%;
}

.setting-main-dialog .setting-card {
  margin-bottom: 8px;
}
.setting-main-dialog .setting-card .el-card__header {
  font-size: 105%;
  font-weight: bold;
}

.setting-main-dialog .setting-card .setting-row {
  flex-wrap: wrap;
  align-items: flex-start;
}

.setting-main-dialog .setting-card .setting-row .el-col {
  margin-bottom: 10px;
}

.setting-main-dialog .el-select,
.setting-main-dialog .el-input-number {
  width: 100%;
}

.setting-main-dialog .current-version {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* add height: fix el-select jitter when multiple*/
.setting-main-dialog .setting-card .setting-row .setting-font-select .el-select__tags .el-tag {
  height: 21px;
  max-width: 98%;
}

/*label style inside el-select multiple*/
.setting-main-dialog .setting-card .setting-row .setting-font-select .el-select__tags .el-tag .el-select__tags-text {
  display: inline-block;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/*fix close icon vertical align*/
.setting-main-dialog .setting-card .setting-row .setting-font-select .el-select__tags .el-tag .el-tag__close {
  vertical-align: super;
}
</style>
