const { contextBridge, ipcRenderer, webFrame } = require("electron");

// Cleanly suppress internal Electron developer security warnings
try {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    process.env['ELECTRON_ENABLE_SECURITY_WARNINGS'] = 'false';
    if (typeof window !== 'undefined') {
        window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;
        window.ELECTRON_ENABLE_SECURITY_WARNINGS = false;
    }
} catch (e) {}

const _isFilteredLog = (msg) => {
    return typeof msg === 'string' && (
        msg.includes('Electron Security Warning') ||
        msg.includes('onnxruntime') ||
        msg.includes('CleanUnusedInitializersAndNodeArgs') ||
        msg.includes('Removing initializer') ||
        msg.includes('Speech recognition status: network') ||
        msg.includes('ERR_NETWORK_CHANGED') ||
        msg.includes('Failed to load resource') ||
        msg.includes('DEBUG: experienceType is:')
    );
};

const _origWarn = console.warn;
console.warn = function (...args) {
    if (args.length > 0 && _isFilteredLog(args[0])) {
        return;
    }
    return _origWarn.apply(console, args);
};

const _origError = console.error;
console.error = function (...args) {
    if (args.length > 0 && _isFilteredLog(args[0])) {
        return;
    }
    return _origError.apply(console, args);
};

try {
    webFrame.executeJavaScript(`
        (() => {
            window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;
            window.ELECTRON_ENABLE_SECURITY_WARNINGS = false;
            const _filter = (msg) => typeof msg === 'string' && (
                msg.includes('Electron Security Warning') ||
                msg.includes('onnxruntime') ||
                msg.includes('CleanUnusedInitializersAndNodeArgs') ||
                msg.includes('Removing initializer') ||
                msg.includes('Speech recognition status: network') ||
                msg.includes('ERR_NETWORK_CHANGED') ||
                msg.includes('Failed to load resource') ||
                msg.includes('DEBUG: experienceType is:')
            );
            const _w = console.warn;
            console.warn = function(...args) {
                if (args.length > 0 && _filter(args[0])) return;
                return _w.apply(console, args);
            };
            const _e = console.error;
            console.error = function(...args) {
                if (args.length > 0 && _filter(args[0])) return;
                return _e.apply(console, args);
            };
        })();
    `);
} catch (e) {}

contextBridge.exposeInMainWorld("api", {
    login: (credentials) => ipcRenderer.invoke("login-user", credentials),
    syncNow: (cmsHost) => ipcRenderer.invoke("start-initial-sync", cmsHost),
    getSyncStatus: () => ipcRenderer.invoke("get-sync-status"),
    getLessons: () => ipcRenderer.invoke("get-lessons"),
    saveStudentProgress: (data) => ipcRenderer.invoke("save-student-progress", data),
    getStudentProgress: (studentId) => ipcRenderer.invoke("get-student-progress", studentId),
    // Renderer sends pre-fetched CMS data to main for SQLite storage
    // (bypasses Node http which fails on Windows loopback)
    pushCmsData: (payload) => ipcRenderer.invoke("push-cms-data", payload),
    exitApp: () => {
        try {
            ipcRenderer.send("exit-app");
            ipcRenderer.invoke("exit-app");
        } catch (e) {
            console.error("exitApp error:", e);
        }
    }
});

contextBridge.exposeInMainWorld("electronAPI", {
    openEngine: (levelData) => ipcRenderer.send("open-engine", levelData),
    closeEngine: () => ipcRenderer.send("close-engine"),
    completeLevel: (levelId, stars) => ipcRenderer.send("complete-level", { levelId, stars }),
    onLevelCompleted: (callback) => {
        ipcRenderer.on("level-completed-signal", (event, data) => callback(data));
    },
    // Offline Progress Tracking (SQLite)
    saveStudentProgress: (data) => ipcRenderer.invoke("save-student-progress", data),
    getStudentProgress: (studentId) => ipcRenderer.invoke("get-student-progress", studentId),
    // Read live sample JSON files directly from disk
    getLiveExperience: (levelId) => ipcRenderer.invoke("get-live-experience", levelId),
    // Fetch package experience.json by package ID
    getPackageExperience: (packageId) => ipcRenderer.invoke("get-package-experience", packageId),
    // Fetch published packages received from CMS (optionally filtered by student grade or student ID)
    getCmsPackages: (studentGradeOrCode) => ipcRenderer.invoke("get-cms-packages", studentGradeOrCode),
    // List local experiences folders
    listLocalExperiences: () => ipcRenderer.invoke("list-local-experiences"),
    // Download & extract .elab zip packages into userData/experiences/
    downloadAndExtractPackage: (pkgData) => ipcRenderer.invoke("download-and-extract-package", pkgData),
    // Full LMS Package Sync Bridge
    syncLmsPackages: (token) => ipcRenderer.invoke("sync-lms-packages", token),
    syncNow: (cmsHost) => ipcRenderer.invoke("start-initial-sync", cmsHost),
    getSyncStatus: () => ipcRenderer.invoke("get-sync-status"),
    // Student session persistence
    saveStudentSession: (sessionData) => ipcRenderer.invoke("save-student-session", sessionData),
    loadStudentSession: () => ipcRenderer.invoke("load-student-session"),
    // CMS base URL retrieval
    getCmsBaseUrl: () => ipcRenderer.invoke("get-cms-base-url"),
    // Login User bridge helper
    loginUser: (credentials) => ipcRenderer.invoke("login-user", credentials),
    // Support Email delivery & mailto bridge
    sendSupportEmail: (payload) => ipcRenderer.invoke("send-support-email", payload),
    openExternal: (url) => ipcRenderer.invoke("open-external", url),
    // Window Display & Fullscreen Controls
    setFullScreen: (flag) => ipcRenderer.invoke("set-fullscreen", flag),
    toggleFullScreen: () => ipcRenderer.invoke("toggle-fullscreen"),
    isFullScreen: () => ipcRenderer.invoke("is-fullscreen"),
    // Application Exit
    exitApp: () => {
        try {
            ipcRenderer.send("exit-app");
            ipcRenderer.invoke("exit-app");
        } catch (e) {
            console.error("exitApp error:", e);
        }
    }
});
