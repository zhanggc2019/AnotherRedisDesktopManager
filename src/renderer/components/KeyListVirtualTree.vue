<template>
  <div
    ref="treeWrapper"
    class="key-list-vtree"
    :class="{ 'show-checkbox': multiOperating }"
  >
    <!-- multi operate -->
    <div class="batch-operate">
      <div class="fixed-col">
        <input
          class="select-cancel-all"
          type="checkbox"
          :checked="checkAllSelect"
          :title="t('message.toggle_check_all')"
          @change="toggleCheckAll($event.target.checked)"
        >
      </div>
      <div class="flex-col">
        <el-row :gutter="6">
          <el-col :span="8">
            <el-button
              type="danger"
              size="small"
              @click="deleteBatch"
            >
              {{ t('el.upload.delete') }}
            </el-button>
          </el-col>
          <el-col :span="8">
            <el-button
              type="primary"
              size="small"
              @click="clickItem(&quot;export&quot;)"
            >
              {{ t('message.export') }}
            </el-button>
          </el-col>
          <el-col :span="8">
            <el-button
              type="primary"
              plain
              size="small"
              @click="hideMultiSelect"
            >
              {{ t('el.messagebox.cancel') }}
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- tree list -->
    <RecycleScroller
      class="key-list-tree-body"
      :items="visibleNodes"
      :item-size="22"
      key-field="key"
      :style="{ height: multiOperating ? vtreeHeightMutiple : vtreeHeightRaw }"
    >
      <template #default="{ item, index }">
        <div
          class="key-tree-row"
          :class="{
            'is-current': currentKey === item.key,
            'is-folder': !item.isLeaf,
            'is-leaf': item.isLeaf,
          }"
          :data-row-key="encodeKey(item.key)"
          :title="item.label"
          tabindex="0"
          @click="handleRowClick(item, $event)"
          @contextmenu.prevent="rightClick($event, item)"
          @keydown="nodeKeyDown(item, $event)"
        >
          <span
            class="key-tree-indent"
            :style="{ width: `${item.depth * 10}px` }"
          />

          <input
            v-if="multiOperating"
            class="key-tree-checkbox"
            type="checkbox"
            :checked="item.checked"
            @click.stop="toggleNodeCheck(item, $event, $event.target.checked)"
          >

          <span
            class="key-tree-expand"
            :class="{ 'is-leaf': item.isLeaf, expanded: item.expanded }"
            @click.stop="toggleExpand(item)"
          >
            <i
              v-if="!item.isLeaf"
              class="fa fa-chevron-right"
            />
          </span>

          <i
            v-if="!item.isLeaf"
            :class="item.expanded ? 'fa fa-folder-open' : 'fa fa-folder'"
          />
          <span class="key-tree-label">{{ item.label }}</span>
          <span
            v-if="!item.isLeaf"
            class="key-list-count"
          >({{ item.data.keyCount }})</span>
        </div>
      </template>
    </RecycleScroller>

    <!-- right context menu -->
    <div
      ref="rightMenu"
      class="key-list-right-menu"
    >
      <!-- folder right menu -->
      <ul v-if="rightClickNode && !rightClickNode.isLeaf">
        <li @click="clickItem(&quot;multiple_select&quot;)">
          {{ t('message.multiple_select') }}
        </li>
        <li @click="clickItem(&quot;memory_analysis&quot;)">
          {{ t('message.memory_analysis') }}
        </li>
        <li @click="clickItem(&quot;load_cur_folder&quot;)">
          {{ t('message.load_current_folder') }}
        </li>
        <li @click="clickItem(&quot;delete_folder&quot;)">
          {{ t('message.delete_folder') }}
        </li>
      </ul>
      <!-- key right menu -->
      <ul v-else>
        <li @click="clickItem(&quot;copy&quot;)">
          {{ t('message.copy') }}
        </li>
        <li @click="clickItem(&quot;delete&quot;)">
          {{ t('el.upload.delete') }}
        </li>
        <li @click="clickItem(&quot;multiple_select&quot;)">
          {{ t('message.multiple_select') }}
        </li>
        <li @click="clickItem(&quot;open&quot;)">
          {{ t('message.open_new_tab') }}
        </li>
        <li @click="clickItem(&quot;export&quot;)">
          {{ t('message.export') }}Key
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import {
  ref, computed, watch, nextTick,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { RecycleScroller } from 'vue-virtual-scroller';
import { useI18n } from '@/composables/useI18n';
import electron from '@/electron';
import bus from '@/bus';
import { sortKeysAndFolder, keysToTree, keysToList } from '@/util';

const props = defineProps({
  client: Object,
  config: Object,
  keyList: Array,
});

const emit = defineEmits(['exportBatch']);

const { getTranslate } = useI18n();
const t = getTranslate();

const treeWrapper = ref(null);
const rightMenu = ref(null);

const rightClickNode = ref(null);
const multiOperating = ref(false);
const checkAllSelect = ref(false);
const vtreeHeightRaw = 'calc(100vh - 248px)';
const vtreeHeightMutiple = 'calc(100vh - 284px)';
const treeNodesOverflow = 20e4; // 200k
const keyNodes = ref([]);
const expandedKeys = ref([]);
const checkedLeafKeys = ref([]);
const currentKey = ref('');
const nodeMap = ref({});
const leafKeys = ref([]);
const folderKeys = ref([]);
const rightClickItem = ref('');
const lastCheckedKey = ref('');
const lastCheckedValue = ref(false);

const separator = computed(() => (props.config.separator === undefined ? ':' : props.config.separator));

const visibleNodes = computed(() => {
  const checkedSet = new Set(checkedLeafKeys.value);
  const expandedSet = new Set(expandedKeys.value);
  const stateMap = {};
  const collectState = (nodes) => {
    for (const node of nodes) {
      if (!node.children || !node.children.length) {
        stateMap[node.key] = {
          checked: checkedSet.has(node.key),
          indeterminate: false,
          leafCount: 1,
          checkedCount: checkedSet.has(node.key) ? 1 : 0,
        };
        continue;
      }

      collectState(node.children);
      const childStates = node.children.map(child => stateMap[child.key]);
      const leafCount = childStates.reduce((sum, child) => sum + child.leafCount, 0);
      const checkedCount = childStates.reduce((sum, child) => sum + child.checkedCount, 0);

      stateMap[node.key] = {
        checked: leafCount > 0 && checkedCount === leafCount,
        indeterminate: checkedCount > 0 && checkedCount < leafCount,
        leafCount,
        checkedCount,
      };
    }
  };

  collectState(keyNodes.value);

  const visible = [];
  const flatten = (nodes, depth = 0) => {
    for (const node of nodes) {
      const isLeaf = !node.children || !node.children.length;
      const state = stateMap[node.key] || {
        checked: false,
        indeterminate: false,
      };

      visible.push({
        key: node.key,
        label: node.name,
        data: node,
        depth,
        isLeaf,
        expanded: !isLeaf && expandedSet.has(node.key),
        checked: state.checked,
        indeterminate: state.indeterminate,
      });

      if (!isLeaf && expandedSet.has(node.key)) {
        flatten(node.children, depth + 1);
      }
    }
  };

  flatten(keyNodes.value);
  return visible;
});

function encodeKey(key) {
  return encodeURIComponent(key);
}

function buildNodeMeta(nodes) {
  const newNodeMap = {};
  const newLeafKeys = [];
  const newFolderKeys = [];

  const walk = (items) => {
    for (const item of items) {
      newNodeMap[item.key] = item;

      if (item.children && item.children.length) {
        newFolderKeys.push(item.key);
        walk(item.children);
      } else {
        newLeafKeys.push(item.key);
      }
    }
  };

  walk(nodes);
  nodeMap.value = newNodeMap;
  leafKeys.value = newLeafKeys;
  folderKeys.value = newFolderKeys;
}

function sortTreeNodes(nodes) {
  sortKeysAndFolder(nodes);
  for (const node of nodes) {
    if (node.children && node.children.length) {
      sortTreeNodes(node.children);
    }
  }
}

function collectLeafKeys(nodes = []) {
  const keys = [];

  const walk = (items) => {
    for (const item of items) {
      if (item.children && item.children.length) {
        walk(item.children);
      } else {
        keys.push(item.key);
      }
    }
  };

  walk(nodes);
  return keys;
}

function rightClick(event, item) {
  hideAllMenus();
  currentKey.value = item.key;
  rightClickNode.value = item;

  nextTick(() => {
    let top = event.clientY;
    const menu = rightMenu.value;
    menu.style.display = 'block';

    if (document.body.clientHeight - top < menu.clientHeight) {
      top -= menu.clientHeight;
    }

    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${top}px`;

    document.addEventListener('click', hideAllMenus, { once: true });
  });
}

function handleRowClick(item, event) {
  currentKey.value = item.key;

  if (multiOperating.value) {
    toggleNodeCheck(item, event, !item.checked);
    return;
  }

  if (item.isLeaf) {
    let newTab = false;
    event && (event.ctrlKey || event.metaKey) && (newTab = true);
    clickKey(Buffer.from(item.data.nameBuffer.data), newTab);
    return;
  }

  toggleExpand(item);
}

function toggleExpand(item) {
  if (item.isLeaf) {
    return;
  }

  const exists = expandedKeys.value.includes(item.key);
  expandedKeys.value = exists
    ? expandedKeys.value.filter(key => key !== item.key)
    : expandedKeys.value.concat(item.key);
}

function updateCheckedLeafKeys(keys, checked) {
  const next = new Set(checkedLeafKeys.value);

  for (const key of keys) {
    checked ? next.add(key) : next.delete(key);
  }

  checkedLeafKeys.value = Array.from(next);
  syncCheckAllSelect();
}

function toggleNodeCheck(item, event = null, checked = !item.checked) {
  const keys = item.isLeaf ? [item.key] : collectLeafKeys(item.data.children || []);
  updateCheckedLeafKeys(keys, checked);

  const previousChecked = lastCheckedValue.value;
  const leafNodes = visibleNodes.value.filter(node => node.isLeaf);
  const from = leafNodes.findIndex(node => node.key === lastCheckedKey.value);
  const to = leafNodes.findIndex(node => node.key === item.key);

  if (event && event.shiftKey && from >= 0 && to >= 0 && from !== to) {
    const [start, end] = from < to ? [from, to] : [to, from];
    const rangeKeys = leafNodes.slice(start, end + 1).map(node => node.key);
    updateCheckedLeafKeys(rangeKeys, previousChecked);
  }

  lastCheckedKey.value = item.key;
  lastCheckedValue.value = checked;
}

function focusRow(key) {
  nextTick(() => {
    const row = treeWrapper.value.querySelector(`[data-row-key="${encodeKey(key)}"]`);
    row && row.focus();
  });
}

function nodeKeyDown(item, event) {
  if (!item) {
    return;
  }

  currentKey.value = item.key;

  if (event.key === 'ArrowRight' && !item.isLeaf && !item.expanded) {
    event.preventDefault();
    toggleExpand(item);
    return;
  }

  if (event.key === 'ArrowLeft' && !item.isLeaf && item.expanded) {
    event.preventDefault();
    toggleExpand(item);
    return;
  }

  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const index = visibleNodes.value.findIndex(node => node.key === item.key);
  const next = visibleNodes.value[index + (event.key === 'ArrowDown' ? 1 : -1)];

  if (!next) {
    return;
  }

  currentKey.value = next.key;
  focusRow(next.key);

  if (next.isLeaf) {
    clickKey(Buffer.from(next.data.nameBuffer.data));
  }
}

function showMultiSelect() {
  multiOperating.value = true;
}

function hideMultiSelect() {
  multiOperating.value = false;
  checkAllSelect.value = false;
  checkedLeafKeys.value = [];
  lastCheckedKey.value = '';
  lastCheckedValue.value = false;
}

function hideAllMenus() {
  const menus = document.querySelectorAll('.key-list-right-menu');

  if (!menus.length) {
    return;
  }

  for (const menu of menus) {
    menu.style.display = 'none';
  }
}

function clickItem(type) {
  if (!rightClickNode.value) {
    return;
  }

  rightClickItem.value = type;

  switch (type) {
    case 'copy': {
      electron.writeText(rightClickNode.value.data.name);
      break;
    }
    case 'delete': {
      if (multiOperating.value) {
        return deleteBatch();
      }

      const keyBuffer = Buffer.from(rightClickNode.value.data.nameBuffer.data);

      props.client.del(keyBuffer).then((reply) => {
        if (reply == 1) {
          ElMessage.success({
            message: t('message.delete_success'),
            duration: 1000,
          });

          bus.$emit('refreshKeyList', props.client, keyBuffer, 'del');
        } else {
          ElMessage.error(t('message.delete_failed'));
        }
      }).catch((e) => { ElMessage.error(e.message); });
      break;
    }
    case 'multiple_select': {
      showMultiSelect();
      break;
    }
    case 'open': {
      clickKey(Buffer.from(rightClickNode.value.data.nameBuffer.data), true);
      break;
    }
    case 'delete_folder': {
      const rule = { pattern: [rightClickNode.value.data.fullName] };
      bus.$emit('openDelBatch', props.client, props.config.connectionName, rule);
      break;
    }
    case 'memory_analysis': {
      const pattern = rightClickNode.value.data.fullName;
      bus.$emit('memoryAnalysis', props.client, props.config.connectionName, pattern);
      break;
    }
    case 'export': {
      if (!multiOperating.value) {
        updateCheckedLeafKeys([rightClickNode.value.key], true);
        showMultiSelect();
      } else {
        exportBatchFn();
      }

      break;
    }
    case 'load_cur_folder': {
      const pattern = rightClickNode.value.data.fullName;
      bus.$emit('changeMatchMode', props.client, pattern);
      break;
    }
  }
}

function toggleCheckAll(checked) {
  checkAllSelect.value = checked;
  checkedLeafKeys.value = checked ? leafKeys.value.slice() : [];
}

function syncCheckAllSelect() {
  checkAllSelect.value = leafKeys.value.length > 0
    && leafKeys.value.every(key => checkedLeafKeys.value.includes(key));
}

function deleteBatch() {
  const rule = { key: [], pattern: [] };

  for (const key of checkedLeafKeys.value) {
    const node = nodeMap.value[key];
    node && rule.key.push(Buffer.from(node.nameBuffer.data));
  }

  hideMultiSelect();
  bus.$emit('openDelBatch', props.client, props.config.connectionName, rule);
}

function exportBatchFn() {
  const keys = [];

  if (!checkedLeafKeys.value.length) {
    ElMessage.warning('Please select keys!');
    return;
  }

  for (const key of checkedLeafKeys.value) {
    const node = nodeMap.value[key];
    node && keys.push(Buffer.from(node.nameBuffer.data));
  }

  hideMultiSelect();
  emit('exportBatch', keys);
}

function clickKey(key, newTab = false) {
  bus.$emit('clickedKey', props.client, key, newTab);
}

watch(
  () => props.keyList,
  (newList) => {
    console.log('[KeyListVirtualTree] keyList watch triggered!');
    console.log('[KeyListVirtualTree] keyList changed, length:', newList ? newList.length : 0);
    console.log('[KeyListVirtualTree] keyList value:', newList);
    
    let newListCopy = newList;

    if (newList.length > treeNodesOverflow) {
      newListCopy = newList.slice(0, treeNodesOverflow);
      nextTick(() => {
        ElMessage.warning({
          message: t('message.tree_node_overflow', { num: treeNodesOverflow }),
          duration: 6000,
        });
      });
    }

    const newKeyNodes = separator.value
      ? keysToTree(newListCopy, separator.value, new Set(expandedKeys.value), treeNodesOverflow)
      : keysToList(newListCopy);

    console.log('[KeyListVirtualTree] newKeyNodes length:', newKeyNodes.length);
    
    sortTreeNodes(newKeyNodes);
    keyNodes.value = newKeyNodes;
    
    console.log('[KeyListVirtualTree] keyNodes.value set, length:', keyNodes.value.length);
    
    buildNodeMeta(newKeyNodes);

    expandedKeys.value = expandedKeys.value.filter(key => folderKeys.value.includes(key));
    checkedLeafKeys.value = checkedLeafKeys.value.filter(key => leafKeys.value.includes(key));

    if (newListCopy.length <= 20) {
      expandedKeys.value = folderKeys.value.slice();
    }

    if (currentKey.value && !nodeMap.value[currentKey.value]) {
      currentKey.value = '';
    }

    syncCheckAllSelect();
  },
  { immediate: true }
);
</script>

<style>
.key-list-vtree {
  height: calc(100vh - 250px);
}

.key-list-vtree .key-list-tree-body {
  width: calc(100% + 2px);
}

.key-list-vtree .vue-recycle-scroller.ready .vue-recycle-scroller__item-view {
  will-change: auto;
}

.key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-thumb {
  border: 3px dashed transparent;
  background-clip: padding-box;
}
.key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-thumb:hover {
  background: #7f7f7f;
}
.key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-track:hover {
  background: #e0e0dd;
}

.dark-mode .key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-thumb:hover {
  background: #6a838f;
}
.dark-mode .key-list-vtree .vue-recycle-scroller::-webkit-scrollbar-track:hover {
  background: #495961;
}

.key-list-vtree .key-tree-row {
  display: flex;
  align-items: center;
  height: 22px;
  line-height: 22px;
  padding: 0 3px;
  margin-right: 1px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.key-list-vtree .key-tree-row:hover {
  background-color: #e7e7e7;
}
.dark-mode .key-list-vtree .key-tree-row:hover {
  background-color: #50616b;
}

.key-list-vtree .key-tree-row.is-current {
  background-color: #d4d4d4;
}
.dark-mode .key-list-vtree .key-tree-row.is-current {
  background-color: #50616b;
}

.key-list-vtree .key-tree-indent {
  flex: 0 0 auto;
}

.key-list-vtree .key-tree-checkbox {
  margin: 0 4px 0 0;
}

.key-list-vtree .key-tree-expand {
  width: 14px;
  margin-right: 6px;
  color: #7b7b7b;
  font-size: 76%;
  text-align: center;
  flex: 0 0 auto;
}

.key-list-vtree .key-tree-expand.is-leaf {
  margin-right: 6px;
}

.key-list-vtree .key-tree-expand.expanded .fa {
  transform: rotate(90deg);
}

.key-list-vtree .key-tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-list-vtree .fa-folder,
.key-list-vtree .fa-folder-open {
  color: #848a90;
  font-size: 115%;
  margin-right: 4px;
}
.dark-mode .key-list-vtree .fa-folder,
.dark-mode .key-list-vtree .fa-folder-open {
  color: #9ea4a9;
}

.key-list-vtree .key-list-count {
  color: #848a90;
  margin-left: auto;
}
.dark-mode .key-list-vtree .key-list-count {
  color: #a3a6ad;
}

.key-list-vtree .batch-operate {
  display: none;
  margin-bottom: 8px;
}
.key-list-vtree.show-checkbox .batch-operate {
  display: block;
}
.key-list-vtree .batch-operate .fixed-col {
  float: left;
  width: 20px;
  line-height: 22px;
}
.key-list-vtree .batch-operate .flex-col {
  margin-left: 25px;
}
.key-list-vtree .batch-operate .flex-col button {
  width: 100%;
}
.key-list-vtree .batch-operate .select-cancel-all {
  margin: 3px;
}

.key-list-right-menu {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  padding: 0;
  z-index: 99999;
  overflow: hidden;
  border-radius: 3px;
  border: 2px solid lightgrey;
  background: #fafafa;
}
.dark-mode .key-list-right-menu {
  background: #263238;
}

.key-list-right-menu ul {
  list-style: none;
  padding: 0;
}
.key-list-right-menu ul li:not(:last-child) {
  border-bottom: 1px solid lightgrey;
}

.key-list-right-menu ul li {
  font-size: 13.4px;
  padding: 6px 10px;
  cursor: pointer;
  color: #263238;
}
.dark-mode .key-list-right-menu ul li {
  color: #fff;
}

.key-list-right-menu ul li:hover {
  background: #e4e2e2;
}
.dark-mode .key-list-right-menu ul li:hover {
  background: #344A4E;
}
</style>
