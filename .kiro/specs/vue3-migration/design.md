# Design Document: Vue3 Migration

## Overview

本文档描述将 Another Redis Desktop Manager（ARDM）从 Vue 2 + Webpack 4 + ElementUI 完整迁移到 Vue 3 + Vite + Element Plus + Composition API 的技术设计方案。

迁移目标是"脱胎换骨"式的完整升级：
- 所有组件强制使用 `<script setup>` 语法，零 Options API 残留
- 构建工具从 Webpack 4 迁移到 `electron-vite`，删除全部旧配置
- 可复用逻辑统一提取为 Composable（`useXxx` 命名规范）
- Electron 安全模型升级（`contextIsolation: true` + `contextBridge`）
- 模块系统统一为 ES Module

### 当前状态分析

`package.json` 已引入 Vue 3、Element Plus、vue-i18n v9 等新依赖，部分基础设施已完成迁移：
- `src/main.js`：已使用 `createApp()`，已注册 `app.config.globalProperties`
- `src/i18n/i18n.js`：已使用 `createI18n()`，已集成 Element Plus 语言包
- `src/router/index.js`：已使用 `createRouter()` + `createWebHashHistory()`
- `src/electron.js`：已通过 `window.electronAPI` 优先访问 IPC
- `pack/electron/preload.js`：已实现 `contextBridge` 白名单机制

**待完成的核心工作**：
- 约 40+ 个组件仍使用 Options API（`data()`、`methods`、`computed` 等）
- 构建工具仍为 Webpack 4（`build/` 和 `config/` 目录）
- Electron 主进程仍设置 `nodeIntegration: true`、`contextIsolation: false`
- ESLint 配置仍为旧版（`eslint-plugin-vue` v5）

---

## Architecture

### 目标架构

```
ARDM (electron-vite)
├── electron.vite.config.js          # 统一构建配置入口
├── src/
│   ├── main/                        # Electron 主进程
│   │   └── index.js                 # electron-main.js 迁移目标
│   ├── preload/                     # Preload 脚本
│   │   └── index.js                 # preload.js 迁移目标
│   └── renderer/                    # Vue 渲染进程
│       ├── index.html
│       ├── main.js                  # createApp 入口
│       ├── App.vue                  # 根组件（<script setup>）
│       ├── Aside.vue
│       ├── bus.js                   # mitt 事件总线
│       ├── electron.js              # IPC 封装层
│       ├── storage.js               # localStorage 封装
│       ├── util.js                  # 工具函数
│       ├── shortcut.js              # 快捷键
│       ├── composables/             # 可复用逻辑（新增）
│       │   ├── useConnection.js
│       │   ├── useKeyList.js
│       │   ├── useTheme.js
│       │   ├── useI18n.js
│       │   └── useRedisClient.js
│       ├── components/              # Vue 组件（全部迁移为 <script setup>）
│       ├── i18n/
│       ├── router/
│       └── types/                   # TypeScript 类型声明（新增）
│           ├── connection.d.ts
│           ├── redis.d.ts
│           └── electron.d.ts
```

### 构建架构（electron-vite）

```
electron-vite 统一管理三个构建目标：
┌─────────────────────────────────────────────┐
│  electron.vite.config.js                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  main    │ │ preload  │ │  renderer   │ │
│  │ (CJS/ESM)│ │  (CJS)   │ │  (Vite)     │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└─────────────────────────────────────────────┘
```

### 数据流架构

```
Renderer Process (Vue 3)
  ├── App.vue (el-config-provider)
  │   ├── Aside.vue
  │   │   └── Connections.vue → useConnection composable
  │   └── Tabs.vue
  │       └── KeyDetail.vue → useKeyList composable
  │
  ├── Event Bus (mitt)
  │   └── bus.js: $on / $off / $emit
  │
  └── IPC Layer (electron.js)
      └── window.electronAPI (contextBridge)
          └── Electron Main Process
```

---

## Components and Interfaces

### 构建配置（electron.vite.config.js）

```javascript
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  main: {
    // Electron 主进程：CommonJS 输出
    build: { outDir: 'dist/main' }
  },
  preload: {
    // Preload 脚本：CommonJS 输出
    build: { outDir: 'dist/preload' }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: { '@': resolve('src/renderer') }
    },
    plugins: [
      vue(),
      monacoEditorPlugin({ /* worker 配置 */ })
    ],
    server: { port: 9988 },
    build: { outDir: 'dist/renderer' }
  }
})
```

### Composable 接口设计

**useConnection.js** — 连接管理逻辑
```typescript
interface UseConnectionReturn {
  connections: Ref<Connection[]>
  globalSettings: Ref<Settings>
  filterMode: Ref<string>
  filteredConnections: ComputedRef<Connection[]>
  initConnections(): void
  sortOrder(el: HTMLElement): void
}
export function useConnection(): UseConnectionReturn
```

**useKeyList.js** — Key 列表管理
```typescript
interface UseKeyListReturn {
  keyList: Ref<KeyItem[]>
  loading: Ref<boolean>
  searchPattern: Ref<string>
  loadKeys(client: Redis, db: number): Promise<void>
  refreshKeys(): void
}
export function useKeyList(client: Ref<Redis>): UseKeyListReturn
```

**useTheme.js** — 主题管理
```typescript
interface UseThemeReturn {
  isDark: Ref<boolean>
  toggleTheme(theme: 'dark' | 'light' | 'system'): void
  initTheme(): void
}
export function useTheme(): UseThemeReturn
```

**useRedisClient.js** — Redis 客户端封装
```typescript
interface UseRedisClientReturn {
  client: Ref<Redis | null>
  connecting: Ref<boolean>
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): void
}
export function useRedisClient(): UseRedisClientReturn
```

### Electron IPC 桥接接口（contextBridge）

preload 脚本通过 `contextBridge.exposeInMainWorld('electronAPI', ...)` 暴露以下接口：

```typescript
interface ElectronAPI {
  // 单向发送（fire-and-forget）
  send(channel: SendChannel, ...args: unknown[]): void
  // 双向调用（返回 Promise）
  invoke(channel: InvokeChannel, ...args: unknown[]): Promise<unknown>
  // 同步调用（阻塞）
  sendSync(channel: SyncChannel, ...args: unknown[]): unknown
  // 监听主进程推送事件，返回取消监听函数
  on(channel: OnChannel, listener: (...args: unknown[]) => void): () => void
}

type SendChannel = 'hideWindow' | 'minimizeWindow' | 'toggleMaximize'
  | 'get-all-fonts' | 'update-check' | 'continue-update'

type InvokeChannel = 'getMainArgs' | 'changeTheme' | 'getTempPath'
  | 'dialog:showOpenDialog' | 'clipboard:writeText' | 'shell:openExternal'

type SyncChannel = 'fs:readFileSync'

type OnChannel = 'send-all-fonts' | 'closingWindow' | 'os-theme-updated'
  | 'update-available' | 'update-not-available' | 'update-error'
  | 'download-progress' | 'update-downloaded'
```

渲染进程通过 `src/electron.js` 封装层访问，不直接使用 `window.electronAPI`。

### Element Plus 集成方案

**根组件包裹**（App.vue）：
```vue
<template>
  <el-config-provider :locale="elementLocale">
    <!-- 应用内容 -->
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { getElementLocale, localeState } from '@/i18n/i18n'
const elementLocale = computed(() => getElementLocale(localeState.value))
</script>
```

**图标注册**（main.js）：
```javascript
// 按需导入，不全局注册所有图标
// 通过 resolveElIcon() 工具函数在组件内按需使用
import { resolveElIcon } from '@/element-plus-icons'
```

**暗色主题**：
- 移除 `static/theme/dark/index.css` 的手动覆盖方案
- 改用 Element Plus 官方暗色模式：在 `<html>` 元素添加 `class="dark"` 触发 CSS 变量切换
- 自定义 CSS 变量覆盖在 `src/renderer/styles/dark-override.css` 中维护

### 组件迁移模式（Options API → `<script setup>`）

以 `Connections.vue` 为例，迁移前后对比：

**迁移前（Options API）**：
```javascript
export default {
  data() { return { connections: [], filterMode: '' } },
  components: { ConnectionWrapper, ScrollToTop },
  created() { this.$bus.$on('refreshConnections', this.initConnections) },
  computed: { filteredConnections() { ... } },
  methods: { initConnections() { ... } },
  mounted() { this.initConnections(); this.sortOrder() }
}
```

**迁移后（`<script setup>`）**：
```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConnection } from '@/composables/useConnection'
import bus from '@/bus'

const { connections, filteredConnections, filterMode, initConnections, sortOrder } = useConnection()

onMounted(() => {
  initConnections()
  sortOrder(connectionsListRef.value)
  bus.$on('refreshConnections', initConnections)
})
onUnmounted(() => bus.$off('refreshConnections', initConnections))
</script>
```

---

## Data Models

### 连接配置（ConnectionConfig）

```typescript
interface ConnectionConfig {
  key: string                    // 唯一标识
  name?: string                  // 显示名称
  host: string
  port: number
  auth?: string                  // 密码
  username?: string              // ACL 用户名
  db?: number                    // 默认数据库
  connectionName?: string        // Redis CLIENT SETNAME
  connectionReadOnly?: boolean   // 只读模式
  order?: number                 // 排序权重
  // SSH 隧道
  sshOptions?: SSHOptions
  // SSL/TLS
  sslOptions?: TLSOptions
  // 集群
  cluster?: boolean
  natMap?: Record<string, { host: string; port: number }>
  // Sentinel
  sentinelOptions?: SentinelOptions
}
```

### Redis Key 信息（KeyInfo）

```typescript
interface KeyInfo {
  name: string                   // key 名称（字符串形式）
  nameBuffer: { type: 'Buffer'; data: number[] }  // 原始 Buffer（JSON 序列化形式）
  key: string                    // 唯一标识（同 name）
  keyNode?: boolean              // 是否为叶子节点
  // 树形结构专用
  children?: KeyInfo[]
  keyCount?: number
  open?: boolean
  fullName?: string
}
```

### 应用设置（Settings）

```typescript
interface Settings {
  fontFamily?: string[]
  fontSize?: number
  theme?: 'light' | 'dark' | 'system'
  lang?: string
  zoomFactor?: number
  customSeparator?: string
  maxKeys?: number
}
```

### IPC 消息类型

```typescript
// getMainArgs 响应
interface MainArgs {
  argv: string[]
  version: string
}

// os-theme-updated 事件载荷
interface ThemeUpdate {
  shouldUseDarkColors: boolean
  themeSource: 'system' | 'light' | 'dark'
}

// dialog:showOpenDialog 响应
interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: 零 Options API 残留

*For any* `.vue` 文件，其 `<script>` 块中不应包含 Options API 模式（`data()`、`methods:`、`computed:`、`watch:`、`mounted()`、`created()`、`destroyed()`、`components:` 选项、`export default { ... }` 对象式导出）。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3, 3.4**

### Property 2: 零 this.$xxx 访问

*For any* `.vue` 文件，其 `<script setup>` 块中不应出现 `this.$bus`、`this.$util`、`this.$storage`、`this.$shortcut`、`this.$message`、`this.$notify`、`this.$confirm`、`this.$prompt`、`this.$alert`、`this.$router`、`this.$route`、`this.$t`、`this.$on`、`this.$off` 等实例属性访问模式。

**Validates: Requirements 2.7, 4.1, 5.2, 6.5, 8.2**

### Property 3: 零 element-ui 引用

*For any* `src/` 目录下的源码文件，不应包含对 `element-ui` 包的 `import` 或 `require` 引用。

**Validates: Requirements 6.1**

### Property 4: 零旧式图标用法

*For any* `.vue` 文件，不应包含 `<i class="el-icon-` 形式的旧式 ElementUI 图标用法。

**Validates: Requirements 6.7**

### Property 5: 渲染进程不直接 require electron

*For any* `src/` 目录下的渲染进程源码文件，不应包含 `require('electron')` 或 `require("electron")` 的直接调用（`src/electron.js` 本身除外，该文件是 IPC 封装层）。

**Validates: Requirements 7.3**

### Property 6: 所有 IPC 通道均已注册

*For any* 在 `preload.js` 白名单中声明的 IPC 通道（`sendChannels`、`invokeChannels`、`syncChannels`、`onChannels`），主进程 `electron-main.js` 中均应存在对应的 `ipcMain.on()`、`ipcMain.handle()` 或 `nativeTheme.on()` 处理器。

**Validates: Requirements 7.6**

### Property 7: 所有语言均包含 el 命名空间

*For any* i18n 支持的语言（en、cn、tw、tr、ru、pt、de、fr、ua、it、es、ko、vi，共 13 种），其对应的消息对象中均应包含 `el` 命名空间（来自 Element Plus 语言包合并）。

**Validates: Requirements 8.3, 8.4**

### Property 8: setLocale 同步更新双端 locale

*For any* 有效的语言代码，调用 `setLocale(lang)` 后，`localeState.value` 和 `i18n.global.locale` 均应更新为该语言代码。

**Validates: Requirements 8.5**

### Property 9: 主题切换正确更新 DOM 和 IPC

*For any* 主题值（`'dark'`、`'light'`、`'system'`），调用 `useTheme().toggleTheme(theme)` 后：
- 当 `theme === 'dark'` 时，`document.documentElement.classList` 应包含 `'dark'`
- 当 `theme === 'light'` 时，`document.documentElement.classList` 不应包含 `'dark'`
- 应调用 `electron.invoke('changeTheme', theme)` 通知主进程

**Validates: Requirements 11.1, 11.3, 11.5**

### Property 10: 渲染进程源码统一使用 ES Module

*For any* `src/` 目录下的 `.js` 或 `.vue` 文件，不应包含 CommonJS 的 `require(` 调用（Node.js 内置模块如 `zlib`、`fs` 在 `util.js` 中的使用除外，这些在 Electron 渲染进程中通过 Node.js 集成访问）。

**Validates: Requirements 14.3**

---

## Error Handling

### 渲染进程错误处理

```javascript
// main.js
app.config.errorHandler = (err, instance, info) => {
  const componentName = instance?.$?.type?.name
    || instance?.$?.type?.__name
    || 'anonymous'
  const payload = {
    componentName,
    info,
    message: err?.message ?? String(err),
    stack: err?.stack ?? '',
  }
  window.__lastVueError = payload
  console.error('[vue-error]', JSON.stringify(payload))
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason)
})
```

### Redis 连接错误处理

`redisClient.js` 中的错误处理策略：
- **连接超时**：`connectTimeout: 30000`，超时后触发 `retryStrategy`
- **重试策略**：最多重试 3 次，间隔递增（200ms、400ms、600ms），超过后通过 bus 发送 `closeConnection` 事件
- **只读模式**：写命令被拦截，直接 reject 并提示用户
- **SSH 隧道失败**：Promise reject，由调用方处理并展示错误信息

### IPC 错误处理

`electron.js` 封装层的错误处理：
- `invoke()` 返回 Promise，调用方通过 `.catch()` 处理
- `sendSync()` 同步调用，异常直接抛出，调用方需 try/catch
- 不支持的 channel 抛出 `Error: Unsupported channel: xxx`

### 组件级错误边界

对于数据格式查看器（`viewers/`）中的解析操作，统一使用 try/catch 包裹，解析失败时显示原始文本而非崩溃。

---

## Testing Strategy

### 双轨测试方案

本项目采用单元测试 + 属性测试的双轨方案：

- **单元测试**：验证具体示例、边界条件、错误处理
- **属性测试**：验证跨所有输入的通用属性（上述 10 个 Correctness Properties）

两者互补，共同保证迁移正确性。

### 属性测试配置

**推荐库**：[fast-check](https://github.com/dubzzz/fast-check)（TypeScript 友好，支持 Vitest）

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
```

每个属性测试最少运行 **100 次迭代**：

```javascript
import { test } from 'vitest'
import * as fc from 'fast-check'

// Feature: vue3-migration, Property 8: setLocale 同步更新双端 locale
test('setLocale updates both localeState and i18n.global.locale', () => {
  const validLangs = ['en', 'cn', 'tw', 'tr', 'ru', 'pt', 'de', 'fr', 'ua', 'it', 'es', 'ko', 'vi']
  fc.assert(
    fc.property(fc.constantFrom(...validLangs), (lang) => {
      setLocale(lang)
      expect(localeState.value).toBe(lang)
      expect(i18n.global.locale).toBe(lang)
    }),
    { numRuns: 100 }
  )
})
```

### 静态分析测试（Properties 1-5, 10）

Properties 1、2、3、4、5、10 本质上是代码静态分析属性，通过扫描源码文件验证：

```javascript
import { glob } from 'glob'
import { readFileSync } from 'fs'
import { test, expect } from 'vitest'

// Feature: vue3-migration, Property 1: 零 Options API 残留
test('no Options API in any .vue file', async () => {
  const files = await glob('src/**/*.vue')
  const optionsApiPatterns = [
    /export default \{/,
    /\bdata\s*\(\s*\)\s*\{/,
    /\bmethods\s*:/,
    /\bcomputed\s*:/,
  ]
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    // 排除 <script setup> 块外的内容检查
    const scriptBlock = content.match(/<script(?!\s+setup)[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
    for (const pattern of optionsApiPatterns) {
      expect(pattern.test(scriptBlock), `${file} contains Options API`).toBe(false)
    }
  }
})
```

### 单元测试重点

单元测试聚焦以下具体示例和边界条件：

| 测试目标 | 测试内容 |
|---------|---------|
| `bus.js` | `$on`/`$off`/`$emit`/`$once` 正确工作 |
| `storage.js` | 连接的增删改查、排序逻辑 |
| `util.js` | `bufToString`、`keysToTree`、`keysToList` 等工具函数 |
| `i18n/i18n.js` | `setLocale` 更新双端 locale，13 种语言均有 `el` 命名空间 |
| `electron.js` | IPC 封装层正确路由到 `window.electronAPI` |
| `useTheme.js` | 主题切换正确更新 DOM class 和调用 IPC |
| Electron 主进程配置 | `contextIsolation: true`、`nodeIntegration: false` |
| IPC 通道完整性 | preload 白名单中的所有通道在主进程中均有处理器 |

### 组件迁移验证顺序

按依赖关系从底层到顶层迁移，每层完成后运行测试：

1. **基础工具层**（无依赖）：`bus.js`、`storage.js`、`util.js`、`electron.js`
2. **原子组件**（无子组件依赖）：`viewers/`（15个）、`ScrollToTop`、`ElementIcon`、`FileInput`、`InputBinary`、`InputPassword`
3. **功能组件**（依赖原子组件）：`FormatViewer`、`JsonEditor`、`PaginationTable`、`OperateItem`
4. **内容组件**（依赖功能组件）：`contents/`（7个 Redis 数据类型组件）
5. **复合组件**（依赖内容组件）：`KeyDetail`、`KeyHeader`、`KeyList`、`KeyListNormal`、`KeyListVirtualTree`
6. **对话框组件**：`NewConnectionDialog`、`Setting`、`CommandLog`、`HotKeys`、`CustomFormatter`、`SlowLog`、`MemoryAnalysis`
7. **顶层组件**：`ConnectionWrapper`、`ConnectionMenu`、`Connections`、`Tabs`、`CliContent`、`CliTab`
8. **根组件**：`Aside.vue`、`App.vue`
