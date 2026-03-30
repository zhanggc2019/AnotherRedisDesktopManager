# 实施计划：Vue3 迁移

## 概述

本实施计划将 Another Redis Desktop Manager 从 Vue 2 + Webpack 4 + ElementUI 完整迁移到 Vue 3 + electron-vite + Element Plus + Composition API。

迁移策略：
- 按依赖关系从底层到顶层逐步迁移（基础设施 → 原子组件 → 复合组件 → 根组件）
- 每个阶段完成后进行功能验证
- 可选任务标记为 `*`，可根据时间安排跳过

## 任务清单

### 阶段 1：构建工具链迁移（Webpack 4 → electron-vite）

- [x] 1.1 安装 electron-vite 和相关依赖
  - 安装 `electron-vite`、`@vitejs/plugin-vue`、`vite-plugin-monaco-editor`
  - 更新 `package.json` 的 `devDependencies`
  - _需求: 9.1, 9.2, 9.4_

- [x] 1.2 创建 electron-vite 配置文件
  - 创建 `electron.vite.config.js`，配置 main、preload、renderer 三个构建目标
  - 配置路径别名 `@` 指向 `src/renderer`
  - 配置 Monaco Editor 插件
  - 配置开发服务器端口为 9988
  - _需求: 9.2, 9.4, 9.7, 9.8_

- [x] 1.3 重组项目目录结构
  - 创建 `src/main/`、`src/preload/`、`src/renderer/` 目录
  - 移动 `pack/electron/electron-main.js` 到 `src/main/index.js`
  - 移动 `pack/electron/preload.js` 到 `src/preload/index.js`
  - 移动 `src/` 下的渲染进程文件到 `src/renderer/`
  - 移动 `index.html` 到 `src/renderer/index.html`
  - _需求: 9.6_

- [x] 1.4 更新 package.json scripts
  - 将 `dev` 脚本改为 `electron-vite dev`
  - 将 `build` 脚本改为 `electron-vite build`
  - 更新 `pack:prepare` 脚本以适配新的构建输出目录
  - 移除 `NODE_OPTIONS=--openssl-legacy-provider` 环境变量
  - _需求: 9.12_

- [x] 1.5 删除 Webpack 配置文件
  - 删除 `build/` 目录下所有文件
  - 删除 `config/` 目录下所有文件
  - 删除 `.postcssrc.js`、`babel.config.json`
  - _需求: 9.9, 9.10_

- [x] 1.6 验证构建工具链
  - 运行 `npm run dev`，确认开发服务器启动成功
  - 运行 `npm run build`，确认生产构建成功
  - 确认 Electron 应用能够正常启动
  - _需求: 9.3, 9.7_

### 阶段 2：Electron 安全模型升级

- [x] 2.1 更新 Electron 主进程配置
  - 在 `src/main/index.js` 中设置 `contextIsolation: true`
  - 设置 `nodeIntegration: false`
  - 更新 preload 脚本路径为新的构建输出路径
  - _需求: 7.1, 7.4_

- [x] 2.2 实现 contextBridge 白名单机制
  - 在 `src/preload/index.js` 中使用 `contextBridge.exposeInMainWorld('electronAPI', ...)`
  - 定义 `send`、`invoke`、`sendSync`、`on` 四个方法
  - 配置白名单通道：sendChannels、invokeChannels、syncChannels、onChannels
  - _需求: 7.2_

- [x] 2.3 更新渲染进程 IPC 封装层
  - 修改 `src/renderer/electron.js`，通过 `window.electronAPI` 访问 IPC
  - 保留所有现有 IPC 通道的封装接口
  - 移除直接 `require('electron')` 的代码
  - _需求: 7.3, 7.6_

- [ ]* 2.4 编写 IPC 通道完整性测试
  - **Property 6: 所有 IPC 通道均已注册**
  - **验证需求: 7.6**
  - 验证 preload 白名单中的所有通道在主进程中均有处理器

### 阶段 3：基础工具层迁移（无依赖模块）

- [x] 3.1 迁移事件总线（bus.js）
  - 确认 `src/renderer/bus.js` 已使用 mitt 实现
  - 导出 `$on`、`$off`、`$emit`、`$once` 方法
  - _需求: 4.2_

- [x] 3.2 迁移存储模块（storage.js）
  - 将 `src/renderer/storage.js` 改为纯函数导出
  - 移除对 Vue 实例的依赖
  - _需求: 2.7_

- [x] 3.3 迁移工具函数（util.js）
  - 将 `src/renderer/util.js` 改为纯函数导出
  - 确保所有工具函数使用 ES Module 语法
  - _需求: 2.7, 14.3_

- [x] 3.4 迁移快捷键模块（shortcut.js）
  - 将 `src/renderer/shortcut.js` 改为纯函数导出
  - 移除对 Vue 实例的依赖
  - _需求: 2.7_

- [ ]* 3.5 编写基础工具层单元测试
  - 测试 `bus.js` 的 `$on`/`$off`/`$emit`/`$once` 功能
  - 测试 `storage.js` 的连接增删改查和排序逻辑
  - 测试 `util.js` 的 `bufToString`、`keysToTree`、`keysToList` 等函数

### 阶段 4：Composable 函数创建

- [x] 4.1 创建 useConnection composable
  - 创建 `src/renderer/composables/useConnection.js`
  - 实现连接列表管理、过滤、排序逻辑
  - 返回 `connections`、`filteredConnections`、`initConnections`、`sortOrder` 等
  - _需求: 2.9, 2.10_

- [x] 4.2 创建 useKeyList composable
  - 创建 `src/renderer/composables/useKeyList.js`
  - 实现 Key 列表加载、刷新、搜索逻辑
  - 返回 `keyList`、`loading`、`searchPattern`、`loadKeys`、`refreshKeys` 等
  - _需求: 2.9, 2.10_

- [x] 4.3 创建 useTheme composable
  - 创建 `src/renderer/composables/useTheme.js`
  - 实现主题切换逻辑（更新 DOM class 和调用 IPC）
  - 返回 `isDark`、`toggleTheme`、`initTheme` 等
  - _需求: 2.9, 2.10, 11.1, 11.3, 11.5_

- [x] 4.4 创建 useRedisClient composable
  - 创建 `src/renderer/composables/useRedisClient.js`
  - 封装 Redis 客户端连接、断开逻辑
  - 返回 `client`、`connecting`、`connect`、`disconnect` 等
  - _需求: 2.9, 2.10_

- [x] 4.5 创建 useI18n composable
  - 创建 `src/renderer/composables/useI18n.js`
  - 封装语言切换逻辑（同步更新 vue-i18n 和 Element Plus locale）
  - 返回 `locale`、`setLocale`、`t` 等
  - _需求: 2.9, 2.10, 8.2, 8.5_

- [ ]* 4.6 编写 Composable 单元测试
  - 测试 `useTheme` 的主题切换逻辑
  - 测试 `useI18n` 的语言切换逻辑

- [ ]* 4.7 编写主题切换属性测试
  - **Property 9: 主题切换正确更新 DOM 和 IPC**
  - **验证需求: 11.1, 11.3, 11.5**

- [ ]* 4.8 编写语言切换属性测试
  - **Property 8: setLocale 同步更新双端 locale**
  - **验证需求: 8.5**

### 阶段 5：国际化系统升级

- [x] 5.1 确认 vue-i18n v9 配置
  - 确认 `src/renderer/i18n/i18n.js` 已使用 `createI18n()`
  - 确认 Element Plus 语言包已合并到 `el` 命名空间
  - 确认 `fallbackLocale: 'en'` 已配置
  - _需求: 8.1, 8.4, 8.6_

- [x] 5.2 更新组件中的 i18n 用法
  - 在需要翻译的组件中使用 `useI18n()` 获取 `t()` 函数
  - 移除 `this.$t()` 用法
  - _需求: 8.2_

- [ ]* 5.3 编写语言包完整性测试
  - **Property 7: 所有语言均包含 el 命名空间**
  - **验证需求: 8.3, 8.4**
  - 验证 13 种语言的消息对象均包含 `el` 命名空间

### 阶段 6：Element Plus 集成

- [x] 6.1 更新根组件 Element Plus 配置
  - 在 `src/renderer/App.vue` 中使用 `<el-config-provider :locale="elementLocale">`
  - 使用 `computed()` 动态获取 Element Plus locale
  - _需求: 6.4, 8.5_

- [x] 6.2 更新 main.js 全局属性注册
  - 确认 `app.config.globalProperties.$message` 等已注册
  - 确认 `app.use(ElementPlus, { size: 'small' })` 已调用
  - _需求: 1.2, 6.5_

- [x] 6.3 迁移暗色主题方案
  - 移除 `static/theme/dark/index.css` 的手动覆盖
  - 改用 Element Plus 官方暗色模式（在 `<html>` 添加 `class="dark"`）
  - 创建 `src/renderer/styles/dark-override.css` 存放自定义 CSS 变量覆盖
  - _需求: 11.4_

- [x] 6.4 更新图标用法
  - 将 `<i class="el-icon-xxx">` 替换为 Element Plus 图标组件
  - 使用 `src/renderer/element-plus-icons.js` 中的 `resolveElIcon()` 工具函数
  - _需求: 6.7_

- [ ]* 6.5 编写 Element Plus 集成测试
  - 验证 `<el-config-provider>` 正确包裹根组件
  - 验证暗色主题 CSS 变量生效

### 阶段 7：原子组件迁移（无子组件依赖）

- [x] 7.1 迁移 viewers/ 目录下的 15 个查看器组件
  - [x] 7.1.1 迁移 ViewerText.vue
    - 使用 `<script setup>` 替代 Options API
    - 使用 `defineProps()` 声明 props
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.2 迁移 ViewerJson.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.3 迁移 ViewerBinary.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.4 迁移 ViewerHex.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.5 迁移 ViewerGzip.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.6 迁移 ViewerBrotli.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.7 迁移 ViewerDeflate.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.8 迁移 ViewerDeflateRaw.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.9 迁移 ViewerMsgpack.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.10 迁移 ViewerPHPSerialize.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.11 迁移 ViewerJavaSerialize.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.12 迁移 ViewerPickle.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.13 迁移 ViewerProtobuf.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.14 迁移 ViewerCustom.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.1.15 迁移 ViewerOverSize.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_

- [x] 7.2 迁移其他原子组件
  - [x] 7.2.1 迁移 ScrollToTop.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.2.2 迁移 ElementIcon.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.2.3 迁移 FileInput.vue
    - 使用 `<script setup>` 替代 Options API
    - 使用 `defineEmits()` 声明事件
    - _需求: 2.1, 2.2, 2.3, 2.8, 4.4_
  - [x] 7.2.4 迁移 InputBinary.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.2.5 迁移 InputPassword.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.8_
  - [x] 7.2.6 迁移 LanguageSelector.vue
    - 使用 `<script setup>` 替代 Options API
    - 使用 `useI18n()` composable
    - _需求: 2.1, 2.2, 2.3, 2.7, 2.8, 8.2_

- [x] 7.3 检查点 - 原子组件迁移验证
  - 确认所有原子组件能够正常渲染
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 8：功能组件迁移（依赖原子组件）

- [x] 8.1 迁移 FormatViewer.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `ref()`、`computed()` 替代 `data()` 和 `computed`
  - 使用 `onMounted()` 替代 `mounted()`
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_

- [x] 8.2 迁移 JsonEditor.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `watch()` 替代 `watch` 选项
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_

- [x] 8.3 迁移 PaginationTable.vue
  - 使用 `<script setup>` 替代 Options API
  - 确保 vxe-table v4 兼容性
  - _需求: 2.1, 2.2, 2.3, 2.8, 10.2_

- [x] 8.4 迁移 OperateItem.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `defineEmits()` 声明事件
  - _需求: 2.1, 2.2, 2.3, 2.8, 4.4_

- [x] 8.5 迁移 RightClickMenu.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `defineExpose()` 暴露方法给父组件
  - _需求: 2.1, 2.2, 2.3, 2.8_

- [x] 8.6 检查点 - 功能组件迁移验证
  - 确认所有功能组件能够正常工作
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 9：内容组件迁移（Redis 数据类型组件）

- [x] 9.1 迁移 contents/ 目录下的 7 个组件
  - [x] 9.1.1 迁移 KeyContentString.vue
    - 使用 `<script setup>` 替代 Options API
    - 使用 `useRouter()` 替代 `this.$router`
    - 使用 bus 替代 `this.$bus`
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.2 迁移 KeyContentHash.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.3 迁移 KeyContentList.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.4 迁移 KeyContentSet.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.5 迁移 KeyContentZset.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.6 迁移 KeyContentStream.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_
  - [x] 9.1.7 迁移 KeyContentReJson.vue
    - 使用 `<script setup>` 替代 Options API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 5.2_

- [x] 9.2 检查点 - 内容组件迁移验证
  - 确认所有 Redis 数据类型能够正常显示和编辑
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 10：复合组件迁移（依赖内容组件）

- [x] 10.1 迁移 KeyDetail.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `useKeyList()` composable
  - 使用 `useRouter()` 和 `useRoute()` 替代 `this.$router` 和 `this.$route`
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 5.2_

- [x] 10.2 迁移 KeyHeader.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `defineEmits()` 声明事件
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.4_

- [x] 10.3 迁移 KeyList.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `useKeyList()` composable
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 10.4 迁移 KeyListNormal.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `vue-virtual-scroller` v2 API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.1_

- [x] 10.5 迁移 KeyListVirtualTree.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `vue-virtual-scroller` v2 API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.1_

- [x] 10.6 检查点 - 复合组件迁移验证
  - 确认 Key 列表和详情页能够正常工作
  - 确认虚拟滚动性能正常
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 11：对话框和高级功能组件迁移

- [x] 11.1 迁移 NewConnectionDialog.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `reactive()` 管理表单数据
  - 使用 `defineExpose()` 暴露方法
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.2 迁移 Setting.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `useTheme()` composable
  - 使用 `useI18n()` composable
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 11.3 迁移 CommandLog.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.4 迁移 HotKeys.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.5 迁移 CustomFormatter.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.6 迁移 SlowLog.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.7 迁移 MemoryAnalysis.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.8 迁移 DeleteBatch.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.9 迁移 Status.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11.10 检查点 - 对话框和高级功能验证
  - 确认连接配置对话框能够正常工作
  - 确认设置页面能够正常工作
  - 确认慢日志、内存分析等高级功能正常
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 12：CLI 和顶层组件迁移

- [x] 12.1 迁移 CliContent.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 12.2 迁移 CliTab.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 12.3 迁移 ConnectionWrapper.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `useRedisClient()` composable
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 12.4 迁移 ConnectionMenu.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `defineEmits()` 声明事件
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.4_

- [x] 12.5 迁移 Connections.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `useConnection()` composable
  - 使用 `onMounted()` 和 `onUnmounted()` 管理事件监听
  - 使用 sortablejs 的 Vue 3 兼容方式
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.3, 10.3_

- [x] 12.6 迁移 Tabs.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 12.7 迁移 UpdateCheck.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 12.8 检查点 - CLI 和顶层组件验证
  - 确认 CLI 终端功能正常
  - 确认连接列表和标签页功能正常
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 13：根组件迁移

- [x] 13.1 迁移 Aside.vue
  - 使用 `<script setup>` 替代 Options API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 13.2 迁移 App.vue
  - 使用 `<script setup>` 替代 Options API
  - 使用 `computed()` 获取 Element Plus locale
  - 使用 `onMounted()` 替代 `mounted()`
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 13.3 检查点 - 根组件验证
  - 确认应用能够正常启动
  - 确认侧边栏拖拽功能正常
  - 确认所有测试通过
  - 如有问题请向用户反馈

### 阶段 14：代码质量和规范升级

- [x] 14.1 更新 ESLint 配置
  - 安装 `eslint-plugin-vue` v9+
  - 更新 `.eslintrc.json`，启用 `plugin:vue/vue3-recommended` 规则集
  - 启用 `vue/script-setup-uses-vars` 规则
  - _需求: 14.1, 14.2_

- [x] 14.2 统一模块系统为 ES Module
  - 确认 `src/renderer/` 下所有文件使用 `import`/`export`
  - 移除 CommonJS 的 `require()`/`module.exports`（Node.js 内置模块除外）
  - _需求: 14.3_

- [x] 14.3 移除废弃配置文件
  - 删除 `.jshintrc`
  - _需求: 14.6_

- [x] 14.4 运行 ESLint 检查
  - 运行 `npm run lint`，确认零错误
  - _需求: 14.5_

- [ ]* 14.5 编写静态分析属性测试
  - **Property 1: 零 Options API 残留**
  - **验证需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3, 3.4**
  - **Property 2: 零 this.$xxx 访问**
  - **验证需求: 2.7, 4.1, 5.2, 6.5, 8.2**
  - **Property 3: 零 element-ui 引用**
  - **验证需求: 6.1**
  - **Property 4: 零旧式图标用法**
  - **验证需求: 6.7**
  - **Property 5: 渲染进程不直接 require electron**
  - **验证需求: 7.3**
  - **Property 10: 渲染进程源码统一使用 ES Module**
  - **验证需求: 14.3**

### 阶段 15：TypeScript 类型支持（可选）

- [ ]* 15.1 为 Composable 添加 TypeScript 类型
  - 为 `useConnection.js`、`useKeyList.js`、`useTheme.js`、`useRedisClient.js`、`useI18n.js` 添加类型注解
  - _需求: 13.1_

- [ ]* 15.2 定义核心数据模型类型
  - 创建 `src/renderer/types/connection.d.ts`
  - 创建 `src/renderer/types/redis.d.ts`
  - 创建 `src/renderer/types/electron.d.ts`
  - _需求: 13.2_

- [ ]* 15.3 为 IPC 通道添加类型声明
  - 定义 `window.electronAPI` 的类型声明
  - _需求: 13.3_

- [ ]* 15.4 为组件添加 TypeScript 支持
  - 在关键组件中使用 `<script setup lang="ts">`
  - 使用 `defineProps<Props>()` 和 `defineEmits<Emits>()` 泛型形式
  - _需求: 13.5_

### 阶段 16：功能完整性验证

- [x] 16.1 验证所有 Redis 连接类型
  - 测试 Standalone 连接
  - 测试 Cluster 连接
  - 测试 Sentinel 连接
  - 测试 SSH 隧道连接
  - 测试 SSL/TLS 连接
  - _需求: 12.1_

- [x] 16.2 验证所有 Redis 数据类型
  - 测试 String 类型的显示和编辑
  - 测试 Hash 类型的显示和编辑
  - 测试 List 类型的显示和编辑
  - 测试 Set 类型的显示和编辑
  - 测试 ZSet 类型的显示和编辑
  - 测试 Stream 类型的显示和编辑
  - 测试 ReJSON 类型的显示和编辑
  - _需求: 12.2_

- [x] 16.3 验证所有数据格式查看器
  - 测试 Text、JSON、Binary、Hex 查看器
  - 测试 Gzip、Brotli、Deflate、DeflateRaw 查看器
  - 测试 Msgpack、PHPSerialize、JavaSerialize、Pickle、Protobuf 查看器
  - 测试 Custom 查看器
  - _需求: 12.3_

- [x] 16.4 验证 CLI 终端功能
  - 测试 CLI 命令执行
  - 测试 CLI 历史记录
  - _需求: 12.4_

- [x] 16.5 验证连接管理功能
  - 测试新建连接
  - 测试编辑连接
  - 测试删除连接
  - 测试连接排序（拖拽）
  - _需求: 12.5_

- [x] 16.6 验证高级功能
  - 测试慢日志查看
  - 测试内存分析
  - 测试命令日志
  - _需求: 12.6_

- [x] 16.7 验证命令行参数启动
  - 测试 `--host`、`--port`、`--auth` 等参数
  - 确认自动连接功能正常
  - _需求: 12.7_

- [x] 16.8 验证主题切换功能
  - 测试亮色主题
  - 测试暗色主题
  - 测试系统主题跟随
  - _需求: 11.1, 11.2, 11.3, 11.5_

- [x] 16.9 验证国际化功能
  - 测试 13 种语言切换
  - 确认 Element Plus 组件文本正确翻译
  - _需求: 8.3, 8.5_

- [x] 16.10 最终检查点
  - 确认所有功能正常工作
  - 确认无回归问题
  - 确认所有测试通过
  - 如有问题请向用户反馈

## 注意事项

- 标记为 `*` 的任务为可选任务，可根据时间安排跳过以加快 MVP 交付
- 每个任务都标注了对应的需求编号，便于追溯
- 检查点任务确保增量验证，及时发现问题
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界条件
- 迁移过程中保持应用可运行状态，避免长时间处于不可用状态
