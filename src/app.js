const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');
const url = require('url');

let mainWin = null;
let settingsWin = null;

const createMainWindow = () => {
  if (mainWin === null || mainWin.isDestroyed()) {
    mainWin = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    })

    const url = path.join(__dirname, '../dist/theia/index.html');
    mainWin.on('closed', () => createMainWindow());
    mainWin.loadURL(`file://${url}`);
    mainWin.hide();
  }
}

const createSettingsWindow = () => {
  if (settingsWin === null || settingsWin.isDestroyed()) {
    settingsWin = new BrowserWindow({
      parent: mainWin,
      width: 344,
      height: 240,
      resizable: false,
      fullscreen: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    const popupUrl = path.join(__dirname, '../dist/theia/index.html#/settings');
    settingsWin.on('closed', () => createSettingsWindow());
    settingsWin.loadURL(`file://${popupUrl}`);
    settingsWin.hide();
  }
}

const createWindows = () => {
  createMainWindow();
  createSettingsWindow();
}


app.whenReady().then(() => {
  createWindows();
  mainWin.show();

  app.on('activate', () => {
    mainWin.show();
    // if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('open-settings', () => {
  if (settingsWin.isVisible()) {
    settingsWin.focus();
  } else {
    settingsWin.show();
  }
});

ipcMain.on('in-device', (event, args) => {
  mainWin.webContents.send('in-device-changed', args);
});

ipcMain.on('out-device', (event, args) => {
  mainWin.webContents.send('out-device-changed', args);
});

ipcMain.on('noise-threshold', (event, args) => {
  mainWin.webContents.send('noise-threshold-changed', args);
});

ipcMain.on('current-noise', (event, args) => {
  settingsWin.webContents.send('current-noise-changed', args);
});

