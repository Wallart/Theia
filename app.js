const { app, BrowserWindow, ipcMain, systemPreferences } = require('electron')
const path = require('path');

const bounceId = process.platform === 'darwin' ? app.dock.bounce('critical') : null;

let mainWin = null;
let settingsWin = null;
let feedbackWin = null;

if (systemPreferences.getMediaAccessStatus('microphone') !== 'granted') {
  systemPreferences.askForMediaAccess('microphone')
    .then((res) => console.log(`Microphone access granted: ${res}`));
}

if (systemPreferences.getMediaAccessStatus('camera') !== 'granted') {
  systemPreferences.askForMediaAccess('camera')
    .then((res) => console.log(`Camera access granted: ${res}`));
}

const createMainWindow = () => {
  if (mainWin === null || mainWin.isDestroyed()) {
    mainWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      acceptFirstMouse: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    })

    const url = path.join(__dirname, 'dist/theia/index.html');
    mainWin.on('close', (e) => {
      if (process.platform === 'darwin') {
        e.preventDefault();
        mainWin.hide();
      } else {
        app.quit();
      }
    });
    mainWin.loadURL(`file://${url}`);
    mainWin.setMenu(null);
  }
}

const createSettingsWindow = () => {
  if (settingsWin === null || settingsWin.isDestroyed()) {
    settingsWin = new BrowserWindow({
      parent: mainWin,
      width: 344,
      height: 320,
      show: false,
      acceptFirstMouse: true,
      resizable: false,
      fullscreen: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    const popupUrl = path.join(__dirname, 'dist/theia/index.html');
    settingsWin.on('close', (e) => {
      e.preventDefault();
      settingsWin.hide();
    });
    settingsWin.loadURL(`file://${popupUrl}#/settings`);
    settingsWin.setMenu(null);
  }
}

const createFeedbackWindow = () => {
  if (feedbackWin === null || feedbackWin.isDestroyed()) {
    feedbackWin = new BrowserWindow({
      parent: mainWin,
      width: 640,
      height: 480,
      show: false,
      acceptFirstMouse: true,
      resizable: true,
      fullscreen: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    const popupUrl = path.join(__dirname, 'dist/theia/index.html');
    feedbackWin.on('close', (e) => {
      e.preventDefault();
      feedbackWin.hide();
    });
    feedbackWin.loadURL(`file://${popupUrl}#/video`);
    feedbackWin.setMenu(null);
  }
}

const createWindows = () => {
  createMainWindow();
  createSettingsWindow();
  createFeedbackWindow();
}


app.whenReady().then(() => {
  createWindows();
  mainWin.webContents.on('did-finish-load', () => mainWin.show());
});

app.on('activate', () => {
  mainWin.show();
});

app.on('before-quit', () => {
  mainWin.destroy();
  feedbackWin.destroy();
  settingsWin.destroy();
});

ipcMain.on('open-settings', () => {
  if (settingsWin.isVisible()) {
    settingsWin.focus();
  } else {
    settingsWin.show();
  }
});

ipcMain.on('open-video', () => {
  if (feedbackWin.isVisible()) {
    feedbackWin.focus();
  } else {
    feedbackWin.show();
  }
  feedbackWin.webContents.send('open-camera');
});

ipcMain.on('close-video', () => {
  feedbackWin.webContents.send('close-camera');
  feedbackWin.close();
});

ipcMain.on('in-device', (event, args) => {
  mainWin.webContents.send('in-device-changed', args);
});

ipcMain.on('out-device', (event, args) => {
  mainWin.webContents.send('out-device-changed', args);
});

ipcMain.on('cam-device', (event, args) => {
  feedbackWin.webContents.send('cam-device-changed', args);
});

ipcMain.on('noise-threshold', (event, args) => {
  mainWin.webContents.send('noise-threshold-changed', args);
});

ipcMain.on('current-noise', (event, args) => {
  if (!settingsWin.isDestroyed() && settingsWin.isVisible()) {
    settingsWin.webContents.send('current-noise-changed', args);
  }
});

ipcMain.on('request-state', (event, args) => {
  mainWin.webContents.send('state-requested', args);
});

ipcMain.on('state-change', (event, args) => {
  settingsWin.webContents.send('state-changed', args);
});

ipcMain.on('address-change', (event, args) => {
  mainWin.webContents.send('address-changed', args);
});
