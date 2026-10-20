const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('Hello from Main');

let mainWindow = null;
let aboutWindow = null;

function getInventoryPath() {
  return path.join(app.getPath('userData'), 'lifelink_inventory.json');
}

function createAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }
  aboutWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: 'About LifeLink',
    resizable: false,
    parent: mainWindow,
    modal: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  aboutWindow.setMenu(null);
  aboutWindow.loadFile(path.join(__dirname, 'about.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL('http://localhost:5173').catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

ipcMain.handle('open-about-window', async () => {
  createAboutWindow();
  return true;
});

ipcMain.handle('inventory:load', async () => {
  try {
    const file = getInventoryPath();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8') || '[]');
  } catch (e) {
    return [];
  }
});

ipcMain.handle('inventory:save', async (_event, data) => {
  try {
    fs.writeFileSync(getInventoryPath(), JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
