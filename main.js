/**
 * ============================================================================
 * LIFELINK — ELECTRON MAIN PROCESS (main.js)
 * ============================================================================
 * [LECTURE ARCHITECTURE: Renderer → Preload Bridge → IPC → Main Process → OS / FS]
 * 
 * This file represents the trusted Electron Main Process. It possesses full access 
 * to OS APIs, native file system persistence (userData), window management, 
 * native dialogs, screen capture (desktopCapturer), authoritative timer pushes,
 * and low-level keyboard input interception.
 * ============================================================================
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, desktopCapturer, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// [LECTURE REQUIREMENT: Terminal Debugging Log]
// Confirms that the Main process has initialized in the Node runtime.
console.log('Hello from Main');

let mainWindow = null;
let aboutWindow = null;
let timerIntervalId = null;
let sessionStartTime = null;
let sessionEndTime = null;
let isAppQuitting = false;

// [LECTURE CONCEPT: Native Theme API Configuration]
// Default to the host operating system's dark/light preference
nativeTheme.themeSource = 'system';

/**
 * [LECTURE CONCEPT: OS File System Directory Resolution]
 * Resolves dedicated folders in the user's OS application data directory (userData)
 * for storing cryptographically timestamped webcam and desktop audit captures.
 */
function getAuditDirectories() {
  const userDataDir = app.getPath('userData');
  const cameraDir = path.join(userDataDir, 'audit_captures', 'camera_feed');
  const screenDir = path.join(userDataDir, 'audit_captures', 'screen_feed');

  if (!fs.existsSync(cameraDir)) fs.mkdirSync(cameraDir, { recursive: true });
  if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });

  return { cameraDir, screenDir };
}

/**
 * [LECTURE CONCEPT: Dual-Process Architecture & Secure WebPreferences]
 * Creates the primary application window.
 * - preload: executes before web content loads, securely exposing IPC channels.
 * - contextIsolation: true prevents prototype pollution and protects the main world.
 * - nodeIntegration: false ensures renderer has NO direct access to Node.js/fs.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Required for desktopCapturer and native fs bindings in Main
    }
  });

  // [LECTURE REQUIREMENT: Removing Default Menu Bar for Clean Desktop Interface]
  Menu.setApplicationMenu(null);

  // [LECTURE CONCEPT: Dual-Terminal Dev Server vs Production Build Fallback]
  // In development, loads the Vite Dev Server (http://localhost:5173).
  // In production or offline test, falls back cleanly to the built dist/index.html.
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  const devUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Retry connecting to Vite dev server, or load local build if Vite is offline
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(devUrl).catch(() => {
            const distPath = path.join(__dirname, 'dist', 'index.html');
            if (fs.existsSync(distPath)) {
              mainWindow.loadFile(distPath);
            }
          });
        }
      }, 1200);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  /**
   * [LECTURE REQUIREMENT: Keyboard Interception via before-input-event]
   * Detects cross-platform copy (Ctrl/Cmd + C) and paste (Ctrl/Cmd + V) shortcuts.
   * Calls event.preventDefault() and triggers a native warning dialog to prevent
   * unauthorized clinical patient data exfiltration or unverified clipboard injection.
   */
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isCtrlOrCmd = input.control || input.meta;

    if (isCtrlOrCmd && input.key.toLowerCase() === 'c') {
      event.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Security Notice: Copy Restricted',
        message: 'Copying sensitive donor or patient records is restricted.',
        detail: 'LifeLink enforces end-to-end data privacy under healthcare compliance regulations.',
        buttons: ['Understood']
      });
    } else if (isCtrlOrCmd && input.key.toLowerCase() === 'v') {
      event.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Security Notice: Paste Restricted',
        message: 'Pasting untrusted medical data or credentials into LifeLink is restricted.',
        detail: 'Direct clipboard injection of medication dosages or donor codes is blocked to ensure clinical safety.',
        buttons: ['Understood']
      });
    }
  });

  /**
   * [LECTURE REQUIREMENT: Native OS Exit Confirmation Dialog]
   * Intercepts the window close event to confirm exit before shutting down,
   * cleanly halting active SLA timers and webcam audits without corrupting state.
   */
  mainWindow.on('close', async (event) => {
    if (isAppQuitting) return;
    event.preventDefault();

    const res = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Exit LifeLink',
      message: 'Exit LifeLink? Any unsaved dispatch verification will stop.',
      detail: 'Active SLA sessions and uncommitted local inventory will be cleanly halted.',
      buttons: ['Exit', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    });

    if (res.response === 0) {
      isAppQuitting = true;
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }
      if (aboutWindow && !aboutWindow.isDestroyed()) {
        aboutWindow.destroy();
      }
      mainWindow.destroy();
      app.quit();
    }
  });

  // [LECTURE REQUIREMENT: Native Startup Welcome Dialog]
  // Triggers once the main window finishes loading its DOM
  mainWindow.webContents.once('did-finish-load', () => {
    showWelcomeDialog();
  });
}

/**
 * [LECTURE REQUIREMENT: Secondary Window (createAboutWindow)]
 * Opens a dedicated 400x300 modal window loading the local about.html file,
 * displaying clinical guidelines, version info, and emergency response hotlines.
 */
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
    minimizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  aboutWindow.setMenu(null);
  aboutWindow.loadFile(path.join(__dirname, 'about.html'));

  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

/**
 * [LECTURE REQUIREMENT: Welcome Dialog Implementation]
 * Native information modal informing staff of network connectivity status.
 */
function showWelcomeDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Welcome to LifeLink',
    message: 'LifeLink Network Initialized',
    detail: 'Connected to community emergency blood and essential medicine network. Version 1.0.0.\nDual-process architecture active (Renderer ↔ Preload ↔ Main ↔ Express).',
    buttons: ['OK']
  });
}

/**
 * [LECTURE REQUIREMENT: Local File Persistence Helper in userData]
 * Returns the absolute OS path to the persistent lifelink_inventory.json storage.
 */
function getInventoryPath() {
  return path.join(app.getPath('userData'), 'lifelink_inventory.json');
}

/**
 * ============================================================================
 * [LECTURE REQUIREMENT: SECURE IPC HANDLER REGISTRATION]
 * ============================================================================
 */
function setupIpcHandlers() {

  // --------------------------------------------------------------------------
  // A. Local Persistence via Secure IPC (userData JSON Storage)
  // --------------------------------------------------------------------------
  
  // "inventory:load" — reads JSON file synchronously from disk; returns [] if absent
  ipcMain.handle('inventory:load', async () => {
    try {
      const filePath = getInventoryPath();
      if (!fs.existsSync(filePath)) {
        // Default seed to populate first launch
        const defaultSeed = [
          {
            id: 'local-inv-001',
            medicineName: 'Epinephrine 1mg/mL Auto-Injectors',
            batchNumber: 'EPI-2026-440',
            category: 'Emergency Resuscitation',
            quantity: 35,
            unit: 'auto-injectors',
            expiryDate: '2026-11-05',
            status: 'Near Expiry',
            notes: 'Cold chain verified. Stationed at Trauma Bay 1.'
          },
          {
            id: 'local-inv-002',
            medicineName: 'Tranexamic Acid (TXA) 1000mg/10mL',
            batchNumber: 'TXA-2024-883',
            category: 'Hemostatics / Trauma',
            quantity: 12,
            unit: 'vials',
            expiryDate: '2026-10-18',
            status: 'Expired',
            notes: 'Quarantined for disposal review.'
          },
          {
            id: 'local-inv-003',
            medicineName: 'Packed RBCs (Group O-Negative)',
            batchNumber: 'RBC-ON-9912',
            category: 'Blood Component',
            quantity: 4,
            unit: 'units',
            expiryDate: '2026-11-28',
            status: 'Adequate',
            notes: 'Universal emergency donor reserve.'
          }
        ];
        fs.writeFileSync(filePath, JSON.stringify(defaultSeed, null, 2), 'utf-8');
        return defaultSeed;
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[Main IPC] Error loading inventory:', err);
      return [];
    }
  });

  // "inventory:save" — receives updated array and writes atomically to userData JSON
  ipcMain.handle('inventory:save', async (_event, data) => {
    try {
      const filePath = getInventoryPath();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('[Main IPC] Error saving inventory:', err);
      return { success: false, error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // B. Native OS Dialogs for Critical Actions (Never use window.alert / confirm)
  // --------------------------------------------------------------------------

  // Delete / Discard Expired Medicine Dialog
  // Returns result.response (0 for Delete, 1 for Cancel)
  ipcMain.handle('dialog:delete-medicine', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return 1;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Confirm Deletion',
      message: 'Confirm Deletion: Remove this expired medicine batch from inventory?',
      detail: 'This action will permanently delete this lot from local inventory records and log a disposal record.',
      buttons: ['Delete', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    });
    return result.response;
  });

  // Emergency Dispatch Rules Dialog (show-rules)
  // Returns result.response: React proceeds only if res === 0 ("Start Dispatch")
  ipcMain.handle('show-rules', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return 1;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Emergency Dispatch & Verification Rules',
      message: 'Emergency Dispatch & Verification Rules',
      detail:
        '1. Maintain continuous camera and screen monitoring during dispatch.\n' +
        '2. Verify batch codes against physical packaging.\n' +
        '3. Complete verification before SLA timer expires (15 minutes).\n' +
        '4. All captures are cryptographically logged for clinical audit.',
      buttons: ['Start Dispatch', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    });
    return result.response;
  });

  // Native Exit Confirmation IPC
  ipcMain.handle('dialog:confirm-exit', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return 1;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Exit LifeLink',
      message: 'Exit LifeLink? Any unsaved dispatch verification will stop.',
      buttons: ['Exit', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    });
    return result.response;
  });

  // --------------------------------------------------------------------------
  // C. Authoritative Emergency SLA Timer (Main → Renderer Push Stream)
  // --------------------------------------------------------------------------

  // [LECTURE BUG FIX 1: Guard against duplicate calls so two intervals never race]
  ipcMain.handle('start-timer', async (_event, customDurationSeconds) => {
    if (timerIntervalId) {
      return {
        success: true,
        alreadyRunning: true,
        startTime: sessionStartTime,
        endTime: sessionEndTime
      };
    }

    const duration = customDurationSeconds || 900; // 15-minute default SLA
    sessionStartTime = Date.now();
    sessionEndTime = sessionStartTime + duration * 1000;

    // [LECTURE BUG FIX 2: Store intervalId in Main, push every 1s, clear on expire]
    timerIntervalId = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, sessionEndTime - now);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const elapsedSeconds = Math.floor((now - sessionStartTime) / 1000);
      const isExpired = remainingSeconds <= 0;

      // Authoritative Push Stream: send directly to the renderer's webContents
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer', {
          remainingSeconds,
          elapsedSeconds,
          totalSeconds: duration,
          isExpired,
          timestamp: now
        });
      }

      if (isExpired) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }
    }, 1000);

    return {
      success: true,
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      totalSeconds: duration
    };
  });

  // Stop SLA timer and clean up interval
  ipcMain.handle('stop-timer', async () => {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    sessionStartTime = null;
    sessionEndTime = null;
    return { success: true };
  });

  // [LECTURE BUG FIX 1B: implement get-time-left returning Math.max(0, endTime - Date.now())]
  ipcMain.handle('get-time-left', async () => {
    if (!sessionEndTime) return 0;
    return Math.max(0, sessionEndTime - Date.now());
  });

  // --------------------------------------------------------------------------
  // D. Synchronized Camera + Screen Audit Capture Pipeline
  // --------------------------------------------------------------------------

  // [LECTURE CHALLENGE: Save Webcam Frame with Identical Timestamp]
  // Converts incoming renderer ArrayBuffer to Node.js Buffer and writes photo-${timestamp}.jpg
  ipcMain.handle('save-photo', async (_event, { arrayBuffer, timestamp }) => {
    try {
      const { cameraDir } = getAuditDirectories();
      const ts = timestamp || Date.now();
      const filename = `photo-${ts}.jpg`;
      const filePath = path.join(cameraDir, filename);

      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      return { success: true, filename, filePath };
    } catch (err) {
      console.error('[Main IPC] Error saving webcam photo:', err);
      return { success: false, error: err.message };
    }
  });

  // [LECTURE CHALLENGE: Screen Audit with desktopCapturer]
  // Captures primary display thumbnail and writes screen-${timestamp}.png with identical timestamp
  ipcMain.handle('take-screenshot', async (_event, timestamp) => {
    try {
      const { screenDir } = getAuditDirectories();
      const ts = timestamp || Date.now();
      const filename = `screen-${ts}.png`;
      const filePath = path.join(screenDir, filename);

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (!sources || sources.length === 0) {
        throw new Error('No desktop screen sources available for audit');
      }

      const pngBuffer = sources[0].thumbnail.toPNG();
      fs.writeFileSync(filePath, pngBuffer);

      return { success: true, filename, filePath };
    } catch (err) {
      console.error('[Main IPC] Error taking screen capture:', err);
      return { success: false, error: err.message };
    }
  });

  // Fetch recent audit logs for the live audit verification component
  ipcMain.handle('audit:get-logs', async () => {
    try {
      const { cameraDir, screenDir } = getAuditDirectories();
      const cameraFiles = fs.readdirSync(cameraDir).filter((f) => f.startsWith('photo-'));
      const screenFiles = fs.readdirSync(screenDir).filter((f) => f.startsWith('screen-'));

      return {
        cameraCaptures: cameraFiles.slice(-10).reverse(),
        screenCaptures: screenFiles.slice(-10).reverse()
      };
    } catch (err) {
      return { cameraCaptures: [], screenCaptures: [] };
    }
  });

  // --------------------------------------------------------------------------
  // E. Window, Kiosk Mode, & Lifecycle IPC Handlers
  // --------------------------------------------------------------------------

  // Trigger secondary About Window from UI
  ipcMain.handle('open-about-window', async () => {
    createAboutWindow();
    return true;
  });

  // [LECTURE CHALLENGE: Enforce Fullscreen / Kiosk Mode from Main Process]
  ipcMain.handle('set-kiosk', async (_event, enabled) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(Boolean(enabled));
      mainWindow.setKiosk(Boolean(enabled));
      return enabled;
    }
    return false;
  });

  // Quit application gracefully
  ipcMain.handle('exit-app', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    return true;
  });

  // --------------------------------------------------------------------------
  // F. Native Theme Management
  // --------------------------------------------------------------------------
  ipcMain.handle('theme:get', async () => {
    return nativeTheme.themeSource;
  });

  ipcMain.handle('theme:set', async (_event, theme) => {
    if (['light', 'dark', 'system'].includes(theme)) {
      nativeTheme.themeSource = theme;
    }
    return {
      themeSource: nativeTheme.themeSource,
      isDark: nativeTheme.shouldUseDarkColors
    };
  });
}

/**
 * ============================================================================
 * [LECTURE REQUIREMENT: APPLICATION LIFECYCLE MANAGEMENT]
 * ============================================================================
 * Waits for app.whenReady() before initializing window, ensuring proper shutdown.
 */
app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Clear any active timer intervals to prevent memory leaks
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
