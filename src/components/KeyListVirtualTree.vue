<template>
  <div ref="treeWrapper" class='key-list-vtree' :class="{ 'show-checkbox': multiOperating }">
    <!-- multi operate -->
    <div class="batch-operate">
      <div class="fixed-col">
        <input
          class="select-cancel-all"
          type="checkbox"
          :checked="checkAllSelect"
          :title="$t('message.toggle_check_all')"
          @change="toggleCheckAll($event.target.checked)">
      </div>
      <div class="flex-col">
        <el-row :gutter="6">
          <el-col :span="8">
            <el-button @click='deleteBatch' type="danger" size="mini">{{ $t('el.upload.delete') }}</el-button>
          </el-col>
          <el-col :span="8">
            <el-button @click='clickItem("export")' type="primary" size="mini">{{ $t('message.export') }}</el-button>
          </el-col>
          <el-col :span="8">
            <el-button @click="hideMultiSelect" type="primary" plain size="mini">{{ $t('el.messagebox.cancel') }}</el-button>
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
          <span class="key-tree-indent" :style="{ width: `${item.depth * 10}px` }"></span>

          <input
            v-if="multiOperating"
            class="key-tree-checkbox"
            type="checkbox"
            :checked="item.checked"
            @click.stop="toggleNodeCheck(item, $event, $event.target.checked)">

          <span
            class="key-tree-expand"
            :class="{ 'is-leaf': item.isLeaf, expanded: item.expanded }"
            @click.stop="toggleExpand(item)">
            <i v-if="!item.isLeaf" class="fa fa-chevron-right"></i>
          </span>

          <i v-if="!item.isLeaf" :class="item.expanded ? 'fa fa-folder-open' : 'fa fa-folder'"></i>
          <span class="key-tree-label">{{ item.label }}</span>
          <span v-if="!item.isLeaf" class="key-list-count">({{ item.data.keyCount }})</span>
        </div>
      </template>
    </RecycleScroller>

    <!-- right context menu -->
    <div ref='rightMenu' class="key-list-right-menu">
      <!-- folder right menu -->
      <ul v-if="rightClickNode && !rightClickNode.isLeaf">
        <li @click='clickItem("multiple_select")'>{{ $t('message.multiple_select') }}</li>
        <li @click='clickItem("memory_analysis")'>{{ $t('message.memory_analysis') }}</li>
        <li @click='clickItem("load_cur_folder")'>{{ $t('message.load_current_folder') }}</li>
        <li @click='clickItem("delete_folder")'>{{ $t('message.delete_folder') }}</li>
      </ul>
      <!-- key right menu -->
      <ul v-else>
        <li @click='clickItem("copy")'>{{ $t('message.copy') }}</li>
        <li @click='clickItem("delete")'>{{ $t('el.upload.delete') }}</li>
        <li @click='clickItem("multiple_select")'>{{ $t('message.multiple_select') }}</li>
        <li @click='clickItem("open")'>{{ $t('message.open_new_tab') }}</li>
        <li @click='clickItem("export")'>{{ $t('message.export') }}Key</li>
      </ul>
    </div>
  </div>
</template>

<script type="text/javascript">
import { RecycleScroller } from 'vue-virtual-scroller';
import electron from '@/electron';

export default {
  data() {
    return {
      rightClickNode: null,
      multiOperating: false,
      checkAllSelect: false,
      vtreeHeightRaw: 'calc(100vh - 248px)',
      vtreeHeightMutiple: 'calc(100vh - 284px)',
      treeNodesOverflow: 20e4, // 200k
      keyNodes: [],
      expandedKeys: [],
      checkedLeafKeys: [],
      currentKey: '',
      nodeMap: {},
      leafKeys: [],
      folderKeys: [],
      rightClickItem: '',
      lastCheckedKey: '',
      lastCheckedValue: false,
    };
  },
  props: ['client', 'config', 'keyList'],
  components: { RecycleScroller },
  computed: {
    separator() {
      return this.config.separator === undefined ? ':' : this.config.separator;
    },
    visibleNodes() {
      const checkedSet = new Set(this.checkedLeafKeys);
      const expandedSet = new Set(this.expandedKeys);
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

      collectState(this.keyNodes);

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

      flatten(this.keyNodes);
      return visible;
    },
  },
  methods: {
    encodeKey(key) {
      return encodeURIComponent(key);
    },
    buildNodeMeta(nodes) {
      const nodeMap = {};
      const leafKeys = [];
      const folderKeys = [];

      const walk = (items) => {
        for (const item of items) {
          nodeMap[item.key] = item;

          if (item.children && item.children.length) {
            folderKeys.push(item.key);
            walk(item.children);
          } else {
            leafKeys.push(item.key);
          }
        }
      };

      walk(nodes);
      this.nodeMap = nodeMap;
      this.leafKeys = leafKeys;
      this.folderKeys = folderKeys;
    },
    sortTreeNodes(nodes) {
      this.$util.sortKeysAndFolder(nodes);
      for (const node of nodes) {
        if (node.children && node.children.length) {
          this.sortTreeNodes(node.children);
        }
      }
    },
    collectLeafKeys(nodes = []) {
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
    },
    rightClick(event, item) {
      this.hideAllMenus();
      this.currentKey = item.key;
      this.rightClickNode = item;

      this.$nextTick(() => {
        let top = event.clientY;
        const menu = this.$refs.rightMenu;
        menu.style.display = 'block';

        if (document.body.clientHeight - top < menu.clientHeight) {
          top -= menu.clientHeight;
        }

        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${top}px`;

        document.addEventListener('click', this.hideAllMenus, { once: true });
      });
    },
    handleRowClick(item, event) {
      this.currentKey = item.key;

      if (this.multiOperating) {
        this.toggleNodeCheck(item, event, !item.checked);
        return;
      }

      if (item.isLeaf) {
        let newTab = false;
        event && (event.ctrlKey || event.metaKey) && (newTab = true);
        this.clickKey(Buffer.from(item.data.nameBuffer.data), newTab);
        return;
      }

      this.toggleExpand(item);
    },
    toggleExpand(item) {
      if (item.isLeaf) {
        return;
      }

      const exists = this.expandedKeys.includes(item.key);
      this.expandedKeys = exists
        ? this.expandedKeys.filter(key => key !== item.key)
        : this.expandedKeys.concat(item.key);
    },
    updateCheckedLeafKeys(keys, checked) {
      const next = new Set(this.checkedLeafKeys);

      for (const key of keys) {
        checked ? next.add(key) : next.delete(key);
      }

      this.checkedLeafKeys = Array.from(next);
      this.syncCheckAllSelect();
    },
    toggleNodeCheck(item, event = null, checked = !item.checked) {
      const keys = item.isLeaf ? [item.key] : this.collectLeafKeys(item.data.children || []);
      this.updateCheckedLeafKeys(keys, checked);

      const previousChecked = this.lastCheckedValue;
      const leafNodes = this.visibleNodes.filter(node => node.isLeaf);
      const from = leafNodes.findIndex(node => node.key === this.lastCheckedKey);
      const to = leafNodes.findIndex(node => node.key === item.key);

      if (event && event.shiftKey && from >= 0 && to >= 0 && from !== to) {
        const [start, end] = from < to ? [from, to] : [to, from];
        const rangeKeys = leafNodes.slice(start, end + 1).map(node => node.key);
        this.updateCheckedLeafKeys(rangeKeys, previousChecked);
      }

      this.lastCheckedKey = item.key;
      this.lastCheckedValue = checked;
    },
    focusRow(key) {
      this.$nextTick(() => {
        const row = this.$el.querySelector(`[data-row-key="${this.encodeKey(key)}"]`);
        row && row.focus();
      });
    },
    nodeKeyDown(item, event) {
      if (!item) {
        return;
      }

      this.currentKey = item.key;

      if (event.key === 'ArrowRight' && !item.isLeaf && !item.expanded) {
        event.preventDefault();
        this.toggleExpand(item);
        return;
      }

      if (event.key === 'ArrowLeft' && !item.isLeaf && item.expanded) {
        event.preventDefault();
        this.toggleExpand(item);
        return;
      }

      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const index = this.visibleNodes.findIndex(node => node.key === item.key);
      const next = this.visibleNodes[index + (event.key === 'ArrowDown' ? 1 : -1)];

      if (!next) {
        return;
      }

      this.currentKey = next.key;
      this.focusRow(next.key);

      if (next.isLeaf) {
        this.clickKey(Buffer.from(next.data.nameBuffer.data));
      }
    },
    showMultiSelect() {
      this.multiOperating = true;
    },
    hideMultiSelect() {
      this.multiOperating = false;
      this.checkAllSelect = false;
      this.checkedLeafKeys = [];
      this.lastCheckedKey = '';
      this.lastCheckedValue = false;
    },
    hideAllMenus() {
      const menus = document.querySelectorAll('.key-list-right-menu');

      if (!menus.length) {
        return;
      }

      for (const menu of menus) {
        menu.style.display = 'none';
      }
    },
    clickItem(type) {
      if (!this.rightClickNode) {
        return;
      }

      this.rightClickItem = type;

      switch (type) {
        case 'copy': {
          electron.writeText(this.rightClickNode.data.name);
          break;
        }
        case 'delete': {
          if (this.multiOperating) {
            return this.deleteBatch();
          }

          const keyBuffer = Buffer.from(this.rightClickNode.data.nameBuffer.data);

          this.client.del(keyBuffer).then((reply) => {
            if (reply == 1) {
              this.$message.success({
                message: this.$t('message.delete_success'),
                duration: 1000,
              });

              this.$bus.$emit('refreshKeyList', this.client, keyBuffer, 'del');
            } else {
              this.$message.error(this.$t('message.delete_failed'));
            }
          }).catch((e) => { this.$message.error(e.message); });
          break;
        }
        case 'multiple_select': {
          this.showMultiSelect();
          break;
        }
        case 'open': {
          this.clickKey(Buffer.from(this.rightClickNode.data.nameBuffer.data), true);
          break;
        }
        case 'delete_folder': {
          const rule = { pattern: [this.rightClickNode.data.fullName] };
          this.$bus.$emit('openDelBatch', this.client, this.config.connectionName, rule);
          break;
        }
        case 'memory_analysis': {
          const pattern = this.rightClickNode.data.fullName;
          this.$bus.$emit('memoryAnalysis', this.client, this.config.connectionName, pattern);
          break;
        }
        case 'export': {
          if (!this.multiOperating) {
            this.updateCheckedLeafKeys([this.rightClickNode.key], true);
            this.showMultiSelect();
          } else {
            this.exportBatch();
          }

          break;
        }
        case 'load_cur_folder': {
          const pattern = this.rightClickNode.data.fullName;
          this.$bus.$emit('changeMatchMode', this.client, pattern);
          break;
        }
      }
    },
    toggleCheckAll(checked) {
      this.checkAllSelect = checked;
      this.checkedLeafKeys = checked ? this.leafKeys.slice() : [];
    },
    syncCheckAllSelect() {
      this.checkAllSelect = this.leafKeys.length > 0
        && this.leafKeys.every(key => this.checkedLeafKeys.includes(key));
    },
    deleteBatch() {
      const rule = { key: [], pattern: [] };

      for (const key of this.checkedLeafKeys) {
        const node = this.nodeMap[key];
        node && rule.key.push(Buffer.from(node.nameBuffer.data));
      }

      this.hideMultiSelect();
      this.$bus.$emit('openDelBatch', this.client, this.config.connectionName, rule);
    },
    exportBatch() {
      const keys = [];

      if (!this.checkedLeafKeys.length) {
        this.$message.warning('Please select keys!');
        return;
      }

      for (const key of this.checkedLeafKeys) {
        const node = this.nodeMap[key];
        node && keys.push(Buffer.from(node.nameBuffer.data));
      }

      this.hideMultiSelect();
      this.$emit('exportBatch', keys);
    },
    clickKey(key, newTab = false) {
      this.$bus.$emit('clickedKey', this.client, key, newTab);
    },
  },
  watch: {
    keyList(newList) {
      let newListCopy = newList;

      if (newList.length > this.treeNodesOverflow) {
        newListCopy = newList.slice(0, this.treeNodesOverflow);
        this.$nextTick(() => {
          this.$message.warning({
            message: this.$t('message.tree_node_overflow', { num: this.treeNodesOverflow }),
            duration: 6000,
          });
        });
      }

      const keyNodes = this.separator
        ? this.$util.keysToTree(newListCopy, this.separator, new Set(this.expandedKeys), this.treeNodesOverflow)
        : this.$util.keysToList(newListCopy);

      this.sortTreeNodes(keyNodes);
      this.keyNodes = keyNodes;
      this.buildNodeMeta(keyNodes);

      this.expandedKeys = this.expandedKeys.filter(key => this.folderKeys.includes(key));
      this.checkedLeafKeys = this.checkedLeafKeys.filter(key => this.leafKeys.includes(key));

      if (newListCopy.length <= 20) {
        this.expandedKeys = this.folderKeys.slice();
      }

      if (this.currentKey && !this.nodeMap[this.currentKey]) {
        this.currentKey = '';
      }

      this.syncCheckAllSelect();
    },
  },
};
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
