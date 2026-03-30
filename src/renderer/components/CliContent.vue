<template>
  <div class="cli-content-container">
    <!-- monaco editor div -->
    <div
      ref="editor"
      class="monaco-editor-con"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import bus from '@/bus'
import { getFontFamily } from '@/storage'

const props = defineProps({
  content: { type: String, default: () => {} },
})

const editor = ref(null)
let monacoEditor = null

const changeFont = (fontFamily) => {
  monacoEditor && monacoEditor.updateOptions({
    fontFamily,
  })
}

const scrollToBottom = () => {
  monacoEditor.revealLine(monacoEditor.getModel().getLineCount())
}

watch(() => props.content, (newVal) => {
  monacoEditor.setValue(newVal)
})

onMounted(() => {
  monacoEditor = monaco.editor.create(
    editor.value,
    {
      value: props.content,
      theme: 'vs-dark',
      language: 'plaintext',
      links: false,
      readOnly: true,
      cursorStyle: 'underline-thin',
      lineNumbers: 'off',
      contextmenu: false,
      // set fontsize and family to avoid cursor offset
      fontSize: 14,
      fontFamily: getFontFamily(),
      showFoldingControls: 'always',
      // auto layout, performance cost
      automaticLayout: true,
      wordWrap: 'on',
      // wordWrapColumn: 120,
      // long text indent when wrapped
      wrappingIndent: 'none',
      // cursor line highlight
      renderLineHighlight: 'none',
      // highlight word when cursor in
      occurrencesHighlight: false,
      // disable scroll one page at last line
      scrollBeyondLastLine: false,
      // hide scroll sign of current line
      hideCursorInOverviewRuler: true,
      minimap: {
        enabled: false,
      },
      // vertical line
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
  )

  // hide tooltip in readonly mode
  const messageContribution = monacoEditor.getContribution('editor.contrib.messageController')
  monacoEditor.onDidAttemptReadOnlyEdit(() => {
    messageContribution.dispose()
  })

  bus.$on('fontInited', changeFont)
})

onBeforeUnmount(() => {
  monacoEditor && monacoEditor.dispose()
  bus.$off('fontInited', changeFont)
})

defineExpose({
  scrollToBottom,
})
</script>

<style type="text/css">
  .cli-content-container .monaco-editor-con {
    min-height: 150px;
    height: calc(100vh - 123px);
    clear: both;
    overflow: hidden;
    background: #263238;
    border: 1px solid #e4e7ed;
    border-bottom: 0px;
    border-radius: 4px 4px 0 0;
  }
  .dark-mode .cli-content-container .monaco-editor-con {
    background: #324148;
    border-color: #7f8ea5;
  }

  /* font color*/
  .cli-content-container .monaco-editor-con .mtk1 {
    color: #d3d5d9;
  }
  .dark-mode .cli-content-container .monaco-editor-con .mtk1 {
    color: #e8e8e8;
  }

  /*hide cursor*/
  .cli-content-container .monaco-editor .cursors-layer > .cursor {
    display: none !important;
  }

  /*change default scrollbar style*/
  .cli-content-container .monaco-editor .scrollbar {
    background: #eaeaea;
    border-radius: 4px;
  }
  .dark-mode .cli-content-container .monaco-editor .scrollbar {
    background: #425057;
  }
  .cli-content-container .monaco-editor .scrollbar:hover {
    background: #e0e0dd;
  }
  .dark-mode .cli-content-container .monaco-editor .scrollbar:hover {
    background: #495961;
  }

  .cli-content-container .monaco-editor-con .monaco-editor .slider {
    border-radius: 4px;
    background: #c1c1c1;
  }
  .dark-mode .cli-content-container .monaco-editor-con .monaco-editor .slider {
    background: #5a6f7a;
  }
  .cli-content-container .monaco-editor-con .monaco-editor .slider:hover {
    background: #7f7f7f;
  }
  .dark-mode .cli-content-container .monaco-editor-con .monaco-editor .slider:hover {
    background: #6a838f;
  }

  /*remove background color*/
  .cli-content-container .monaco-editor .margin {
    background-color: inherit;
  }

  .cli-content-container .monaco-editor-con .monaco-editor,
  .cli-content-container .monaco-editor-con .monaco-editor-background,
  .cli-content-container .monaco-editor-con .monaco-editor .inputarea.ime-input {
    background-color: inherit;
  }
</style>
