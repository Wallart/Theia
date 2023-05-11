const { app, BrowserWindow, ipcMain, systemPreferences, globalShortcut } = require('electron')
const path = require('path');
const url = require('url');

let running = true;
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
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    })

    const url = path.join(__dirname, 'dist/theia/index.html');
    mainWin.on('closed', () => {
      if (running) createMainWindow();
    });
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
    const popupUrl = path.join(__dirname, 'dist/theia/index.html#/settings');
    settingsWin.on('closed', () => {
      if (running) createSettingsWindow();
    });
    settingsWin.loadURL(`file://${popupUrl}`);
    settingsWin.hide();
  }
}

const createFeedbackWindow = () => {
  if (feedbackWin === null || feedbackWin.isDestroyed()) {
    feedbackWin = new BrowserWindow({
      parent: mainWin,
      width: 640,
      height: 480,
      resizable: true,
      fullscreen: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    const popupUrl = path.join(__dirname, 'dist/theia/index.html#/video');
    feedbackWin.on('closed', () => {
      if (running) createFeedbackWindow();
    });
    feedbackWin.loadURL(`file://${popupUrl}`);
    feedbackWin.hide();
  }
}

const createWindows = () => {
  createMainWindow();
  createSettingsWindow();
  createFeedbackWindow();
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

app.on('before-quit', () => {
  running = false;
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
});

ipcMain.on('close-video', () => {
  if (feedbackWin !== null) {
    feedbackWin.close();
  }
});

ipcMain.on('in-device', (event, args) => {
  mainWin.webContents.send('in-device-changed', args);
});

ipcMain.on('out-device', (event, args) => {
  mainWin.webContents.send('out-device-changed', args);
});

ipcMain.on('cam-device', (event, args) => {
  mainWin.webContents.send('cam-device-changed', args);
});

ipcMain.on('video-stream', (event, args) => {
  feedbackWin.webContents.send('video-stream-received', args);
});

ipcMain.on('noise-threshold', (event, args) => {
  mainWin.webContents.send('noise-threshold-changed', args);
});

ipcMain.on('current-noise', (event, args) => {
  if (running && settingsWin.isVisible()) {
    settingsWin.webContents.send('current-noise-changed', args);
  }
});

