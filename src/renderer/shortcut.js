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

export function bind(...args) {
  return keymaster(...args);
}

export { keymaster };

// Default export for backward compatibility with global properties
export default {
  bind,
  ...keymaster,
};
