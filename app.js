const { app, BrowserWindow, ipcMain, systemPreferences, globalShortcut, Menu, MenuItem } = require('electron')
const path = require('path');

const bounceId = process.platform === 'darwin' ? app.dock.bounce('critical') : null;

let mainWin = null;
let settingsWin = null;
let feedbackWin = null;
let keymap = {
  newTab: ['CommandOrControl+T', 'New tab'],
  prevTab: ['left', 'Previous tab'],
  nextTab: ['right', 'Next tab'],
  closeTab: ['CommandOrControl+W', 'Close tab'],
  toggleCam: ['CommandOrControl+J', 'Toggle camera'],
  toggleMic: ['CommandOrControl+K', 'Toggle microphone'],
  toggleSpeakers: ['CommandOrControl+L', 'Toggle speakers'],
  clear: ['CommandOrControl+D', 'Clear view'],
  gear: ['CommandOrControl+O', 'Settings']
}

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
      autoHideMenuBar: true,
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
    bindMenu();
  }
}

const createSettingsWindow = () => {
  if (settingsWin === null || settingsWin.isDestroyed()) {
    settingsWin = new BrowserWindow({
      parent: mainWin,
      width: 344,
      height: 430,
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

const bindMenu = () => {
  let submenu = [];
  for(let key in keymap) {
    if (key === 'gear') continue;
    if (keymap[key][0].length > 0) {
      submenu.push({
        label: keymap[key][1],
        accelerator: keymap[key][0],
        click: () => mainWin.webContents.send(key)
      });
    }
  }

  submenu.splice(1, 0, {'type': 'separator'})
  submenu.splice(5, 0, {'type': 'separator'})
  submenu.splice(submenu.length - 1, 0, {'type': 'separator'})

  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Application',
    submenu: [
      {'role': 'about'},
      {'type': 'separator'},
      {
        label: keymap['gear'][1],
        accelerator: keymap['gear'][0],
        click: () => mainWin.webContents.send('gear')
      },
      {'role': 'toggleDevTools'},
      {'type': 'separator'},
      {'role': 'quit'}
    ]
  }));
  menu.append(new MenuItem({
    label: 'Edit',
    submenu: [
      {'role': 'undo'},
      {'role': 'redo'},
      {'type': 'separator'},
      {'role': 'cut'},
      {'role': 'copy'},
      {'role': 'paste'},
      {'role': 'selectAll'}
    ]
  }));
  menu.append(new MenuItem({
    label: 'Actions',
    submenu: submenu
  }));
  menu.append(new MenuItem({
    label: 'Window',
    submenu: [
      {'role': 'minimize'},
      {'role': 'zoom'}
    ]
  }));
  Menu.setApplicationMenu(menu);
}

const sendKeymap = () => {
  let formattedKeymap = {}
  for(let key in keymap) {
    let shortcut = keymap[key][0].split('+');
    for(let i=0; i < shortcut.length; i++) {
      if(shortcut[i] === 'CommandOrControl' && process.platform === 'darwin') {
        shortcut[i] = 'Cmd';
      } else if(shortcut[i] === 'CommandOrControl') {
        shortcut[i] = 'Ctrl';
      }
    }
    shortcut = shortcut.join(' + ')
    formattedKeymap[key] = `${keymap[key][1]} (${shortcut})`;
  }
  mainWin.webContents.send('keymap', formattedKeymap);
}

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Authorize self-signed certificates
  event.preventDefault();
  callback(true);
});

app.whenReady()
  // .then(() => {
    // TODO Using GlobalShortcut is a bad idea. Interfering it's hiding other apps shortcut
    // for(let key in keymap) {
    //   if (keymap[key].length > 0) {
    //     globalShortcut.register(keymap[key], () => mainWin.webContents.send(key));
    //   }
    // }
  // })
  .then(() => {
    createWindows();
    mainWin.webContents.on('did-finish-load', () => {
      sendKeymap();
      mainWin.show();
    });
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
  feedbackWin.webContents.send('address-changed', args);
});

ipcMain.on('voice-change', (event, args) => {
  mainWin.webContents.send('voice-changed', args);
});

ipcMain.on('voice-engines-change', (event, args) => {
  mainWin.webContents.send('voice-engines-changed', args);
});

ipcMain.on('request-voice-settings', (event, args) => {
  mainWin.webContents.send('voice-settings-requested', args);
});

ipcMain.on('voice-settings-change', (event, args) => {
  settingsWin.webContents.send('voice-settings-changed', args);
});

// ipcMain.on('update-keymap', (event, args) => {
//   globalShortcut.unregisterAll();
//   // TODO Update keymap here
// });
