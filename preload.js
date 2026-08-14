const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    openEngine: (levelData) => ipcRenderer.send("open-engine", levelData),
    closeEngine: () => ipcRenderer.send("close-engine"),
    completeLevel: (levelId, stars) => ipcRenderer.send("complete-level", { levelId, stars }),
    onLevelCompleted: (callback) => {
        ipcRenderer.on("level-completed-signal", (event, data) => callback(data));
    },
    // Read live sample JSON files directly from disk
    getLiveExperience: (levelId) => ipcRenderer.invoke("get-live-experience", levelId)
});
