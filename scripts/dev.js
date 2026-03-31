const { spawn } = require('node:child_process');
const path = require('node:path');

/**
 * 启动 electron-vite 开发服务，并清理会导致 Electron 退化为 Node 的环境变量。
 */
function startDevServer() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const cli = path.join(process.cwd(), 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');

  const child = spawn(process.execPath, [cli, 'dev'], {
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

startDevServer();
