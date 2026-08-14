const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let engineWindow = null;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js")
        }
    });

    mainWindow.loadFile("login.html");

    mainWindow.on("closed", () => {
        mainWindow = null;
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
        }
    });
}

function openEngineWindow(levelData) {
    if (engineWindow && !engineWindow.isDestroyed()) {
        engineWindow.focus();
        return;
    }

    engineWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: false,
        parent: mainWindow || undefined,
        modal: false,
        title: `Language Lab Engine - ${levelData?.title || 'Level'}`,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js")
        }
    });

    const distIndexPath = path.join(__dirname, "language-lab-engine", "dist", "index.html");
    const levelId = levelData?.id || 1;
    const levelTitle = encodeURIComponent(levelData?.title || "");

    if (fs.existsSync(distIndexPath)) {
        engineWindow.loadFile(distIndexPath, {
            search: `levelId=${levelId}&title=${levelTitle}`
        });
    } else {
        // Fallback if dev server is running or dist not built yet
        engineWindow.loadURL(`http://localhost:5173/?levelId=${levelId}&title=${levelTitle}`).catch(() => {
            engineWindow.loadFile(path.join(__dirname, "language-lab-engine", "index.html"), {
                search: `levelId=${levelId}&title=${levelTitle}`
            });
        });
    }

    engineWindow.on("closed", () => {
        engineWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    createMainWindow();

    ipcMain.on("open-engine", (event, levelData) => {
        openEngineWindow(levelData);
    });

    ipcMain.on("close-engine", () => {
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
        }
    });

    ipcMain.on("complete-level", (event, data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("level-completed-signal", data);
        }
    });

    ipcMain.handle("get-live-experience", async (event, levelId) => {
        try {
            const samplesDir = path.join(__dirname, "language-lab-engine", "src", "runtime", "samples");
            if (!fs.existsSync(samplesDir)) return null;

            const files = fs.readdirSync(samplesDir);
            const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "manifest.json" && f !== "metadata.json");

            if (jsonFiles.length === 0) return null;

            let targetFile = null;

            if (levelId) {
                const possibleNames = [
                    `level${levelId}.json`,
                    `level_${levelId}.json`,
                    `${levelId}.json`
                ];
                targetFile = jsonFiles.find(f => possibleNames.includes(f));

                if (!targetFile) {
                    for (const file of jsonFiles) {
                        try {
                            const raw = fs.readFileSync(path.join(samplesDir, file), "utf-8");
                            const parsed = JSON.parse(raw);
                            if (parsed && String(parsed.id) === String(levelId)) {
                                targetFile = file;
                                break;
                            }
                        } catch (err) {}
                    }
                }
            }

            if (!targetFile) {
                targetFile = jsonFiles.find(f => f === "experience.json") || jsonFiles[0];
            }

            const filePath = path.join(samplesDir, targetFile);
            console.log(`[IPC] Reading live JSON file from disk: ${filePath}`);
            const content = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(content);
        } catch (e) {
            console.error("[IPC] Error reading live experience JSON:", e);
            return null;
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});