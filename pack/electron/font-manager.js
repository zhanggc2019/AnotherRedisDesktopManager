const { ipcMain } = require('electron');

ipcMain.on('get-all-fonts', (event) => {
  try {
    require('font-list').getFonts().then((fonts) => {
      if (!fonts || !fonts.length) {
        fonts = [];
      }

      fonts = fonts.map(font => font.replace('"', '').replace('"', ''));

      event.sender.send('send-all-fonts', fonts);
    }).catch(() => {
      event.sender.send('send-all-fonts', ['Default Initial']);
    });
  } catch (e) {
    event.sender.send('send-all-fonts', ['Default Initial']);
  }
});
