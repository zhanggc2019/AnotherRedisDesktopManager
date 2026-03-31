const { app, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_WINDOW_SIZE = {
  width: 1280,
  height: 820,
};

const winState = {
  // {x, y, width, height, maximized}
  /**
   * 获取默认窗口状态。
   *
   * @returns {{x: null, y: null, width: number, height: number, maximized: boolean}}
   */
  getDefaultState() {
    return {
      x: null,
      y: null,
      width: DEFAULT_WINDOW_SIZE.width,
      height: DEFAULT_WINDOW_SIZE.height,
      maximized: false,
    };
  },

  getLastState() {
    let data = '{}';

    try {
      data = fs.readFileSync(this.getStateFile());
    } catch (err) {}

    const parsed = this.parseJson(data);
    const lastWinStage = {
      ...this.getDefaultState(),
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
    const lastX = lastWinStage.x;
    const lastY = lastWinStage.y;

    // Only check screen bounds if screen is available (after app ready)
    let primary;
    try {
      primary = screen.getPrimaryDisplay();
    } catch (e) {
      // Screen not available yet, return default state
      return this.getDefaultState();
    }

    // Do not relaunch in maximized mode, recover to a normal, usable size.
    if (lastWinStage.maximized) {
      lastWinStage.maximized = false;
      lastWinStage.x = null;
      lastWinStage.y = null;
      lastWinStage.width = Math.min(DEFAULT_WINDOW_SIZE.width, primary.workAreaSize.width);
      lastWinStage.height = Math.min(DEFAULT_WINDOW_SIZE.height, primary.workAreaSize.height);
    }

    // recovery position only when app in primary screen
    // if in external screens, reset position for uncaught display issues
    if (
      lastX < 0 || lastY < 0
      || lastX > primary.workAreaSize.width || lastY > primary.workAreaSize.height
    ) {
      lastWinStage.x = null;
      lastWinStage.y = null;
    }

    // adjust extremely small window
    (lastWinStage.width < 250) && (lastWinStage.width = DEFAULT_WINDOW_SIZE.width);
    (lastWinStage.height < 250) && (lastWinStage.height = DEFAULT_WINDOW_SIZE.height);
    (lastWinStage.width > primary.workAreaSize.width) && (lastWinStage.width = Math.min(DEFAULT_WINDOW_SIZE.width, primary.workAreaSize.width));
    (lastWinStage.height > primary.workAreaSize.height) && (lastWinStage.height = Math.min(DEFAULT_WINDOW_SIZE.height, primary.workAreaSize.height));

    return lastWinStage;

    // // there is some uncaught display issues when display in external screens
    // // such as windows disappears even x < width
    // let screenCanDisplay = false;
    // const displays = screen.getAllDisplays()

    // for (const display of displays) {
    //   const bounds = display.workArea;
    //   // check if there is a screen can display this position
    //   if (bounds.x * lastX > 0 && bounds.y * lastY > 0) {
    //     if (bounds.width > Math.abs(lastX) && bounds.height > Math.abs(lastY)) {
    //       screenCanDisplay = true;
    //       break;
    //     }
    //   }
    // }

    // let state = {...lastWinStage, x: null, y: null};

    // // recovery to last position
    // if (screenCanDisplay) {
    //   state.x = lastX;
    //   state.y = lastY;
    // }

    // return state;
  },

  watchClose(win) {
    win.on('close', () => {
      const winState = this.getWinState(win);

      if (!winState) {
        return;
      }

      this.saveStateToStorage(winState);
    });
  },

  getWinState(win) {
    try {
      const isMaximized = win.isMaximized();
      const winBounds = isMaximized ? win.getNormalBounds() : win.getBounds();

      const state = {
        x: winBounds.x,
        y: winBounds.y,
        width: winBounds.width,
        height: winBounds.height,
        maximized: isMaximized,
      };

      return state;
    } catch (err) {
      return false;
    }
  },

  saveStateToStorage(winState) {
    fs.writeFile(this.getStateFile(), JSON.stringify(winState), (err) => {});
  },

  getStateFile() {
    const userPath = app.getPath('userData');
    const fileName = 'ardm-win-state.json';

    return path.join(userPath, fileName);
  },

  parseJson(str) {
    let json = false;

    try {
      json = JSON.parse(str);
    } catch (err) {}

    return json;
  },
};

module.exports = winState;
