# Requirements Document

## Introduction

本项目是一个基于 Vue + Electron 的 Redis 桌面客户端工具（Another Redis Desktop Manager）。
当前代码库处于 Vue2 → Vue3 迁移的过渡阶段：`package.json` 已引入 Vue 3、Element Plus、vue-i18n v9 等新依赖，但大量组件仍使用 Options API 风格，构建工具仍为 Webpack 4，Electron 主进程代码也需要适配新版本安全模型。

本次迁移的目标是**完整的、脱胎换骨式的升级**，而非渐进式兼容：
- 所有组件必须使用 `<script setup>` 语法，彻底告别 Options API
- 构建工具从 Webpack 4 迁移到 Vite（Vue 3 官方推荐），删除全部旧配置
- 可复用逻辑统一提取为 Composable（`useXxx` 命名规范）
- 模块系统统一为 ES Module，代码规范工具链同步升级

本需求文档覆盖完成迁移所需的全部工作，包括：
- Vue 2 → Vue 3 完整迁移（`<script setup>` + Composition API、响应式系统、全局 API）
- Electron 升级与安全加固（contextIsolation、preload 脚本）
- ElementUI → Element Plus 完整替换
- 构建工具链现代化（Webpack 4 → Vite + electron-vite）
- 国际化系统升级（vue-i18n v8 → v9）
- 其他依赖迁移（Vue Router v3 → v4、事件总线替换等）
- TypeScript 类型支持（推荐）
- 代码质量与规范工具链升级（ESLint vue3-recommended + ES Module 统一）

---

## Glossary

- **App**: 整个 Electron + Vue 桌面应用程序
- **Renderer**: Electron 渲染进程，运行 Vue 应用
- **Main_Process**: Electron 主进程（`pack/electron/electron-main.js`）
- **Preload_Script**: Electron preload 脚本，在 contextIsolation 模式下桥接主进程与渲染进程
- **Vue_Component**: 使用 Vue 3 SFC（Single File Component）格式编写的组件
- **Composition_API**: Vue 3 的 `<script setup>` 语法及 Composables 编写方式，是本次迁移的目标代码风格
- **Options_API**: Vue 2 风格的 `data()`、`methods`、`computed` 等选项式 API
- **Element_Plus**: ElementUI 的 Vue 3 版本，替代原有 ElementUI
- **Event_Bus**: 基于 mitt 实现的全局事件总线（`src/bus.js`）
- **i18n**: 国际化模块，基于 vue-i18n v9，支持 13 种语言
- **IPC**: Electron 进程间通信（ipcMain / ipcRenderer）
- **Build_Tool**: 项目构建工具，迁移后使用 Vite（通过 `electron-vite` 或 `vite-plugin-electron` 集成 Electron）
- **Composable**: 遵循 `useXxx` 命名规范的可复用逻辑函数，封装响应式状态和副作用，供多个组件共享
- **Vite**: 基于 ESM 的现代前端构建工具，Vue 3 官方推荐，替代 Webpack 4
- **Redis_Client**: 基于 ioredis 的 Redis 连接管理模块（`src/redisClient.js`）
- **Viewer**: `src/components/viewers/` 下的数据格式查看器组件
- **Content_Component**: `src/components/contents/` 下的 Redis 数据类型内容组件

---

## Requirements

### Requirement 1: Vue 3 全局 API 迁移

**User Story:** As a 开发者, I want 将 Vue 2 的全局 API 替换为 Vue 3 的应用实例 API, so that 应用能够在 Vue 3 运行时下正确初始化和运行。

#### Acceptance Criteria

1. THE App SHALL 使用 `createApp()` 创建应用实例，不再使用 `new Vue()`
2. THE App SHALL 通过 `app.config.globalProperties` 注册全局属性（`$bus`、`$util`、`$storage`、`$shortcut`、`$message`、`$notify`、`$confirm`、`$prompt`、`$alert`）
3. THE App SHALL 通过 `app.use()` 注册插件（ElementPlus、vue-i18n、vue-router）
4. WHEN 应用初始化完成, THE App SHALL 挂载到 `#app` DOM 节点
5. IF 渲染进程发生未捕获异常, THEN THE App SHALL 通过 `app.config.errorHandler` 捕获并记录错误信息，包含组件名称、错误信息和调用栈

---

### Requirement 2: Vue 组件 Options API → Composition API 迁移

**User Story:** As a 开发者, I want 将所有 Vue 组件从 Options API 完整迁移到 Composition API 的 `<script setup>` 语法, so that 代码彻底脱离 Vue 2 风格，充分利用 Vue 3 特性，类型推断更完善，代码更易维护。

#### Acceptance Criteria

1. THE Vue_Component SHALL 使用 `<script setup>` 语法替代所有 Options API 选项（`data()`、`methods`、`computed`、`watch`、生命周期钩子等），禁止使用显式 `setup()` 函数形式
2. THE Vue_Component SHALL 不保留任何 Options API 代码，包括但不限于 `data()`、`methods`、`computed`、`watch`、`mounted`、`created`、`destroyed`、`components`、`props`、`emits` 选项
3. THE Vue_Component SHALL 使用 `ref()`、`reactive()` 替代 `data()` 中的响应式数据声明
4. THE Vue_Component SHALL 使用 `computed()` 替代 `computed` 选项
5. THE Vue_Component SHALL 使用 `watch()` / `watchEffect()` 替代 `watch` 选项
6. THE Vue_Component SHALL 使用 `onMounted()`、`onUnmounted()` 等生命周期钩子替代 `mounted`、`destroyed` 等选项
7. WHEN 组件需要访问全局属性, THE Vue_Component SHALL 通过 `inject()` 或直接导入模块获取，不再依赖 `this.$xxx` 或 `getCurrentInstance()`
8. THE Vue_Component SHALL 使用 `defineProps()` 和 `defineEmits()` 宏声明 props 和 emits，替代 Options API 中的 `props` 和 `emits` 选项
9. THE Vue_Component SHALL 将可复用逻辑提取为独立的 Composable 函数，文件命名遵循 `useXxx.js` 规范（如 `useConnection.js`、`useKeyList.js`、`useTheme.js`）
10. WHEN 多个组件共享相同逻辑, THE App SHALL 将该逻辑提取为 Composable，不在多个组件中重复实现

---

### Requirement 3: 响应式系统迁移

**User Story:** As a 开发者, I want 将 Vue 2 响应式 API 替换为 Vue 3 响应式 API, so that 响应式数据在 Vue 3 运行时下正确工作。

#### Acceptance Criteria

1. THE Vue_Component SHALL 使用 `ref()` 声明基本类型响应式数据
2. THE Vue_Component SHALL 使用 `reactive()` 声明对象类型响应式数据
3. THE Vue_Component SHALL 不再使用 `Vue.set()` / `this.$set()`，改用直接赋值或 `ref.value` 方式更新响应式数据
4. THE Vue_Component SHALL 不再使用 `Vue.delete()` / `this.$delete()`，改用 `delete` 操作符或数组方法
5. WHEN 需要跨组件共享状态, THE App SHALL 使用 `reactive()` 或 Pinia store 替代 Vuex

---

### Requirement 4: 事件系统迁移

**User Story:** As a 开发者, I want 将 Vue 2 的实例事件方法替换为 Vue 3 兼容方式, so that 组件间通信在 Vue 3 下正常工作。

#### Acceptance Criteria

1. THE Vue_Component SHALL 不再使用 `this.$on()`、`this.$off()`、`this.$emit()` 进行跨组件通信
2. THE Event_Bus SHALL 继续使用基于 mitt 的实现（`src/bus.js`）作为全局事件总线
3. WHEN 组件需要监听全局事件, THE Vue_Component SHALL 在 `onMounted()` 中注册监听，在 `onUnmounted()` 中注销监听，防止内存泄漏
4. WHEN 父子组件通信, THE Vue_Component SHALL 使用 `defineEmits()` 声明事件，使用 `defineProps()` 声明属性

---

### Requirement 5: Vue Router v4 迁移

**User Story:** As a 开发者, I want 将 Vue Router 从 v3 升级到 v4, so that 路由系统与 Vue 3 兼容。

#### Acceptance Criteria

1. THE App SHALL 使用 `createRouter()` 和 `createWebHashHistory()` 创建路由实例，替代 `new VueRouter()`
2. THE Vue_Component SHALL 使用 `useRouter()` 和 `useRoute()` Composable 替代 `this.$router` 和 `this.$route`
3. WHEN 路由导航守卫需要访问组件实例, THE App SHALL 使用 Composition API 方式（`onBeforeRouteLeave` 等）替代 Options API 方式

---

### Requirement 6: ElementUI → Element Plus 完整替换

**User Story:** As a 开发者, I want 将所有 ElementUI 组件和 API 替换为 Element Plus 等价实现, so that UI 组件库与 Vue 3 兼容且样式一致。

#### Acceptance Criteria

1. THE App SHALL 将所有 `element-ui` 包引用替换为 `element-plus`
2. THE App SHALL 将 `element-variables.scss` 中的 ElementUI 主题变量迁移为 Element Plus CSS 变量格式
3. THE Vue_Component SHALL 将所有 `el-` 前缀组件替换为 Element Plus 对应组件（组件名称保持 `el-` 前缀，但 API 可能有变化）
4. THE App SHALL 使用 `<el-config-provider :locale="locale">` 包裹根组件以支持国际化
5. WHEN 使用 `ElMessage`、`ElNotification`、`ElMessageBox`, THE Vue_Component SHALL 通过函数式调用方式使用，不再通过 `this.$message` 等实例方法
6. THE App SHALL 将 `static/theme/` 下的 ElementUI 主题 CSS 文件替换为 Element Plus 主题方案
7. THE Vue_Component SHALL 将 `<i class="el-icon-xxx">` 图标用法替换为 Element Plus 图标组件（`@element-plus/icons-vue`）
8. IF Element Plus 中某个组件的 API 与 ElementUI 不兼容, THEN THE Vue_Component SHALL 按照 Element Plus 文档更新对应用法

---

### Requirement 7: Electron 安全模型升级

**User Story:** As a 开发者, I want 将 Electron 主进程配置升级为符合现代安全最佳实践的模式, so that 应用符合 Electron 安全规范并支持未来版本升级。

#### Acceptance Criteria

1. THE Main_Process SHALL 在 `BrowserWindow` 配置中启用 `contextIsolation: true`
2. THE Preload_Script SHALL 使用 `contextBridge.exposeInMainWorld()` 将安全的 IPC API 暴露给渲染进程
3. THE Renderer SHALL 通过 `window.electronAPI` 访问 IPC 功能，不再直接 `require('electron')`
4. THE Main_Process SHALL 将 `nodeIntegration` 设置为 `false`
5. WHEN 渲染进程需要读取文件系统, THE Preload_Script SHALL 通过预定义的 IPC 通道代理文件操作，不直接暴露 `fs` 模块
6. THE Main_Process SHALL 保留所有现有 IPC 通道（`getMainArgs`、`changeTheme`、`getTempPath`、`dialog:showOpenDialog`、`clipboard:writeText`、`shell:openExternal`、`fs:readFileSync`）的处理逻辑

---

### Requirement 8: 国际化系统升级（vue-i18n v9）

**User Story:** As a 开发者, I want 将 vue-i18n 从 v8 升级到 v9 并适配 Vue 3, so that 13 种语言的国际化功能在 Vue 3 下正常工作。

#### Acceptance Criteria

1. THE App SHALL 使用 `createI18n()` 创建 i18n 实例，替代 `new VueI18n()`
2. THE Vue_Component SHALL 使用 `useI18n()` Composable 获取 `t()` 翻译函数，替代 `this.$t()`
3. THE i18n SHALL 支持 13 种语言：en、cn、tw、tr、ru、pt、de、fr、ua、it、es、ko、vi
4. THE i18n SHALL 将 Element Plus 的语言包合并到对应语言消息中（通过 `el` 命名空间）
5. WHEN 用户切换语言, THE App SHALL 同时更新 vue-i18n locale 和 Element Plus 的 `<el-config-provider>` locale，无需刷新页面
6. THE i18n SHALL 设置 `fallbackLocale: 'en'`，当翻译键缺失时回退到英文

---

### Requirement 9: 构建工具链现代化（Webpack 4 → Vite）

**User Story:** As a 开发者, I want 将构建工具从 Webpack 4 迁移到 Vite，并采用 `electron-vite` 或 `vite-plugin-electron` 方案, so that 构建速度大幅提升、配置更简洁，并与 Vue 3 官方推荐工具链对齐。

#### Acceptance Criteria

1. THE Build_Tool SHALL 使用 Vite 作为构建工具，替代 Webpack 4，采用 `electron-vite` 或 `vite-plugin-electron` 方案集成 Electron
2. THE Build_Tool SHALL 支持 Vue 3 SFC（`.vue` 文件）的编译，包括 `<script setup>` 语法（通过 `@vitejs/plugin-vue`）
3. THE Build_Tool SHALL 支持 Electron 渲染进程的开发模式热更新（HMR）
4. THE Build_Tool SHALL 支持 Monaco Editor 的 worker 文件处理（通过 `vite-plugin-monaco-editor` 或等价方案）
5. THE Build_Tool SHALL 支持 CSS 预处理器（SCSS，通过 Vite 内置支持）
6. THE Build_Tool SHALL 生成可被 Electron 主进程加载的生产构建产物
7. WHEN 执行开发命令, THE Build_Tool SHALL 在 9988 端口启动开发服务器（与 Electron 主进程配置一致）
8. THE Build_Tool SHALL 支持路径别名 `@` 指向 `src/` 目录（在 `vite.config.js` 中配置）
9. THE App SHALL 删除 `build/` 目录下的所有 Webpack 配置文件（`webpack.base.conf.js`、`webpack.dev.conf.js`、`webpack.prod.conf.js` 等）
10. THE App SHALL 删除 `config/` 目录下的 Webpack 相关配置文件（`dev.env.js`、`prod.env.js`、`index.js`）
11. THE App SHALL 使用 `vite.config.js`（或 `electron-vite.config.js`）作为唯一的构建配置入口，替代原有 Webpack 配置体系
12. THE App SHALL 将 `package.json` 中的 `scripts` 更新为 Vite/electron-vite 对应命令（`dev`、`build`、`preview`）

---

### Requirement 10: 依赖库兼容性适配

**User Story:** As a 开发者, I want 确保所有第三方依赖库与 Vue 3 兼容并正确配置, so that 应用的所有功能模块正常工作。

#### Acceptance Criteria

1. THE App SHALL 使用 `vue-virtual-scroller` v2（已支持 Vue 3）替代 v1
2. THE App SHALL 使用 `vxe-table` v4（已支持 Vue 3）替代旧版本
3. THE App SHALL 将 `sortablejs` 的集成方式适配为 Vue 3 指令或 Composable 形式
4. THE App SHALL 确保 `monaco-editor` 与 Vue 3 构建工具链兼容
5. IF 某个依赖库不支持 Vue 3, THEN THE App SHALL 寻找等价的 Vue 3 兼容替代库或自行封装

---

### Requirement 11: 暗色主题系统迁移

**User Story:** As a 开发者, I want 将暗色主题切换功能适配为 Element Plus 和 Vue 3 兼容方式, so that 用户的主题偏好在迁移后继续正常工作。

#### Acceptance Criteria

1. THE App SHALL 支持亮色和暗色两种主题模式
2. WHEN 操作系统主题变化, THE Main_Process SHALL 通过 IPC 通知渲染进程（`os-theme-updated` 通道）
3. WHEN 渲染进程收到主题变化通知, THE App SHALL 更新 Element Plus 的主题配置和 `dark-mode` CSS 类
4. THE App SHALL 使用 Element Plus 的暗色模式 CSS 变量替代 `static/theme/dark/index.css` 中的自定义覆盖样式
5. WHEN 用户手动切换主题, THE App SHALL 通过 `changeTheme` IPC 通道通知主进程更新 `nativeTheme.themeSource`

---

### Requirement 12: 迁移后功能完整性验证

**User Story:** As a 开发者, I want 确保迁移后所有核心功能与迁移前行为一致, so that 用户不会因迁移而损失任何已有功能。

#### Acceptance Criteria

1. THE App SHALL 支持所有 Redis 连接类型：Standalone、Cluster、Sentinel、SSH 隧道、SSL/TLS
2. THE App SHALL 正确显示所有 Redis 数据类型：String、Hash、List、Set、ZSet、Stream、ReJSON
3. THE App SHALL 支持所有数据格式查看器：Text、JSON、Binary、Hex、Gzip、Brotli、Deflate、DeflateRaw、Msgpack、PHPSerialize、JavaSerialize、Pickle、Protobuf、Custom
4. THE App SHALL 支持 CLI 终端功能（`CliContent`、`CliTab` 组件）
5. THE App SHALL 支持连接管理功能（新建、编辑、删除、排序连接）
6. THE App SHALL 支持慢日志查看、内存分析、命令日志等高级功能
7. THE App SHALL 支持通过命令行参数（`--host`、`--port`、`--auth` 等）启动并自动连接
8. IF 迁移后某个功能出现回归, THEN THE App SHALL 在发布前修复该回归问题

---

### Requirement 13: TypeScript 支持（推荐）

**User Story:** As a 开发者, I want 为核心模块引入 TypeScript 类型定义, so that 代码可维护性和 IDE 智能提示得到显著提升，减少运行时类型错误。

#### Acceptance Criteria

1. THE App SHALL 为所有 Composable 函数（`useXxx.js`）添加 TypeScript 类型注解，包括参数类型、返回值类型
2. THE App SHALL 为核心数据模型（Redis 连接配置、Key 信息、连接状态等）定义 TypeScript 接口或类型别名
3. THE App SHALL 为 IPC 通道的请求和响应数据结构定义类型（`window.electronAPI` 的类型声明）
4. WHERE TypeScript 被启用, THE Build_Tool SHALL 通过 Vite 内置的 TypeScript 支持（无需额外 `ts-loader`）处理 `.ts` 和 `.vue` 文件中的 TypeScript 代码
5. WHERE TypeScript 被启用, THE Vue_Component SHALL 在 `<script setup lang="ts">` 中使用类型注解，`defineProps<Props>()` 和 `defineEmits<Emits>()` 使用泛型形式
6. IF 某个第三方库缺少类型声明, THEN THE App SHALL 在 `src/types/` 目录下创建对应的 `.d.ts` 声明文件

---

### Requirement 14: 代码质量与规范

**User Story:** As a 开发者, I want 将代码规范工具链升级为支持 Vue 3 和 `<script setup>` 的配置，并统一模块系统, so that 代码风格一致、静态检查有效，并与现代 ES Module 生态对齐。

#### Acceptance Criteria

1. THE App SHALL 将 ESLint 配置升级为支持 Vue 3 的规则集，使用 `eslint-plugin-vue` v9+，并启用 `plugin:vue/vue3-recommended` 规则集
2. THE App SHALL 在 ESLint 配置中启用针对 `<script setup>` 的规则，包括 `vue/script-setup-uses-vars` 等，确保 `<script setup>` 中的变量不被误报为未使用
3. THE App SHALL 将所有 `src/` 目录下的源码文件统一使用 ES Module 语法（`import`/`export`），替代 CommonJS 的 `require()`/`module.exports`
4. THE App SHALL 将 `pack/electron/` 目录下的 Electron 主进程文件保留 CommonJS 语法（`require`/`module.exports`），或根据 `electron-vite` 方案迁移为 ESM
5. WHEN ESLint 检查运行, THE App SHALL 对 `src/` 目录下所有 `.vue`、`.js`、`.ts` 文件执行检查，且零错误通过
6. THE App SHALL 移除已废弃的 `.jshintrc` 配置文件，统一使用 ESLint 作为唯一的 JavaScript/TypeScript 静态检查工具
