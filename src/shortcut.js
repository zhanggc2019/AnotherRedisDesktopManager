import keymaster from 'keymaster';
import electron from './electron';

// enable shortcut in input, textarea, select
keymaster.filter = e => true;

// prevent ctrl+r
keymaster('ctrl+r, ⌘+r', e => false);

// minimize window
keymaster('ctrl+h, ctrl+m, ⌘+m', (e) => {
  electron.send('minimizeWindow');
  return false;
});

// hide window on mac
// (process.platform === 'darwin') && keymaster('⌘+h', e => {
//   ipcRenderer.send('hideWindow');
//   return false;
// });

// toggle maximize
keymaster('ctrl+enter, ⌘+enter', (e) => {
  electron.send('toggleMaximize');
  return false;
});

export default {
  bind: (...args) => keymaster(...args),
  ...keymaster,
};
