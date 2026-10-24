/**
 * ============================================================================
 * LIFELINK — PRELOAD BRIDGE SCRIPT (preload.js)
 * ============================================================================
 * [LECTURE ARCHITECTURE: Renderer → Preload Bridge → IPC → Main Process]
 * 
 * Secure isolation boundary. Because 'nodeIntegration: false' and 
 * 'contextIsolation: true' are enforced in main.js, the React renderer cannot
 * directly access Node.js modules (fs, path, child_process) or raw IPC primitives.
 * 
 * We use 'contextBridge.exposeInMainWorld' to expose a strictly controlled,
 * promise-based API ('window.lifelinkAPI').
 * ============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifelinkAPI', {

  // --------------------------------------------------------------------------
  // 1. Local File Persistence via Secure IPC (userData JSON Storage)
  // --------------------------------------------------------------------------
  
  /**
   * [LECTURE REQUIREMENT: loadInventory]
   * Invokes the 'inventory:load' IPC channel in Main.
   * [LECTURE BUG FIX 3: Ensure every ipcRenderer.invoke is properly awaited]
   */
  loadInventory: async () => {
    try {
      return await ipcRenderer.invoke('inventory:load');
    } catch (err) {
      console.error('[Preload API] loadInventory error:', err);
      return [];
    }
  },

  /**
   * [LECTURE REQUIREMENT: saveInventory]
   * Invokes the 'inventory:save' IPC channel in Main with the updated inventory array.
   */
  saveInventory: async (data) => {
    try {
      return await ipcRenderer.invoke('inventory:save', data);
    } catch (err) {
      console.error('[Preload API] saveInventory error:', err);
      return { success: false, error: err.message };
    }
  },

  // --------------------------------------------------------------------------
  // 2. Native OS Dialogs for Critical Healthcare Operations
  // --------------------------------------------------------------------------
  
  /**
   * Discard Expired Medicine Dialog
   * Returns result.response index (0 for Delete, 1 for Cancel)
   */
  showDeleteMedicineDialog: async () => {
    return await ipcRenderer.invoke('dialog:delete-medicine');
  },

  /**
   * Emergency Dispatch Rules Dialog (show-rules)
   * Returns result.response index (0 for Start Dispatch, 1 for Cancel)
   */
  showRulesDialog: async () => {
    return await ipcRenderer.invoke('show-rules');
  },

  /**
   * Native Exit Confirmation Dialog
   */
  showExitConfirmation: async () => {
    return await ipcRenderer.invoke('dialog:confirm-exit');
  },

  // --------------------------------------------------------------------------
  // 3. Authoritative Emergency SLA Push Timer Stream (Main → Renderer)
  // --------------------------------------------------------------------------

  /**
   * Invokes Main process authoritative SLA timer start
   * Guarded against duplicate race conditions in Main
   */
  startTimer: async (durationSeconds) => {
    return await ipcRenderer.invoke('start-timer', durationSeconds);
  },

  /**
   * Stops the active SLA timer interval in Main
   */
  stopTimer: async () => {
    return await ipcRenderer.invoke('stop-timer');
  },

  /**
   * [LECTURE REQUIREMENT: get-time-left]
   * Returns Math.max(0, endTime - Date.now()) directly from Main process
   */
  getTimeLeft: async () => {
    return await ipcRenderer.invoke('get-time-left');
  },

  /**
   * [LECTURE REQUIREMENT: Stream Subscription & Cleanup Closure]
   * Registers a listener for push stream updates pushed from Main via webContents.send("timer").
   * Returns a cleanup closure (() => ipcRenderer.removeListener("timer", handler))
   * designed to be returned directly by React's useEffect hook to prevent memory leaks.
   */
  onTimerUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer', handler);
    return () => {
      ipcRenderer.removeListener('timer', handler);
    };
  },

  // --------------------------------------------------------------------------
  // 4. Synchronized Camera + Screen Audit Capture Pipeline
  // --------------------------------------------------------------------------

  /**
   * [LECTURE CHALLENGE: Synchronized Timestamps]
   * Transmits ArrayBuffer of the webcam snapshot along with the synchronized timestamp
   */
  savePhoto: async (arrayBuffer, timestamp) => {
    return await ipcRenderer.invoke('save-photo', { arrayBuffer, timestamp });
  },

  /**
   * [LECTURE CHALLENGE: Screen Audit via desktopCapturer in Main]
   * Instructs Main process to capture current screen with the exact same timestamp
   */
  takeScreenShot: async (timestamp) => {
    return await ipcRenderer.invoke('take-screenshot', timestamp);
  },

  /**
   * Fetches recent audit logs for the real-time clinical audit verification display
   */
  getAuditLogs: async () => {
    return await ipcRenderer.invoke('audit:get-logs');
  },

  // --------------------------------------------------------------------------
  // 5. Window, Fullscreen Kiosk, & Application Lifecycle
  // --------------------------------------------------------------------------

  /**
   * [LECTURE REQUIREMENT: createAboutWindow secondary modal trigger]
   */
  openAboutWindow: async () => {
    return await ipcRenderer.invoke('open-about-window');
  },

  /**
   * [LECTURE CHALLENGE: Enforce Fullscreen/Kiosk from Main process]
   */
  setKioskMode: async (enabled) => {
    return await ipcRenderer.invoke('set-kiosk', enabled);
  },

  /**
   * Trigger application shutdown
   */
  exitApp: async () => {
    return await ipcRenderer.invoke('exit-app');
  },

  // --------------------------------------------------------------------------
  // 6. Native Theme Management
  // --------------------------------------------------------------------------
  getTheme: async () => {
    return await ipcRenderer.invoke('theme:get');
  },
  setTheme: async (theme) => {
    return await ipcRenderer.invoke('theme:set', theme);
  }
});
