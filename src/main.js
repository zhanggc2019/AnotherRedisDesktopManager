import { createApp } from 'vue';
import ElementPlus, { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import 'element-plus/dist/index.css';
import 'font-awesome/css/font-awesome.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import App from './App';
import i18n from './i18n/i18n';
import bus from './bus';
import util from './util';
import storage from './storage';
import shortcut from './shortcut';

import 'vxe-table/lib/style.css';
const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  const componentName = instance && instance.$ && instance.$.type
    ? (instance.$.type.name || instance.$.type.__name || 'anonymous')
    : 'unknown';
  const payload = {
    componentName,
    info,
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : '',
  };
  window.__lastVueError = payload;
  console.error('[vue-error]', JSON.stringify(payload));
};

window.addEventListener('error', (event) => {
  console.error('[window-error]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
});

app.config.globalProperties.$bus = bus;
app.config.globalProperties.$util = util;
app.config.globalProperties.$storage = storage;
app.config.globalProperties.$shortcut = shortcut;
app.config.globalProperties.$message = ElMessage;
app.config.globalProperties.$notify = ElNotification;
app.config.globalProperties.$confirm = ElMessageBox.confirm;
app.config.globalProperties.$prompt = ElMessageBox.prompt;
app.config.globalProperties.$alert = ElMessageBox.alert;

app.use(i18n);
app.use(ElementPlus, { size: 'small' });

const vue = app.mount('#app');

// handle uncaught exception
process.on('uncaughtException', (err, origin) => {
  if (!err) {
    return;
  }

  vue.$message.error({
    message: `Uncaught Exception: ${err}`,
    duration: 5000,
  });

  vue.$bus.$emit('closeConnection');
});

export default vue;
