const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// IPC channels without exposing Node.js or raw IPC objects directly.
contextBridge.exposeInMainWorld('lifelinkAPI', {
  // 1. Local Persistence via Secure IPC (userData JSON storage)
  loadInventory: async () => {
    return await ipcRenderer.invoke('inventory:load');
  },
  saveInventory: async (data) => {
    return await ipcRenderer.invoke('inventory:save', data);
  },

  // 2. Native OS Dialogs
  showDeleteMedicineDialog: async () => {
    return await ipcRenderer.invoke('dialog:delete-medicine');
  },
  showRulesDialog: async () => {
    return await ipcRenderer.invoke('show-rules');
  },
  showExitConfirmation: async () => {
    return await ipcRenderer.invoke('dialog:confirm-exit');
  },

  // 3. Authoritative SLA Timer (Main -> Renderer Push Stream)
  startTimer: async (durationSeconds) => {
    return await ipcRenderer.invoke('start-timer', durationSeconds);
  },
  stopTimer: async () => {
    return await ipcRenderer.invoke('stop-timer');
  },
  getTimeLeft: async () => {
    return await ipcRenderer.invoke('get-time-left');
  },
  // Register listener for push stream and return cleanup function for useEffect
  onTimerUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer', handler);
    return () => {
      ipcRenderer.removeListener('timer', handler);
    };
  },

  // 4. Synchronized Camera + Screen Audit Captures
  savePhoto: async (arrayBuffer, timestamp) => {
    return await ipcRenderer.invoke('save-photo', { arrayBuffer, timestamp });
  },
  takeScreenShot: async (timestamp) => {
    return await ipcRenderer.invoke('take-screenshot', timestamp);
  },
  getAuditLogs: async () => {
    return await ipcRenderer.invoke('audit:get-logs');
  },

  // 5. Window & Kiosk / Emergency Security Controls
  openAboutWindow: async () => {
    return await ipcRenderer.invoke('open-about-window');
  },
  setKioskMode: async (enabled) => {
    return await ipcRenderer.invoke('set-kiosk', enabled);
  },
  exitApp: async () => {
    return await ipcRenderer.invoke('exit-app');
  },

  // 6. Native Theme Management
  getTheme: async () => {
    return await ipcRenderer.invoke('theme:get');
  },
  setTheme: async (theme) => {
    return await ipcRenderer.invoke('theme:set', theme);
  }
});
