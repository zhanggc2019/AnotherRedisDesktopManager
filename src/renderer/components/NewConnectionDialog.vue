<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :append-to-body="true"
    :close-on-click-modal="false"
    custom-class="new-connection-dialog"
    width="960px"
  >
    <!-- redis connection form -->
    <el-form
      :label-position="labelPosition"
      label-width="90px"
    >
      <el-row :gutter="20">
        <!-- left col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item
            :label="t('message.host')"
            required
          >
            <el-input
              v-model="connection.host"
              autocomplete="off"
              placeholder="127.0.0.1"
            />
          </el-form-item>

          <el-form-item :label="t('message.password')">
            <InputPassword
              v-model="connection.auth"
              :hidepass="editMode"
              placeholder="Auth"
            />
          </el-form-item>

          <el-form-item :label="t('message.connection_name')">
            <el-input
              v-model="connection.name"
              autocomplete="off"
            />
          </el-form-item>
        </el-col>

        <!-- right col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item
            :label="t('message.port')"
            required
          >
            <el-input
              v-model="connection.port"
              type="number"
              autocomplete="off"
              placeholder="6379"
            />
          </el-form-item>

          <el-form-item :label="t('message.username')">
            <el-input
              v-model="connection.username"
              placeholder="ACL in Redis >= 6.0"
              autocomplete="off"
            />
          </el-form-item>

          <el-form-item :label="t('message.separator')">
            <el-tooltip effect="dark">
              <template #content>
                <div>{{ t('message.separator_tip') }}</div>
              </template>
              <el-input
                v-model="connection.separator"
                autocomplete="off"
                placeholder="Empty To Disable Tree View"
              />
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- other operation -->
      <el-form-item label="">
        <el-checkbox v-model="sshOptionsShow">
          SSH
        </el-checkbox>
        <el-checkbox v-model="sslOptionsShow">
          SSL
        </el-checkbox>
        <el-checkbox v-model="sentinelOptionsShow">
          Sentinel
          <el-popover trigger="hover">
            <template #reference>
              <ElementIcon name="el-icon-question" />
            </template>
            {{ t('message.sentinel_faq') }}
          </el-popover>
        </el-checkbox>
        <el-checkbox v-model="connection.cluster">
          Cluster
          <el-popover trigger="hover">
            <template #reference>
              <ElementIcon name="el-icon-question" />
            </template>
            {{ t('message.cluster_faq') }}
          </el-popover>
        </el-checkbox>
        <el-checkbox v-model="connection.connectionReadOnly">
          Readonly
          <el-popover trigger="hover">
            <template #reference>
              <ElementIcon name="el-icon-question" />
            </template>
            {{ t('message.connection_readonly') }}
          </el-popover>
        </el-checkbox>
      </el-form-item>
    </el-form>

    <!-- ssh connection form -->
    <el-form
      v-if="sshOptionsShow"
      v-show="sshOptionsShow"
      label-position="top"
      label-width="90px"
    >
      <fieldset>
        <legend>SSH Tunnel</legend>
      </fieldset>

      <el-row :gutter="20">
        <!-- left col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item
            :label="t('message.host')"
            required
          >
            <el-input
              v-model="connection.sshOptions.host"
              autocomplete="off"
            />
          </el-form-item>

          <el-form-item
            :label="t('message.username')"
            required
          >
            <el-input
              v-model="connection.sshOptions.username"
              autocomplete="off"
            />
          </el-form-item>

          <el-form-item :label="t('message.private_key')">
            <FileInput
              :file="connection.sshOptions.privatekey"
              :bookmark="connection.sshOptions.privatekeybookmark"
              placeholder="SSH Private Key"
              @update:file="connection.sshOptions.privatekey = $event"
              @update:bookmark="connection.sshOptions.privatekeybookmark = $event"
            />
          </el-form-item>

          <el-form-item label="Passphrase">
            <InputPassword
              v-model="connection.sshOptions.passphrase"
              placeholder="Passphrase for Private Key"
            />
          </el-form-item>
        </el-col>

        <!-- right col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item
            :label="t('message.port')"
            required
          >
            <el-input
              v-model="connection.sshOptions.port"
              type="number"
              autocomplete="off"
            />
          </el-form-item>

          <el-form-item :label="t('message.password')">
            <InputPassword
              v-model="connection.sshOptions.password"
              placeholder="SSH Password"
            />
          </el-form-item>

          <el-form-item :label="t('message.timeout')">
            <el-input
              v-model="connection.sshOptions.timeout"
              type="number"
              autocomplete="off"
              placeholder="SSH Timeout (Seconds)"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- SSL connection form -->
    <el-form
      v-if="sslOptionsShow"
      v-show="sslOptionsShow"
      label-position="top"
      label-width="90px"
    >
      <fieldset>
        <legend>SSL</legend>
      </fieldset>

      <el-row :gutter="20">
        <!-- left col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item :label="t('message.private_key')">
            <FileInput
              :file="connection.sslOptions.key"
              :bookmark="connection.sslOptions.keybookmark"
              placeholder="SSL Private Key Pem (key)"
              @update:file="connection.sslOptions.key = $event"
              @update:bookmark="connection.sslOptions.keybookmark = $event"
            />
          </el-form-item>

          <el-form-item :label="t('message.authority')">
            <FileInput
              :file="connection.sslOptions.ca"
              :bookmark="connection.sslOptions.cabookmark"
              placeholder="SSL Certificate Authority (CA)"
              @update:file="connection.sslOptions.ca = $event"
              @update:bookmark="connection.sslOptions.cabookmark = $event"
            />
          </el-form-item>
        </el-col>

        <!-- right col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item :label="t('message.public_key')">
            <FileInput
              :file="connection.sslOptions.cert"
              :bookmark="connection.sslOptions.certbookmark"
              placeholder="SSL Public Key Pem (cert)"
              @update:file="connection.sslOptions.cert = $event"
              @update:bookmark="connection.sslOptions.certbookmark = $event"
            />
          </el-form-item>

          <!-- SNI -->
          <el-form-item label="SNI">
            <el-input
              v-model="connection.sslOptions.servername"
              autocomplete="off"
              placeholder="SNI Servername"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- Sentinel connection form -->
    <el-form
      v-if="sentinelOptionsShow"
      v-show="sentinelOptionsShow"
      label-position="top"
      label-width="90px"
    >
      <fieldset>
        <legend>Sentinel</legend>
      </fieldset>

      <el-row :gutter="20">
        <!-- left col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item :label="t('message.redis_node_password')">
            <InputPassword
              v-model="connection.sentinelOptions.nodePassword"
              placeholder="Redis Node Password"
            />
          </el-form-item>
        </el-col>

        <!-- right col -->
        <el-col
          :xs="24"
          :sm="24"
          :md="12"
        >
          <el-form-item
            :label="t('message.master_group_name')"
            required
          >
            <el-input
              v-model="connection.sentinelOptions.masterName"
              autocomplete="off"
              placeholder="Master Group Name"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">
          {{ t('el.messagebox.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="editConnection"
        >
          {{ t('el.messagebox.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from '@/composables/useI18n';
import storage from '@/storage';
import FileInput from '@/components/FileInput.vue';
import InputPassword from '@/components/InputPassword.vue';
import ElementIcon from '@/components/ElementIcon.vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({}),
  },
  editMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['edit-connection-finished']);

const { getTranslate } = useI18n();
const t = getTranslate();

const dialogVisible = ref(false);
const labelPosition = ref('top');
const connection = ref({
  host: '',
  port: '',
  auth: '',
  username: '',
  name: '',
  separator: ':',
  cluster: false,
  connectionReadOnly: false,
  sshOptions: {
    host: '',
    port: 22,
    username: '',
    password: '',
    privatekey: '',
    passphrase: '',
    timeout: 30,
  },
  sslOptions: {
    key: '',
    cert: '',
    ca: '',
    servername: '',
  },
  sentinelOptions: {
    masterName: 'mymaster',
    nodePassword: '',
  },
});
const connectionEmpty = ref({});
const sshOptionsShow = ref(false);
const sslOptionsShow = ref(false);
const sentinelOptionsShow = ref(false);

const dialogTitle = computed(() => (props.editMode ? t('message.edit_connection') : t('message.new_connection')));

function show() {
  dialogVisible.value = true;
  resetFields();
}

function resetFields() {
  // edit connection mode
  if (props.editMode) {
    sshOptionsShow.value = !!props.config.sshOptions;
    sslOptionsShow.value = !!props.config.sslOptions;
    sentinelOptionsShow.value = !!props.config.sentinelOptions;
    // recovery connection before edit
    const conn = Object.assign({}, connectionEmpty.value, props.config);
    connection.value = JSON.parse(JSON.stringify(conn));
  }
  // new connection mode
  else {
    sshOptionsShow.value = false;
    sslOptionsShow.value = false;
    sentinelOptionsShow.value = false;
    connection.value = JSON.parse(JSON.stringify(connectionEmpty.value));
  }
}

function editConnection() {
  const config = JSON.parse(JSON.stringify(connection.value));

  if (sentinelOptionsShow.value && config.cluster) {
    ElMessage.error(t('message.sentinel_cluster_conflict'));
    return;
  }

  !config.host && (config.host = '127.0.0.1');
  !config.port && (config.port = 6379);

  if (!sshOptionsShow.value || !config.sshOptions.host) {
    delete config.sshOptions;
  }

  if (!sslOptionsShow.value) {
    delete config.sslOptions;
  }

  if (!sentinelOptionsShow.value || !config.sentinelOptions.masterName) {
    delete config.sentinelOptions;
  }

  const oldKey = storage.getConnectionKey(props.config);
  storage.editConnectionByKey(config, oldKey);
  config.connectionName = storage.getConnectionName(config);

  dialogVisible.value = false;
  emit('edit-connection-finished', config);
}

onMounted(() => {
  // back up the empty connection
  connectionEmpty.value = JSON.parse(JSON.stringify(connection.value));

  // edit mode
  if (props.editMode) {
    sslOptionsShow.value = !!props.config.sslOptions;
    sshOptionsShow.value = !!props.config.sshOptions;
    sentinelOptionsShow.value = !!props.config.sentinelOptions;

    connection.value = Object.assign({}, connection.value, props.config);
  }

  delete connection.value.connectionName;
});

defineExpose({
  show,
});
</script>

<style type="text/css">
  .new-connection-dialog .el-checkbox {
    margin-left: 0;
    margin-right: 15px;
  }

  .new-connection-dialog {
    width: min(960px, calc(100vw - 32px));
    max-width: calc(100vw - 32px);
  }

  .new-connection-dialog fieldset {
    border-width: 2px 0 0 0;
    border-color: #fff;
    font-weight: bold;
    color: #bdc5ce;
    font-size: 105%;
    margin-bottom: 3px;
  }
  .dark-mode .new-connection-dialog fieldset {
    color: #416586;
    border-color: #7b95ad;
  }
</style>
