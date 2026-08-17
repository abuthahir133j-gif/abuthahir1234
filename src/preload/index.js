const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API context bridge to Renderer Process
contextBridge.exposeInMainWorld('api', {
    /**
     * Trigger manual or initial sync handshake with CMS server
     * @param {string} [cmsHost] - Optional CMS host IP/URL (e.g., http://localhost:8000 or http://192.168.1.50:8000)
     */
    syncNow: (cmsHost) => ipcRenderer.invoke('start-initial-sync', cmsHost),

    /**
     * Log in user with offline SQLite check and auto-sync fallback
     * @param {Object} credentials - { username, password, cmsHost }
     */
    login: (credentials) => ipcRenderer.invoke('login-user', credentials),

    /**
     * Retrieve local database sync status & metadata
     */
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),

    /**
     * Fetch all APPROVED lessons from local SQLite database
     */
    getLessons: () => ipcRenderer.invoke('get-lessons')
});
