<template>
  <!-- operate item -->
  <el-form
    class="connection-form"
    size="mini"
  >
    <el-form-item>
      <el-row :gutter="6">
        <!-- db index select -->
        <el-col :span="12">
          <el-select
            v-model="selectedDbIndex"
            class="db-select"
            placeholder="DB"
            :filter-method="filterDbCustomName"
            filterable
            default-first-option
            @change="changeDb()"
            @visible-change="revertDbFilter"
          >
            <el-option
              v-for="index in dbsCopy"
              :key="index"
              :label="`DB${index}`"
              :value="index"
            >
              <span>
                {{ `DB${index}` }}
                <span
                  v-if="dbKeysCount[index]"
                  class="db-select-key-count"
                >[{{ dbKeysCount[index] }}]</span>
                <span class="db-select-custom-name">
                  <span class="db-select-key-count">{{ dbNames[index] }}</span>

                  <ElementIcon
                    name="el-icon-edit-outline"
                    @click.stop.prevent="customDbName(index)"
                  />
                </span>
              </span>
            </el-option>
          </el-select>
        </el-col>

        <!-- new key btn -->
        <el-col :span="12">
          <el-button
            class="new-key-btn"
            @click="newKeyDialog=true"
          >
            <ElementIcon name="el-icon-plus" />
            {{ $t('message.add_new_key') }}
          </el-button>
        </el-col>
      </el-row>
    </el-form-item>

    <!-- autocomplete search input -->
    <el-form-item class="search-item">
      <div class="search-input-row">
        <el-autocomplete
          v-model="searchMatch"
          class="search-input"
          :debounce="searchDebounce"
          :fetch-suggestions="querySearch"
          :placeholder="$t('message.enter_to_search')"
          :trigger-on-focus="false"
          :select-when-unmatched="true"
          @select="changeMatchMode"
          @keyup.enter="changeMatchMode()"
        />

        <el-tooltip
          effect="dark"
          :content="$t('message.exact_search')"
          placement="bottom"
        >
          <el-checkbox
            v-model="searchExact"
            class="search-exact-checkbox"
          />
        </el-tooltip>

        <el-button
          class="search-action-btn"
          text
          @click="(searchIcon=='el-icon-loading') && showCancelIcon ? cancelSearch() : changeMatchMode()"
        >
          <ElementIcon
            v-if="(searchIcon=='el-icon-loading') && showCancelIcon"
            class="search-icon"
            name="el-icon-error"
            :title="$t('el.messagebox.cancel')"
          />
          <ElementIcon
            v-else
            class="search-icon"
            :name="searchIcon"
            :spin="searchIcon=='el-icon-loading'"
          />
        </el-button>
      </div>
    </el-form-item>

    <!-- new key dialog -->
    <el-dialog
      v-model="newKeyDialog"
      :title="$t('message.add_new_key')"
      :close-on-click-modal="false"
      append-to-body
      @opened="openNewKeyDialog"
    >
      <el-form
        label-position="top"
        size="mini"
      >
        <el-form-item :label="$t('message.key_name')">
          <el-input
            ref="newKeyNameInput"
            v-model="newKeyName"
          />
        </el-form-item>

        <el-form-item :label="$t('message.key_type')">
          <el-select
            v-model="selectedNewKeyType"
            style="width: 100%"
          >
            <el-option
              v-for="(type, showType) in newKeyTypes"
              :key="type"
              :label="showType"
              :value="type"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="newKeyDialog = false">
            {{ $t('el.messagebox.cancel') }}
          </el-button>
          <el-button
            type="primary"
            @click="addNewKey"
          >
            {{ $t('el.messagebox.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-form>
</template>

<script setup>
import {
  ref, watch, onMounted, onUnmounted, inject,
} from 'vue';
import { useI18n } from '@/composables/useI18n';
import { $storage, $message, $prompt } from '@/main';
import electron from '@/electron';
import bus from '@/bus';
import ElementIcon from '@/components/ElementIcon.vue';

const props = defineProps({
  client: Object,
  config: Object,
});

const connectionWrapper = inject('connectionWrapper');
const { t } = useI18n();

const dbs = ref([0]);
const dbsCopy = ref([0]);
const selectedDbIndex = ref(0);
const searchMatch = ref('');
const searchExact = ref(false);
const searchIcon = ref('el-icon-search');
const searchHistory = ref(new Set());
const searchDebounce = 100;
const newKeyDialog = ref(false);
const newKeyName = ref('');
const newKeyNameInput = ref(null);
const selectedNewKeyType = ref('string');
const newKeyTypes = {
  String: 'string',
  Hash: 'hash',
  List: 'list',
  Set: 'set',
  Zset: 'zset',
  Stream: 'stream',
  ReJSON: 'rejson',
};
const dbKeysCount = ref({});
const dbNames = ref({});
const showCancelIcon = ref(false);
let rmCancelIconTimer = null;
let removeClosingWindowListener = null;
let searchHistoryCount = 0;

watch(() => dbs.value, (newValue) => {
  dbsCopy.value = newValue.concat();
});

const getKeyList = () => (connectionWrapper && connectionWrapper.$refs
  ? connectionWrapper.$refs.keyList
  : null);

const initShow = () => {
  initDatabaseSelect();
  initCustomDbName();
};

const setDb = (db) => {
  selectedDbIndex.value = db;
};

const initDatabaseSelect = () => {
  props.client.config('get', 'databases').then((reply) => {
    dbs.value = [...Array(parseInt(reply[1])).keys()];
    getDatabasesFromInfo();
  }).catch(() => {
    dbs.value = [...Array(16).keys()];
    getDatabasesFromInfo(true);
  });
};

const initCustomDbName = () => {
  const dbKey = $storage.getStorageKeyByName('custom_db', props.config.connectionName);
  const customNames = JSON.parse(localStorage.getItem(dbKey));

  if (customNames) {
    dbNames.value = customNames;
  }
};

const getDatabasesFromInfo = (guessMaxDb = false) => {
  if (!props.client) {
    return;
  }

  dbKeysCount.value = {};
  props.client.info().then((info) => {
    const keyspace = info.split('# Keyspace')[1].trim().split('\n');
    let keyCount = [];

    for (const line of keyspace) {
      keyCount = line.match(/db(\d+)\:keys=(\d+)/);
      if (keyCount) {
        dbKeysCount.value = { ...dbKeysCount.value, [keyCount[1]]: keyCount[2] };
      }
    }

    if (!guessMaxDb || !keyCount || !keyCount[1]) {
      return;
    }
    const maxDb = parseInt(keyCount[1]);

    if (maxDb > 16) {
      dbs.value = [...Array(maxDb + 1).keys()];
    }
  }).catch(() => {});
};

const resetStatus = () => {
  dbs.value = [0];
  searchMatch.value = '';
  searchExact.value = false;
};

const changeDb = (dbIndex = false) => {
  if (dbIndex !== false) {
    selectedDbIndex.value = parseInt(dbIndex);
  }

  props.client.select(selectedDbIndex.value)
    .then(() => {
      searchMatch.value = '';
      const keyList = getKeyList();
      keyList && keyList.refreshKeyList();
      const dbKey = $storage.getStorageKeyByName('last_db', props.config.connectionName);
      localStorage.setItem(dbKey, selectedDbIndex.value);
      props.client.options.db = selectedDbIndex.value;
      bus.$emit('changeDb', props.client, selectedDbIndex.value);
    })
    .catch((e) => {
      $message.error({
        message: e.message,
        duration: 3000,
      });
      selectedDbIndex.value = 0;
    });
};

const customDbName = (db) => {
  const name = dbNames.value[db];

  $prompt(t('message.custom_name'), { inputValue: name }).then(({ value }) => {
    dbNames.value = { ...dbNames.value, [db]: value };
    const dbKey = $storage.getStorageKeyByName('custom_db', props.config.connectionName);
    localStorage.setItem(dbKey, JSON.stringify(dbNames.value));
  }).catch(() => {});
};

const filterDbCustomName = (query) => {
  query = query.toLocaleLowerCase();

  dbsCopy.value = dbs.value.filter((dbIndex) => {
    if (`db${dbIndex}`.includes(query)) {
      return true;
    }

    const dbName = dbNames.value[dbIndex];
    if (dbName && dbName.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
};

const openNewKeyDialog = () => {
  newKeyNameInput.value.focus();
  newKeyNameInput.value.select();
};

const addNewKey = () => {
  if (!newKeyName.value) {
    return;
  }

  const key = Buffer.from(newKeyName.value);
  const promise = setDefaultValue(key, selectedNewKeyType.value);

  promise.then(() => {
    bus.$emit('refreshKeyList', props.client, key, 'add');
    bus.$emit('clickedKey', props.client, key, true);
  }).catch((e) => {
    $message.error(e.message);
  });

  newKeyDialog.value = false;
};

const setDefaultValue = (key, type) => {
  switch (type) {
    case 'string': {
      return props.client.set(key, '');
    }
    case 'hash': {
      return props.client.hset(key, 'New field', 'New value');
    }
    case 'list': {
      return props.client.lpush(key, 'New member');
    }
    case 'set': {
      return props.client.sadd(key, 'New member');
    }
    case 'zset': {
      return props.client.zadd(key, 0, 'New member');
    }
    case 'stream': {
      return props.client.xadd(key, '*', 'New key', 'New value');
    }
    case 'rejson': {
      return props.client.call('JSON.SET', [key, '$', '{"New key":"New value"}']);
    }
  }
};

const toggleCancelIcon = (show = false) => {
  showCancelIcon.value = false;
  clearTimeout(rmCancelIconTimer);

  if (show) {
    rmCancelIconTimer = setTimeout(() => {
      showCancelIcon.value = true;
    }, 800);
  }
};

const changeMatchMode = () => {
  setTimeout(() => {
    searchHistory.value.add(searchMatch.value);
  }, searchDebounce + 100);

  const keyList = getKeyList();
  keyList && keyList.refreshKeyList();
};

const querySearch = (input, cb) => {
  const items = [];

  if (!searchHistory.value.size) {
    return cb([]);
  }

  searchHistory.value.forEach((value) => {
    if (value.toLowerCase().indexOf(input.toLowerCase()) !== -1) {
      items.push({ value });
    }
  });

  cb(items);
};

const initHistory = () => {
  const key = $storage.getStorageKeyByName('search_tip', props.config.name);
  const tips = localStorage.getItem(key);

  const suggestions = tips ? JSON.parse(tips) : [];
  searchHistory.value = new Set(suggestions);

  searchHistoryCount = searchHistory.value.size;

  removeClosingWindowListener = electron.on('closingWindow', () => {
    storeHistory();
  });
};

const storeHistory = () => {
  if (searchHistory.value.size === searchHistoryCount) {
    return;
  }
  const key = $storage.getStorageKeyByName('search_tip', props.config.name);
  localStorage.setItem(key, JSON.stringify(Array.from(searchHistory.value).slice(-200)));
};

const cancelSearch = () => {
  const keyList = getKeyList();
  if (!keyList) {
    return;
  }

  keyList.cancelScanning();
  keyList.resetSearchStatus();
};

const revertDbFilter = (visible) => {
  visible && (dbsCopy.value = dbs.value.concat());
};

onMounted(() => {
  initHistory();

  bus.$on('changeDb', (client, dbIndex) => {
    if (!props.client || client.options.connectionName !== props.client.options.connectionName) {
      return;
    }

    if (props.client.condition.select === dbIndex) {
      return;
    }

    changeDb(dbIndex);
  });

  bus.$on('changeMatchMode', (client, pattern) => {
    if (client !== props.client) {
      return;
    }

    searchMatch.value = pattern;
    changeMatchMode();
  });
});

onUnmounted(() => {
  removeClosingWindowListener && removeClosingWindowListener();
});

defineExpose({
  initShow,
  setDb,
  resetStatus,
});
</script>

<style type="text/css">
  .connection-menu .db-select {
    width: 100%;
  }
  .el-select-dropdown__item .db-select-key-count {
    color: #a9a9ab;
    font-size: 82%;
    vertical-align: top;
  }
  .el-select-dropdown__item .db-select-custom-name {
    float: right;
    margin-left: 4px;
  }

  /*fix el-select height different from el-input*/
  .connection-menu .db-select .el-input__inner, .connection-menu .new-key-btn {
    /*margin-top: 0.5px;*/
    height: 28px;
  }
  .connection-menu .new-key-btn {
    width: 100%;
  }
  .connection-menu .search-item {
    margin-top: -10px;
    margin-bottom: 15px;
  }
  .connection-menu .search-input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  .connection-menu .search-input {
    flex: 1;
    width: auto;
  }
  .connection-menu .search-exact-checkbox {
    flex: 0 0 auto;
    margin-right: 0;
  }
  .connection-menu .search-action-btn {
    flex: 0 0 auto;
    min-height: 28px;
    padding: 4px 6px;
  }
  .connection-menu .search-input .el-input__wrapper {
    width: 100%;
  }

  .connection-menu .el-icon {
    font-size: 12px;
    margin: 0px;
    width: auto;
    /*color: grey;*/
    vertical-align: baseline;
  }

  .connection-menu .connection-form {
    /*padding-right: 8px;*/
  }

  .connection-menu .search-item .search-icon {
    font-size: 128%;
    color: #a5a8ad;
    cursor: pointer;
    width: 20px;
  }
</style>
