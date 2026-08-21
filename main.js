const path = require('path');
const fs = require('fs'); // Explicit Node.js core filesystem module import
const { app, BrowserWindow, ipcMain } = require('electron');

// Allow Electron's net module (Chromium) to connect to localhost without TLS/CORS issues
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('host-resolver-rules', 'MAP localhost 127.0.0.1');

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

async function openEngine(packageData) {
    let packageId = typeof packageData === 'object' ? (packageData?.packageId || packageData?.id || packageData?.scenarioId || 1) : packageData;
    let packageTitle = typeof packageData === 'object' ? (packageData?.title || packageId) : packageId;

    // Resolve actual lesson from SQLite for Level 1 or given level
    try {
        const { getLessonsForGrade } = require("./src/main/db/sqlite");
        const lessons = getLessonsForGrade();
        if (Array.isArray(lessons) && lessons.length > 0) {
            if (Number(packageId) === 1 || String(packageId) === '1') {
                packageId = lessons[0]?.lesson_id || '49';
                packageTitle = lessons[0]?.title || 'The Lost Picnic';
            } else {
                const found = lessons.find(l => String(l.lesson_id) === String(packageId));
                if (found) {
                    packageId = found.lesson_id;
                    packageTitle = found.title;
                }
            }
        }
    } catch (e) {}

    try {
        console.log('[Main Process] Attempting to open engine for package:', packageId, 'Title:', packageTitle);

        const indexPath = path.join(__dirname, 'player.html');
        console.log('[Main Process] Engine Renderer Target:', indexPath);

        // 4. Launch Engine Window
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.focus();
        } else {
            engineWindow = new BrowserWindow({
                width: 1280,
                height: 800,
                fullscreen: false,
                parent: mainWindow || undefined,
                modal: false,
                title: `Language Lab Experience Engine - ${packageTitle}`,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    webSecurity: false,
                    allowRunningInsecureContent: true,
                    preload: path.join(__dirname, "preload.js")
                }
            });

            engineWindow.on('closed', () => {
                engineWindow = null;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                }
            });
        }

        // 5. Load target into engine window
        const queryParams = `levelId=${encodeURIComponent(packageId)}&title=${encodeURIComponent(packageTitle)}&packageId=${encodeURIComponent(packageId)}`;

        if (indexPath.startsWith('http') || indexPath.includes('?')) {
            const targetUrl = indexPath.includes('?') ? `${indexPath}&${queryParams}` : `${indexPath}?${queryParams}`;
            await engineWindow.loadURL(targetUrl.startsWith('http') ? targetUrl : `file://${targetUrl}`);
        } else {
            await engineWindow.loadFile(indexPath, {
                search: queryParams
            });
        }

        console.log('[Main Process] Experience engine loaded successfully!');
        return { success: true };

    } catch (err) {
        console.error('[Main Process] Exception in openEngine:', err.message);
        engineWindow = null;
        return { success: false, error: err.message };
    }
}

function openEngineWindow(levelData) {
    return openEngine(levelData);
}

const { initDatabase } = require("./src/main/db/sqlite");
const { initIpcHandlers } = require("./src/main/ipcHandlers");

app.whenReady().then(() => {
    // Initialize SQLite database and IPC handlers
    initDatabase();
    initIpcHandlers();

    createMainWindow();

    ipcMain.handle('open-engine', async (event, packageId) => {
        return await openEngine(packageId);
    });

    ipcMain.handle('get-package-experience', async (event, packageId) => {
        try {
            const requestedId = String(packageId || '49');
            
            // Check 1: assets/packages/<id>/experience.json
            const localAssetsDir = path.join(__dirname, 'assets', 'packages', requestedId);
            const localJsonPath = path.join(localAssetsDir, 'experience.json');
            if (fs.existsSync(localJsonPath)) {
                const data = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
                return { success: true, data, basePath: localAssetsDir };
            }

            // Check 2: Check SQLite lessons table
            const { getDb } = require('./src/main/db/sqlite');
            const db = getDb();
            const row = db.prepare('SELECT payload_json FROM lessons WHERE lesson_id = ? OR title LIKE ? LIMIT 1').get(requestedId, `%${requestedId}%`);
            if (row && row.payload_json) {
                const data = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
                if (data.activities) {
                    return { success: true, data, basePath: localAssetsDir };
                }
            }

            // Check 3: userData/experiences
            const experiencesDir = path.join(app.getPath('userData'), 'experiences');
            let baseDir = path.join(experiencesDir, requestedId);
            if (!fs.existsSync(baseDir) && fs.existsSync(experiencesDir)) {
                const allDirs = fs.readdirSync(experiencesDir);
                const match = allDirs.find(d => d === requestedId || d.startsWith(requestedId));
                if (match) baseDir = path.join(experiencesDir, match);
            }

            const jsonPath = path.join(baseDir, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                return { success: true, data, basePath: baseDir };
            }

            return { success: false, error: `Package experience not found for id ${requestedId}` };
        } catch (err) {
            console.error('[Main Process] Error reading package experience:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.on("open-engine", async (event, levelData) => {
        await openEngine(levelData);
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

    // IPC handler for CMS base URL configuration
    ipcMain.handle("get-cms-base-url", async () => {
        return process.env.CMS_BASE_URL || "http://localhost:8000";
    });

    // IPC handler for CMS published packages filtered by student grade / code
    ipcMain.handle("get-cms-packages", async (event, studentGradeOrCode) => {
        try {
            const { getAllApprovedLessons, getLessonsForGrade, findUserByCode } = require("./src/main/db/sqlite");
            
            let grade = studentGradeOrCode;
            // If studentGradeOrCode is a student ID/code (e.g. 'ABU001'), look up their grade in SQLite
            if (studentGradeOrCode && typeof studentGradeOrCode === 'string') {
                const user = findUserByCode(studentGradeOrCode);
                if (user && user.grade) {
                    grade = user.grade;
                }
            }

            console.log(`[IPC get-cms-packages] Fetching packages for student grade: '${grade || 'ALL'}'`);

            let lessons = getLessonsForGrade(grade);
            if (!Array.isArray(lessons) || lessons.length === 0) {
                const { ensureDefaultDataPopulated } = require("./src/main/db/sqlite");
                ensureDefaultDataPopulated();
                lessons = getLessonsForGrade(grade);
            }

            if (Array.isArray(lessons) && lessons.length > 0) {
                // Arrange dynamically: Package 1 -> Level 1, Package 2 -> Level 2, Package 3 -> Level 3...
                return lessons.map((l, idx) => {
                    let payload = {};
                    try {
                        payload = typeof l.payload_json === 'string' ? JSON.parse(l.payload_json) : (l.payload_json || {});
                    } catch (e) {}

                    const levelNumber = idx + 1;
                    return {
                        packageId: l.lesson_id || `PKG-${levelNumber}`,
                        id: l.lesson_id || levelNumber,
                        packageName: l.title,
                        title: l.title,
                        description: payload.description || `Level ${levelNumber}: ${l.title}`,
                        status: l.status || 'APPROVED',
                        levelId: levelNumber,
                        levelIndex: levelNumber,
                        level: levelNumber,
                        grade: grade || payload.grade || payload.class || '',
                        payload: payload
                    };
                });
            }

            return [];
        } catch (err) {
            console.error("[IPC] Error fetching published CMS packages:", err);
            return [];
        }
    });


    // IPC handler for LMS package synchronization
    ipcMain.handle("sync-lms-packages", async (event, token) => {
        try {
            const { syncWithCms } = require("./src/main/services/syncService");
            const result = await syncWithCms();
            return result;
        } catch (err) {
            console.error("[IPC Sync] Error syncing LMS packages:", err);
            return { success: false, error: err.message };
        }
    });

    // IPC handler to save student session to userData/student_session.json
    ipcMain.handle("save-student-session", async (event, sessionData) => {
        try {
            const sessionPath = path.join(app.getPath("userData"), "student_session.json");
            if (!sessionData) {
                if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
                return { success: true };
            }
            fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), "utf-8");
            return { success: true, path: sessionPath };
        } catch (err) {
            console.error("[IPC] Error saving student session:", err);
            return { success: false, error: err.message };
        }
    });

    // IPC handler to load student session from userData/student_session.json
    ipcMain.handle("load-student-session", async () => {
        try {
            const sessionPath = path.join(app.getPath("userData"), "student_session.json");
            if (!fs.existsSync(sessionPath)) return null;
            const content = fs.readFileSync(sessionPath, "utf-8");
            return JSON.parse(content);
        } catch (err) {
            console.error("[IPC] Error loading student session:", err);
            return null;
        }
    });

    // IPC handler to list local downloaded experiences
    ipcMain.handle("list-local-experiences", async () => {
        try {
            const userDataDir = path.join(app.getPath("userData"), "experiences");
            const experiences = [];

            if (fs.existsSync(userDataDir)) {
                const entries = fs.readdirSync(userDataDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        experiences.push({ id: entry.name, path: path.join(userDataDir, entry.name) });
                    } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "manifest.json") {
                        experiences.push({ id: entry.name.replace(".json", ""), path: path.join(userDataDir, entry.name) });
                    }
                }
            }

            return experiences;
        } catch (err) {
            console.error("[IPC] Error listing local experiences:", err);
            return [];
        }
    });

    // IPC handler to download and extract .elab zip packages into userData/experiences/<scenarioId>/
    ipcMain.handle("download-and-extract-package", async (event, pkgData) => {
        const { scenarioId, downloadUrl, title } = pkgData || {};
        if (!scenarioId) return { success: false, message: "Missing scenarioId" };

        try {
            const experiencesBaseDir = path.join(app.getPath("userData"), "experiences");
            const targetDir = path.join(experiencesBaseDir, scenarioId);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            console.log(`[IPC Sync] Processing package ${scenarioId}...`);

            // Write experience manifest fallback JSON into target dir
            const manifestPath = path.join(targetDir, "experience.json");
            const manifestData = JSON.stringify({
                id: scenarioId,
                title: title || scenarioId,
                scenarioId,
                downloadedAt: new Date().toISOString()
            }, null, 2);
            fs.writeFileSync(manifestPath, manifestData);

            return {
                success: true,
                scenarioId,
                extractedPath: targetDir
            };
        } catch (err) {
            console.error(`[IPC Sync] Error downloading and extracting package ${scenarioId}:`, err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle("get-live-experience", async (event, levelId) => {
        try {
            console.log(`[IPC] get-live-experience requested for level/package ID: ${levelId}`);

            // 1. Primary: Retrieve approved lesson from SQLite (synced from CMS)
            try {
                const { getAllApprovedLessons } = require("./src/main/db/sqlite");
                const lessons = getAllApprovedLessons();

                if (Array.isArray(lessons) && lessons.length > 0) {
                    let targetLesson = null;

                    // If numeric levelId (e.g. 1, 2, 3...), map Level N -> Nth lesson from CMS (1-indexed)
                    const numericLevel = parseInt(levelId, 10);
                    if (!isNaN(numericLevel) && numericLevel >= 1 && numericLevel <= lessons.length) {
                        targetLesson = lessons[numericLevel - 1];
                        console.log(`[IPC] ✅ Mapped Level ${numericLevel} -> CMS Lesson #${numericLevel}: "${targetLesson.title}" (ID: ${targetLesson.lesson_id})`);
                    }

                    // If not found by index, check if levelId matches lesson_id or title
                    if (!targetLesson) {
                        targetLesson = lessons.find(l => String(l.lesson_id) === String(levelId) || String(l.id) === String(levelId));
                    }

                    if (targetLesson && targetLesson.payload_json) {
                        const parsed = typeof targetLesson.payload_json === 'string'
                            ? JSON.parse(targetLesson.payload_json)
                            : targetLesson.payload_json;
                        console.log(`[IPC] ✅ Loaded CMS package payload for Level ${levelId}: "${targetLesson.title}"`);
                        return parsed;
                    }
                }
            } catch (dbErr) {
                console.warn("[IPC] SQLite lesson query notice:", dbErr.message);
            }

            // 2. Secondary: Check extracted packages directory in userData
            const experiencesDir = path.join(app.getPath('userData'), 'experiences');
            const targetDir = path.join(experiencesDir, String(levelId || ''));
            const jsonPath = path.join(targetDir, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                console.log(`[IPC] Reading package experience.json from userData: ${jsonPath}`);
                return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            }

            return null;
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