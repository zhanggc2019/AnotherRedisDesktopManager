<template>
  <!-- setting dialog -->
  <el-dialog
    :title="$t('message.settings')"
    v-model="visible"
    custom-class="setting-main-dialog"
    >
    <el-form label-position="top" size="mini">

      <el-card :header="$t('message.ui_settings')" class="setting-card">
        <el-row :gutter="10" justify="space-between" type="flex" class="setting-row">
          <el-col :sm="12" :lg="5">
            <!-- theme select-->
            <el-form-item :label="$t('message.theme_select')">
              <el-select v-model='themeMode' @change="changeTheme">
                <el-option
                  v-for="(label, theme) in themeList"
                  :key="theme"
                  :value="theme"
                  :label="label">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :sm="12" :lg="7">
            <!-- language select -->
            <el-form-item :label="$t('message.select_lang')">
              <LanguageSelector></LanguageSelector>
            </el-form-item>
          </el-col>
          <el-col :sm="12" :lg="5">
            <!-- zoom page -->
            <el-form-item :label="$t('message.page_zoom')">
              <el-input-number
                size="mini"
                placeholder='1.0'
                :min=0.5
                :max=2.0
                :step=0.1
                :precision=1
                @change='changeZoom'
                v-model='form.zoomFactor'>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :sm="12" :lg="7">
            <!-- font-family -->
            <el-form-item :label="$t('message.font_family')">
              <template #label>
                <span>
                  {{ $t('message.font_family') }}
                  <el-popover
                    placement="top-start"
                    :title="$t('message.font_faq_title')"
                    trigger="hover">
                    <template #reference>
                      <ElementIcon name="el-icon-question"></ElementIcon>
                    </template>
                    <p v-html="$t('message.font_faq')"></p>
                  </el-popover>
                  <ElementIcon v-if="loadingFonts" name="el-icon-loading" spin></ElementIcon>
                </span>
              </template>
              <!-- font-family select -->
              <el-select v-model="form.fontFamily" @visible-change="getAllFonts" allow-create default-first-option
                         filterable multiple class="setting-font-select">
                <el-option
                  v-for="(font, index) in allFonts"
                  :key="index"
                  :label="font"
                  :value="font">
                  <!-- for better performance, do not display font-family -->
                  <!-- :style="{'font-family': font}"> -->
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card :header="$t('message.common_settings')" class="setting-card">
        <el-row :gutter="20" justify="space-between" type="flex" class="setting-row">
          <el-col :sm="12" :lg="12">
            <!-- keys per loading -->
            <el-form-item>
              <el-input-number
                size="mini"
                placeholder='500'
                :min=10
                :max=20000
                :step=50
                v-model='form.keysPageSize'>
              </el-input-number>&nbsp;
              <!-- load all switch -->
              <!-- <el-switch v-model='form.showLoadAllKeys'></el-switch>
              {{ $t('message.show_load_all_keys') }} -->

              <template #label>
                <span>
                  {{ $t('message.keys_per_loading') }}
                  <el-popover
                    :content="$t('message.keys_per_loading_tip')"
                    placement="top-start"
                    trigger="hover">
                    <template #reference>
                      <ElementIcon name="el-icon-question"></ElementIcon>
                    </template>
                  </el-popover>
                </span>
              </template>
            </el-form-item>
          </el-col>
          <el-col :sm="12" :lg="12">
            <!-- export connections -->
            <el-form-item :label="$t('message.config_connections')">
              <el-button :icon="resolveElIcon('el-icon-upload2')" @click="exportConnection">{{ $t('message.export') }}</el-button>
              <el-button :icon="resolveElIcon('el-icon-download')" @click="showImportDialog">{{ $t('message.import') }}</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card class="setting-card">
        <template #header>
          <div>
            {{$t('message.pre_version')}}
            <el-tag type="info">{{ appVersion }}</el-tag>
          </div>
        </template>
        <div class="current-version">
          <a href="###" @click.stop.prevent="showHotkeys">{{ $t('message.hotkey') }}</a>
          <a href="###" @click.stop.prevent="clearCache">{{ $t('message.clear_cache') }}</a>
          <a href="###" @click.stop.prevent="checkUpdate">{{ $t('message.check_update') }}</a>
          <a href="https://github.com/qishibo/AnotherRedisDesktopManager/releases">{{ $t('message.manual_update') }}</a>
          <a href="https://github.com/qishibo/AnotherRedisDesktopManager/">{{ $t('message.project_home') }}</a>
        </div>
      </el-card>
    </el-form>

    <!-- import file dialog -->
    <el-dialog
      width="400px"
      :title="$t('message.select_import_file')"
      v-model="importConnectionVisible"
      append-to-body>

      <el-upload
        ref="configUpload"
        :auto-upload="false"
        :multiple="false"
        action=""
        :limit="1"
        :on-change="loadConnectionFile"
        drag>
        <ElementIcon name="el-icon-upload"></ElementIcon>
        <div class="el-upload__text">{{ $t('message.put_file_here') }}</div>
      </el-upload>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importConnnection">{{ $t('el.messagebox.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">{{ $t('el.messagebox.cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings">{{ $t('el.messagebox.confirm') }}</el-button>
      </div>
    </template>

  </el-dialog>
</template>

<script type="text/javascript">
import storage from '@/storage.js';
import electron from '@/electron';
import LanguageSelector from '@/components/LanguageSelector';
import ElementIcon from '@/components/ElementIcon';
import { resolveElIcon } from '@/element-plus-icons';

export default {
  data() {
    return {
      visible: false,
      form: {
        fontFamily: '',
        zoomFactor: 1.0,
        keysPageSize: 500,
        showLoadAllKeys: false,
      },
      importConnectionVisible: false,
      connectionFileContent: '',
      appVersion: (new URL(window.location.href)).searchParams.get('version'),
      // electronVersion: process.versions.electron,
      allFonts: [],
      loadingFonts: false,
      themeMode: 'system',
    };
  },
  components: { LanguageSelector, ElementIcon },
  computed: {
    // themeList in computed to activate i18n
    themeList() {
      return {
        system: this.$t('message.theme_system'),
        light: this.$t('message.theme_light'),
        dark: this.$t('message.theme_dark'),
      };
    },
  },
  methods: {
    resolveElIcon,
    show() {
      this.visible = true;
    },
    restoreSettings() {
      const settings = storage.getSetting();
      this.form = {
        ...this.form,
        ...settings,
        fontFamily: Array.isArray(settings.fontFamily)
          ? settings.fontFamily
          : (settings.fontFamily ? [settings.fontFamily] : []),
        zoomFactor: Number(settings.zoomFactor || this.form.zoomFactor),
        keysPageSize: Number(settings.keysPageSize || this.form.keysPageSize),
      };

      // theme
      let { theme } = localStorage;
      if (!Object.keys(this.themeList).includes(theme)) {
        theme = 'system';
      }

      this.themeMode = theme;
    },
    saveSettings() {
      storage.saveSettings(this.form);

      this.visible = false;
      this.$bus.$emit('reloadSettings', Object.assign({}, this.form));
    },
    changeTheme() {
      localStorage.theme = this.themeMode;
      globalChangeTheme(this.themeMode);
    },
    changeZoom() {
      let { zoomFactor } = this.form;

      zoomFactor = zoomFactor || 1.0;
      electron.setZoomFactor(zoomFactor);
    },
    showImportDialog() {
      this.importConnectionVisible = true;
    },
    loadConnectionFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.connectionFileContent = event.target.result;
      };
      reader.readAsText(file.raw);
    },
    importConnnection() {
      this.importConnectionVisible = false;
      let config = this.$util.base64Decode(this.connectionFileContent);

      if (!config) {
        return;
      }

      config = JSON.parse(config);
      // remove all connections first
      storage.setConnections({});
      // close all connections
      this.$bus.$emit('closeConnection');
      this.$bus.$emit('refreshConnections');

      for (const line of config) {
        storage.addConnection(line);
      }

      this.$nextTick(() => {
        this.$bus.$emit('refreshConnections');
      });

      this.$message.success({
        message: this.$t('message.import_success'),
        duration: 1000,
      });
    },
    exportConnection() {
      let connections = storage.getConnections(true);
      connections = this.$util.base64Encode(JSON.stringify(connections));
      this.$util.createAndDownloadFile('connections.ano', connections);
      this.visible = false;
    },
    checkUpdate() {
      this.$message.info({
        message: `${this.$t('message.update_checking')}`,
        duration: 1500,
      });

      this.$bus.$emit('update-check', true);
    },
    bindGetAllFonts() {
      this.removeFontListener = electron.on('send-all-fonts', (fonts) => {
        fonts.unshift('Default Initial');

        this.allFonts = [...new Set(fonts)];
        this.loadingFonts = false;
      });
    },
    getAllFonts() {
      if (this.allFonts.length === 0) {
        this.loadingFonts = true;
        electron.send('get-all-fonts');
      }
    },
    clearCache() {
      this.$confirm(this.$t('message.clear_cache_tip')).then(() => {
        localStorage.clear();
        this.$message.success(this.$t('message.delete_success'));
        window.location.reload();
      }).catch((e) => {
      });
    },
    showHotkeys() {
      this.$parent.$refs.hotKeysDialog.show();
    },
  },
  mounted() {
    this.restoreSettings();
    this.bindGetAllFonts();
  },
  beforeUnmount() {
    this.removeFontListener && this.removeFontListener();
  },
};
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
