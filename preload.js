const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    login: (credentials) => ipcRenderer.invoke("login-user", credentials),
    syncNow: (cmsHost) => ipcRenderer.invoke("start-initial-sync", cmsHost),
    getSyncStatus: () => ipcRenderer.invoke("get-sync-status"),
    getLessons: () => ipcRenderer.invoke("get-lessons"),
    // Renderer sends pre-fetched CMS data to main for SQLite storage
    // (bypasses Node http which fails on Windows loopback)
    pushCmsData: (payload) => ipcRenderer.invoke("push-cms-data", payload)
});

contextBridge.exposeInMainWorld("electronAPI", {
    openEngine: (levelData) => ipcRenderer.send("open-engine", levelData),
    closeEngine: () => ipcRenderer.send("close-engine"),
    completeLevel: (levelId, stars) => ipcRenderer.send("complete-level", { levelId, stars }),
    onLevelCompleted: (callback) => {
        ipcRenderer.on("level-completed-signal", (event, data) => callback(data));
    },
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
    // Student session persistence
    saveStudentSession: (sessionData) => ipcRenderer.invoke("save-student-session", sessionData),
    loadStudentSession: () => ipcRenderer.invoke("load-student-session"),
    // CMS base URL retrieval
    getCmsBaseUrl: () => ipcRenderer.invoke("get-cms-base-url"),
    // Login User bridge helper
    loginUser: (credentials) => ipcRenderer.invoke("login-user", credentials)
});
