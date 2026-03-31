const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * 以开发模式启动 Electron 主程序，并清理会导致 Electron 退化为 Node 的环境变量。
 */
function startElectronApp() {
  const env = { ...process.env, ARDM_ENV: 'development' };
  delete env.ELECTRON_RUN_AS_NODE;

  const electronBinary = require('electron');
  const entry = path.join(process.cwd(), 'pack', 'electron');
  const child = spawn(electronBinary, [entry], {
    stdio: 'inherit',
    env,
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

startElectronApp();
