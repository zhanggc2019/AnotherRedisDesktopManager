<template>
  <div class="text-formated-container">
    <slot name="default" />
    <!-- collapse btn -->
    <div class="collapse-container">
      <el-button
        class="collapse-btn"
        type="text"
        @click="toggleCollapse"
      >
        {{ $t('message.' + collapseText) }}
      </el-button>
    </div>

    <!-- monaco editor div -->
    <div
      ref="editor"
      class="monaco-editor-con"
    />
  </div>
</template>

<script setup>
import {
  ref, computed, watch, nextTick, onMounted, onUnmounted,
} from 'vue';
import { useI18n } from '@/composables/useI18n';
import { $util, $message, $storage } from '@/main';
import bus from '@/bus';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

const JSONbig = require('@qii404/json-bigint')({ useNativeBigInt: false });

const props = defineProps({
  content: { type: [Array, String], default: () => {} },
  readOnly: { type: Boolean, default: true },
});

const { t } = useI18n();

const editor = ref(null);
const monacoEditor = ref(null);
const collapseText = ref('collapse_all');
let resizeDebounce = null;

const newContentStr = computed(() => {
  if (typeof props.content === 'string') {
    return props.content;
  }
  return JSONbig.stringify(props.content, null, 4);
});

const getContent = () => {
  const content = monacoEditor.value.getValue();

  if (!$util.isJson(content)) {
    $message.error(t('message.json_format_failed'));
    return false;
  }

  return Buffer.from(JSONbig.stringify(JSONbig.parse(content), null, 0));
};

const getRawContent = (removeJsonSpace = false) => {
  let content = monacoEditor.value.getValue();

  if (removeJsonSpace) {
    if ($util.isJson(content)) {
      content = JSONbig.stringify(JSONbig.parse(content), null, 0);
    }
  }

  return content;
};

const toggleCollapse = () => {
  if (collapseText.value === 'expand_all') {
    monacoEditor.value.trigger('fold', 'editor.unfoldAll');
  } else {
    monacoEditor.value.trigger('fold', 'editor.foldAll');
  }
  collapseText.value = collapseText.value === 'expand_all' ? 'collapse_all' : 'expand_all';
};

const onResize = () => {
  if (!resizeDebounce) {
    resizeDebounce = $util.debounce(() => {
      monacoEditor.value && monacoEditor.value.layout();
    }, 200);
  }

  resizeDebounce();
};

const changeFont = (fontFamily) => {
  monacoEditor.value && monacoEditor.value.updateOptions({
    fontFamily,
  });
};

watch(() => props.content, () => {
  nextTick(() => {
    monacoEditor.value.setValue(newContentStr.value);
  });
});

onMounted(() => {
  monacoEditor.value = monaco.editor.create(
    editor.value,
    {
      value: newContentStr.value,
      theme: 'vs-dark',
      language: 'json',
      links: false,
      readOnly: props.readOnly,
      cursorStyle: props.readOnly ? 'underline-thin' : 'line',
      lineNumbers: 'off',
      contextmenu: false,
      fontSize: 14,
      fontFamily: $storage.getFontFamily(),
      showFoldingControls: 'always',
      automaticLayout: true,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      renderLineHighlight: 'none',
      occurrencesHighlight: false,
      scrollBeyondLastLine: false,
      hideCursorInOverviewRuler: true,
      accessibilitySupport: 'off',
      minimap: {
        enabled: false,
      },
      guides: {
        indentation: false,
        highlightActiveIndentation: false,
      },
      scrollbar: {
        useShadows: false,
        verticalScrollbarSize: '9px',
        horizontalScrollbarSize: '9px',
      },
    },
  );

  bus.$on('fontInited', changeFont);
});

onUnmounted(() => {
  monacoEditor.value && monacoEditor.value.dispose();
  bus.$off('fontInited', changeFont);
});

defineExpose({
  getContent,
  getRawContent,
});
</script>

<style type="text/css">
  .text-formated-container .monaco-editor-con {
    min-height: 150px;
    height: calc(100vh - 730px);
    clear: both;
    overflow: hidden;
    background: none;
  }
  /*recovery collapse icon font in monaco*/
  .text-formated-container .monaco-editor .codicon {
    font-family: codicon !important;
  }

  /*change default scrollbar style*/
  .text-formated-container .monaco-editor .scrollbar {
    background: #eaeaea;
    border-radius: 4px;
  }
  .dark-mode .text-formated-container .monaco-editor .scrollbar {
    background: #425057;
  }
  .text-formated-container .monaco-editor .scrollbar:hover {
    background: #e0e0dd;
  }
  .dark-mode .text-formated-container .monaco-editor .scrollbar:hover {
    background: #495961;
  }

  .text-formated-container .monaco-editor-con .monaco-editor .slider {
    border-radius: 4px;
    background: #c1c1c1;
  }
  .dark-mode .text-formated-container .monaco-editor-con .monaco-editor .slider {
    background: #5a6f7a;
  }
  .text-formated-container .monaco-editor-con .monaco-editor .slider:hover {
    background: #7f7f7f;
  }
  .dark-mode .text-formated-container .monaco-editor-con .monaco-editor .slider:hover {
    background: #6a838f;
  }

  /*remove background color*/
  .text-formated-container .monaco-editor .margin {
    background-color: inherit;
  }
  .text-formated-container .monaco-editor-con .monaco-editor,
  .text-formated-container .monaco-editor-con .monaco-editor-background,
  .text-formated-container .monaco-editor-con .monaco-editor .inputarea.ime-input {
    background-color: inherit;
  }

  /*json key color*/
  .text-formated-container .monaco-editor-con .mtk4 {
    color: #111111;
  }
  .dark-mode .text-formated-container .monaco-editor-con .mtk4 {
    color: #ebebec;
  }
  /*json val string color*/
  .text-formated-container .monaco-editor-con .mtk5 {
    color: #42b983;
  }
  /*json val number color*/
  .text-formated-container .monaco-editor-con .mtk6 {
    color: #fc1e70;
  }
  /*json bracket color*/
  .text-formated-container .monaco-editor-con .mtk9 {
    color: #111111;
  }
  /*json bracket color*/
  .dark-mode .text-formated-container .monaco-editor-con .mtk9 {
    color: #b6b6b9;
  }

  /* common string in json editor*/
  .text-formated-container .monaco-editor-con .mtk1 {
    color: #606266;
  }
  .dark-mode .text-formated-container .monaco-editor-con .mtk1 {
    color: #f3f3f4;
  }
</style>
