import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
// import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  main: {
    // Electron 主进程：CommonJS 输出
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: [
          'electron',
          'electron-updater',
          'font-list',
          /^node:.*/
        ]
      }
    }
  },
  preload: {
    // Preload 脚本：CommonJS 输出
    build: {
      outDir: 'dist/preload'
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    plugins: [
      vue(),
      // TODO: Fix Monaco Editor plugin configuration
      // monacoEditorPlugin({
      //   languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html']
      // })
    ],
    server: {
      port: 9988
    },
    build: {
      outDir: 'dist/renderer'
    }
  }
})
