<template>
  <el-dialog
    v-model="visible"
    :title="t('message.custom_formatter')"
    append-to-body
    width="60%"
  >
    <!-- new formatter btn -->
    <el-button
      size="mini"
      @click="addDialog=true"
    >
      + {{ t('message.new') }}
    </el-button>
    <!-- formatter list -->
    <el-table :data="formatters">
      <el-table-column
        label="Name"
        prop="name"
        width="120"
      />
      <el-table-column
        label="Formatter"
      >
        <template #default="scope">
          {{ formatterPreview(scope.row) }}
        </template>
      </el-table-column>
      <el-table-column
        label="Operation"
        width="90"
      >
        <template #default="scope">
          <el-button
            :icon="resolveElIcon('el-icon-delete')"
            type="text"
            @click="removeFormatter(scope.$index)"
          />
          <el-button
            :icon="resolveElIcon('el-icon-edit-outline')"
            type="text"
            @click="showEditDialog(scope.row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <!-- new formatter dialog -->
    <el-dialog
      v-model="addDialog"
      :close-on-click-modal="false"
      :title="!editMode ? t('message.new') : t('message.edit')"
      append-to-body
      @closed="reset"
    >
      <el-form
        label-position="top"
        size="mini"
      >
        <el-form-item
          label="Name"
          required
        >
          <el-input v-model="formatter.name" />
        </el-form-item>

        <el-form-item
          label="Command"
          required
        >
          <template #label>
            <span>
              Command
              <el-popover
                placement="top-start"
                title="Command"
                trigger="hover"
              >
                <template #reference>
                  <ElementIcon name="el-icon-question" />
                </template>
                <p>Executable file, such as  <el-tag>/bin/bash</el-tag>, <el-tag>/bin/node</el-tag>, <el-tag>xxx.sh</el-tag>, <el-tag>xxx.php</el-tag>, make sure it is executable</p>
              </el-popover>
            </span>
          </template>
          <FileInput
            :file="formatter.command"
            placeholder="/bin/bash"
            @update:file="formatter.command = $event"
          />
        </el-form-item>

        <el-form-item label="Params">
          <template #label>
            <span>
              Params
              <el-popover
                placement="top-start"
                title="Params"
                trigger="hover"
              >
                <template #reference>
                  <ElementIcon name="el-icon-question" />
                </template>
                <div class="formatter-help">
                  <p>
                    Command params, such as "--key
                    <el-tag>{KEY}</el-tag> --value <el-tag>{VALUE}</el-tag>"
                  </p>
                  <hr>
                  <b>Template variables to be replaced:</b>
                  <table>
                    <tbody>
                      <tr>
                        <td>[String]</td>
                        <td><el-tag>{VALUE}</el-tag></td>
                      </tr>
                      <tr>
                        <td>[Hash]</td>
                        <td><el-tag>{FIELD}</el-tag> <el-tag>{VALUE}</el-tag></td>
                      </tr>
                      <tr>
                        <td>[List]</td>
                        <td><el-tag>{VALUE}</el-tag></td>
                      </tr>
                      <tr>
                        <td>[Set]</td>
                        <td><el-tag>{VALUE}</el-tag></td>
                      </tr>
                      <tr>
                        <td>[Zset]</td>
                        <td><el-tag>{SCORE}</el-tag> <el-tag>{MEMBER}</el-tag></td>
                      </tr>
                    </tbody>
                  </table>
                  <hr>
                  <p>
                    If your value is unvisible, you can pass <el-tag>{HEX}</el-tag> instead of <el-tag>{VALUE}</el-tag><br>
                    then hex such as <i>68656c6c6f20776f726c64</i> will be passed
                  </p>
                  <hr>
                  <p>
                    If your value is too long(>8000), it will be writen to a file,<br>
                    you can use <el-tag>{HEX_FILE}</el-tag> to get the path and read in your script,<br>
                    the content in this file is same with <el-tag>{HEX}</el-tag>
                  </p>
                </div>
              </el-popover>
            </span>
          </template>
          <el-input
            v-model="formatter.params"
            placeholder="--value &quot;{VALUE}&quot;"
          />
        </el-form-item>

        <el-form-item label="">
          <p>{{ formatterPreview(formatter) }}</p>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addDialog=false">
            {{ t('el.messagebox.cancel') }}
          </el-button>
          <el-button
            type="primary"
            @click="editFormatter"
          >
            {{ t('el.messagebox.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import { useI18n } from '@/composables/useI18n';
import storage from '@/storage';
import FileInput from '@/components/FileInput.vue';
import ElementIcon from '@/components/ElementIcon.vue';
import { resolveElIcon } from '@/element-plus-icons';
import bus from '@/bus';

const { getTranslate } = useI18n();
const t = getTranslate();

const visible = ref(false);
const addDialog = ref(false);
const editMode = ref(false);
const formatter = ref({ name: '', command: '', params: '' });

const formatters = computed(() => storage.getCustomFormatter());

function show() {
  visible.value = true;
}

function reset() {
  editMode.value = false;
  formatter.value = { name: '', command: '', params: '' };
}

function formatterPreview(row) {
  return `${row.command} ${row.params}`;
}

function showEditDialog(row) {
  formatter.value = row;
  addDialog.value = true;
  editMode.value = true;
}

function editFormatter() {
  if (!formatter.value.name || !formatter.value.command) {
    return false;
  }

  // add mode
  if (!editMode.value) {
    formatters.value.push(formatter.value);
  }

  saveSetting();
  addDialog.value = false;
}

function removeFormatter(index) {
  formatters.value.splice(index, 1);
  saveSetting();
}

function saveSetting() {
  storage.saveCustomFormatters(formatters.value);
  bus.$emit('refreshViewers');
}

function handleAddCustomFormatter() {
  show();
}

onMounted(() => {
  bus.$on('addCustomFormatter', handleAddCustomFormatter);
});

onUnmounted(() => {
  bus.$off('addCustomFormatter', handleAddCustomFormatter);
});

defineExpose({
  show,
});
</script>

<style type="text/css">
.formatter-help p {
  margin: 0;
}

.formatter-help hr {
  margin: 10px 0;
}

.formatter-help table {
  margin-top: 8px;
  border-spacing: 8px 4px;
}
</style>
