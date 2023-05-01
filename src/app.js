const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');
const url = require('url');

let mainWin = null;
let settingsWin = null;

const createWindow = () => {
  mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  mainWin.loadFile('dist/theia/index.html');
  mainWin.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
})

ipcMain.on('open-settings', () => {
  if (settingsWin === null || settingsWin === undefined) {
    settingsWin = new BrowserWindow({
      parent: mainWin,
      width: 344,
      height: 240,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    const popupUrl = path.join(__dirname, '../dist/theia/index.html#/settings');
    settingsWin.loadURL(`file://${popupUrl}`);
    settingsWin.webContents.openDevTools();
  } else {
    debugger;
    settingsWin.focus();
  }
});
