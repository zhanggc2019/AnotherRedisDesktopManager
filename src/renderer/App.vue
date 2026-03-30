<template>
  <el-config-provider :locale="elementLocale">
    <el-container
      class="wrap-container"
      spellcheck="false"
    >
      <!-- left aside draggable container -->
      <div
        class="aside-drag-container"
        :style="{width: sideWidth + 'px'}"
      >
        <!-- connections -->
        <el-aside class="aside-connection">
          <Aside />
        </el-aside>

        <!-- drag area -->
        <div id="drag-resize-container">
          <div id="drag-resize-pointer" />
        </div>
      </div>

      <!-- right main container -->
      <el-container class="right-main-container">
        <!-- tab container -->
        <el-main class="main-tabs-container">
          <Tabs />
        </el-main>
      </el-container>

      <UpdateCheck />
    </el-container>
  </el-config-provider>
</template>

<script setup>
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import Aside from '@/Aside.vue';
import Tabs from '@/components/Tabs.vue';
import UpdateCheck from '@/components/UpdateCheck.vue';
import { getElementLocale, localeState } from '@/i18n/i18n';
import addon from './addon';
import bus from '@/bus';

// State
const sideWidth = ref(265);

// Computed
const elementLocale = computed(() => getElementLocale(localeState.value));

// Methods
const restoreSideBarWidth = () => {
  const { sideWidth: savedWidth } = localStorage;
  if (savedWidth) {
    sideWidth.value = savedWidth;
  }
};

const bindSideBarDrag = () => {
  const dragPointer = document.getElementById('drag-resize-pointer');

  const mousemove = (e) => {
    const mouseX = e.x;
    const dragSideWidthValue = mouseX - 17;

    if ((dragSideWidthValue > 200) && (dragSideWidthValue < 1500)) {
      sideWidth.value = dragSideWidthValue;
    }
  };

  const mouseup = (_e) => {
    document.documentElement.removeEventListener('mousemove', mousemove);
    document.documentElement.removeEventListener('mouseup', mouseup);

    // store side bar width
    localStorage.sideWidth = sideWidth.value;
  };

  dragPointer.addEventListener('mousedown', (e) => {
    e.preventDefault();

    document.documentElement.addEventListener('mousemove', mousemove);
    document.documentElement.addEventListener('mouseup', mouseup);
  });
};

// Lifecycle
onMounted(() => {
  // Restore side bar width
  restoreSideBarWidth();

  // Setup event listener
  bus.$on('reloadSettings', () => {
    addon.reloadSettings();
  });

  // Bind drag functionality
  bindSideBarDrag();

  // addon init setup
  addon.setup();

  // Emit update-check after 2 seconds
  setTimeout(() => {
    bus.$emit('update-check');
  }, 2000);
});

onUnmounted(() => {
  // Clean up event listener
  bus.$off('reloadSettings', () => {
    addon.reloadSettings();
  });
});
</script>

<style type="text/css">
html {
  height: 100%;
}
body {
  height: 100%;
  padding: 8px;
  margin: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;

  /*fix body scroll-y caused by tooltip in table*/
  overflow: hidden;
}

button, input, textarea, .vjs__tree {
  font-family: inherit !important;
}
a {
  color: #8e8d8d;
}


/*fix el-select bottom scroll bar*/
.el-scrollbar__wrap {
  overflow-x: hidden;
}

/*scrollbar style start*/
::-webkit-scrollbar {
  width: 9px;
}
/*track*/
::-webkit-scrollbar-track {
  background: #eaeaea;
  border-radius: 4px;
}
.dark-mode ::-webkit-scrollbar-track {
  background: #425057;
}
/*track hover*/
::-webkit-scrollbar-track:hover {
  background: #e0e0dd;
}
.dark-mode ::-webkit-scrollbar-track:hover {
  background: #495961;
}
/*thumb*/
::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: #c1c1c1;
}
.dark-mode ::-webkit-scrollbar-thumb {
  background: #5a6f7a;
}
/*thumb hover*/
::-webkit-scrollbar-thumb:hover {
  background: #7f7f7f;
}
.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: #6a838f;
}
/*scrollbar style end*/

/*list index*/
li .list-index {
  color: #828282;
  /*font-size: 80%;*/
  user-select: none;
  margin-right: 10px;
  min-width: 28px;
}
.dark-mode li .list-index {
  color: #adacac;
}

.wrap-container {
  height: 100%;
}
.aside-drag-container {
  position: relative;
  user-select: none;
  /*max-width: 50%;*/
}
.aside-connection {
  height: 100%;
  width: 100% !important;
  border-right: 1px solid #e4e0e0;
  overflow: hidden;
}
/*fix right container imdraggable*/
.right-main-container {
  width: 10%;
}
.right-main-container .main-tabs-container {
  overflow-y: hidden;
  padding-top: 0px;
  padding-right: 4px;
}

.el-message-box .el-message-box__message {
  word-break: break-all;
  overflow-y: auto;
  max-height: 80vh;
}

#drag-resize-container {
  position: absolute;
  /*height: 100%;*/
  width: 10px;
  right: -12px;
  top: 0px;
}
#drag-resize-pointer {
  position: fixed;
  height: 100%;
  width: 10px;
  cursor: col-resize;
}
#drag-resize-pointer::after {
  content: "";
  display: inline-block;
  width: 2px;
  height: 20px;
  border-left: 1px solid #adabab;
  border-right: 1px solid #adabab;

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}
.dark-mode #drag-resize-pointer::after {
  border-left: 1px solid #b9b8b8;
  border-right: 1px solid #b9b8b8;
}

@keyframes rotate {
  to{ transform: rotate(360deg); }
}

/*vxe-table dark-mode color*/
html .dark-mode {
  --vxe-ui-table-header-background-color: #273239 !important;
  --vxe-ui-layout-background-color: #273239 !important;
  --vxe-ui-table-row-striped-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-striped-background-color: #50646f !important;
  /*border color*/
  --vxe-ui-table-border-color: #7f8ea5 !important;
  /*font color*/
  --vxe-ui-font-color: #f3f3f4 !important;
  --vxe-ui-table-header-font-color: #f3f3f4 !important;
}
</style>
