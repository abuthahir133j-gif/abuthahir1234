const path = require('path');
const fs = require('fs'); // Explicit Node.js core filesystem module import
const { app, BrowserWindow, ipcMain, shell, session } = require('electron');

// Allow Electron's net module (Chromium) to connect to localhost without TLS/CORS issues
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('host-resolver-rules', 'MAP localhost 127.0.0.1');
// Prevent Windows Chromium GPUCache / disk_cache file-lock permission errors & silence noise
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('log-level', '3');

let mainWindow = null;
let engineWindow = null;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        backgroundColor: '#6366f1',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    // Guard: Prevent unauthorized external popups and open external links safely via OS default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.loadFile("login.html");

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
        }
    });
}

function resolvePackageMediaUrls(data, basePath) {
    if (!data || !basePath) return data;
    const fileMap = new Map();
    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else if (entry.isFile()) {
                    fileMap.set(entry.name.toLowerCase(), fullPath);
                }
            }
        } catch (e) {}
    }
    scanDir(basePath);

    function resolveValue(val) {
        if (Array.isArray(val)) {
            return val.map(resolveValue);
        }
        if (val && typeof val === 'object') {
            const res = {};
            for (const [k, v] of Object.entries(val)) {
                res[k] = resolveValue(v);
            }
            return res;
        }
        if (typeof val === 'string') {
            const filename = val.split(/[/\\]/).pop().toLowerCase();
            if (fileMap.has(filename)) {
                const localPath = fileMap.get(filename);
                return `file:///${localPath.replace(/\\/g, '/')}`;
            }
        }
        return val;
    }

    return resolveValue(data);
}

const SAMPLES_REGULAR_PACKAGES = [
    { id: "Hello!_This_Is_Me..._v1", title: "Hello! This Is Me" },
    { id: "Things_I_Like_v6", title: "Things I Like" },
    { id: "Meet_My_Friends_v8", title: "Meet My Friends" },
    { id: "This_Is_My_Family_v7", title: "This Is My Family" },
    { id: "Welcome_to_My_Classroom_v3", title: "Welcome to My Classroom" },
    { id: "Where_Is_My_Pencil__v2", title: "Where Is My Pencil?" },
    { id: "What's_in_My_School_Bag__v4", title: "What's in My School Bag?" },
    { id: "Can_You_Help_Me__v1", title: "Can You Help Me?" }
];

function getSamplePackageForLevel(levelId, isBoss = false) {
    const isBossLevel = Boolean(
        isBoss || 
        String(levelId).startsWith("boss-") || 
        levelId === 30 || 
        levelId === "30"
    );
    if (isBossLevel) {
        return {
            packageId: "Assessent_v5",
            packageTitle: "Assessment Challenge",
            isBoss: true
        };
    }
    const num = parseInt(levelId, 10);
    const validNum = (!isNaN(num) && num >= 1) ? num : 1;
    const pkg = SAMPLES_REGULAR_PACKAGES[(validNum - 1) % SAMPLES_REGULAR_PACKAGES.length];
    return {
        packageId: pkg.id,
        packageTitle: pkg.title,
        isBoss: false
    };
}

function findPackageExperience(requestedId) {
    const rawId = String(requestedId || '').trim();
    const isBoss = rawId.startsWith('boss-') || rawId.toLowerCase().includes('asses');

    const candidates = [
        rawId,
        isBoss ? 'Assessent_v5' : null,
        rawId.replace(/\.elab$/i, ''),
        rawId.replace(/\.zip$/i, ''),
        'Assessent_v5',
        'Hello!_This_Is_Me..._v1',
        'Things_I_Like_v6',
        'Meet_My_Friends_v8',
        'This_Is_My_Family_v7',
        'Welcome_to_My_Classroom_v3',
        'Where_Is_My_Pencil__v2',
        'What\'s_in_My_School_Bag__v4',
        'Can_You_Help_Me__v1'
    ].filter(Boolean);

    const baseSearchDirs = [
        path.join(__dirname, 'language-lab-engine', 'src', 'runtime', 'samples'),
        path.join(__dirname, 'language-lab-engine', 'src', 'packages'),
        path.join(__dirname, 'language-lab-engine', 'public', 'packages'),
        path.join(__dirname, 'assets', 'packages')
    ];

    for (const baseDir of baseSearchDirs) {
        for (const cand of candidates) {
            const jsonPath = path.join(baseDir, cand, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                try {
                    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    const basePath = path.join(baseDir, cand);
                    const data = resolvePackageMediaUrls(rawData, basePath);
                    return { data, basePath };
                } catch (e) {}
            }
        }
    }
    return null;
}

async function openEngine(packageData) {
    const originalLevelId = typeof packageData === 'object' ? (packageData?.levelId || packageData?.id || 1) : packageData;
    const isBossExplicit = typeof packageData === 'object' ? Boolean(packageData?.isBoss || String(originalLevelId).startsWith('boss-')) : String(originalLevelId).startsWith('boss-');

    const mapped = getSamplePackageForLevel(originalLevelId, isBossExplicit);
    let packageId = mapped.packageId;
    let packageTitle = mapped.packageTitle;
    let isBoss = mapped.isBoss;

    if (typeof packageData === 'object' && packageData?.packageId && !['1', 1, 'big_house_v4.elab', 'asses_v6'].includes(packageData.packageId)) {
        packageId = packageData.packageId;
    }
    if (typeof packageData === 'object' && packageData?.title && !['asses', 'big house'].includes(packageData.title)) {
        packageTitle = packageData.title;
    }
    if (isBoss || String(packageId).toLowerCase().includes('asses')) {
        packageId = 'Assessent_v5';
        packageTitle = 'Assessment Challenge';
        isBoss = true;
    }

    try {
        console.log('[Main Process] Attempting to open engine for level:', originalLevelId, 'Package:', packageId, 'Title:', packageTitle, 'isBoss:', isBoss);

        const indexPath = path.join(__dirname, 'language-lab-engine', 'dist', 'index.html');
        console.log('[Main Process] Engine Renderer Target:', indexPath);

        // Launch Engine Window
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
                    contextIsolation: true,
                    nodeIntegration: false,
                    webSecurity: false,
                    preload: path.join(__dirname, "preload.js")
                }
            });

            // Guard: Prevent unauthorized external popups from engine window
            engineWindow.webContents.setWindowOpenHandler(({ url }) => {
                if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
                    shell.openExternal(url);
                }
                return { action: 'deny' };
            });

            engineWindow.on('closed', () => {
                engineWindow = null;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                }
            });
        }

        // Load target into engine window
        const queryParams = `levelId=${encodeURIComponent(originalLevelId)}&title=${encodeURIComponent(packageTitle)}&packageId=${encodeURIComponent(packageId)}`;

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
    // Intercept root-relative requests (e.g., /arrrow.png, /quiz images/...) from engine and map to engine dist
    const engineDistDir = path.join(__dirname, 'language-lab-engine', 'dist');
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url;
        if (url && url.startsWith('file:///')) {
            const decoded = decodeURIComponent(url.replace('file:///', ''));
            const match = decoded.match(/^[a-zA-Z]:\/([^/].*)$/);
            if (match) {
                const subPath = match[1];
                const candidate = path.join(engineDistDir, subPath);
                if (fs.existsSync(candidate)) {
                    return callback({ redirectURL: `file:///${candidate.replace(/\\/g, '/')}` });
                }
            }
        }
        callback({});
    });

    // Defense-in-depth: Enforce Content Security Policy headers for all network/HTTP loads and Vite dev server
    const isDev = !app.isPackaged;
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const devConnect = isDev ? " http://localhost:5173 ws://localhost:5173" : "";
        const devScript = isDev ? " http://localhost:5173" : "";
        const devStyle = isDev ? " http://localhost:5173" : "";

        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://esm.sh${devScript}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${devStyle}; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: file: http: https:; media-src 'self' blob: data: file: http: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://esm.sh https://huggingface.co https://cdn-lfs.huggingface.co${devConnect}; worker-src 'self' blob:; object-src 'none'; base-uri 'self';`
                ]
            }
        });
    });

    // Initialize SQLite database and IPC handlers
    initDatabase();
    initIpcHandlers();

    createMainWindow();

    ipcMain.handle('open-engine', async (event, packageId) => {
        return await openEngine(packageId);
    });

    ipcMain.handle('get-package-experience', async (event, packageId) => {
        try {
            const requestedId = String(packageId || 'big_house_v4.elab');
            
            // Check packages directories
            const foundPkg = findPackageExperience(requestedId);
            if (foundPkg) {
                return { success: true, data: foundPkg.data, basePath: foundPkg.basePath };
            }

            // Check SQLite lessons table
            const { getDb } = require('./src/main/db/sqlite');
            const db = getDb();
            const row = db.prepare('SELECT payload_json FROM lessons WHERE lesson_id = ? OR title LIKE ? LIMIT 1').get(requestedId, `%${requestedId}%`);
            if (row && row.payload_json) {
                const data = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
                if (data.activities) {
                    return { success: true, data, basePath: path.join(__dirname, 'language-lab-engine', 'src', 'packages', requestedId) };
                }
            }

            // Check 5: userData/experiences
            const experiencesDir = path.join(app.getPath('userData'), 'experiences');
            let baseDir = path.join(experiencesDir, requestedId);
            if (!fs.existsSync(baseDir) && fs.existsSync(experiencesDir)) {
                const allDirs = fs.readdirSync(experiencesDir);
                const match = allDirs.find(d => d === requestedId || d.startsWith(requestedId));
                if (match) baseDir = path.join(experiencesDir, match);
            }

            const jsonPath = path.join(baseDir, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                const data = resolvePackageMediaUrls(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), baseDir);
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
            const requestedId = String(levelId || 'big_house_v4.elab');

            // 1. Check package directory
            const foundPkg = findPackageExperience(requestedId);
            if (foundPkg) {
                return foundPkg.data;
            }

            // 3. Retrieve approved lesson from SQLite (synced from CMS)
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

            // 4. Check extracted packages directory in userData
            const experiencesDir = path.join(app.getPath('userData'), 'experiences');
            const targetDir = path.join(experiencesDir, requestedId);
            const jsonPath = path.join(targetDir, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                console.log(`[IPC] Reading package experience.json from userData: ${jsonPath}`);
                return resolvePackageMediaUrls(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), targetDir);
            }

            return null;
        } catch (e) {
            console.error("[IPC] Error reading live experience JSON:", e);
            return null;
        }
    });

    // IPC handler to send support emails (defaults to abuthahir133j@gmail.com)
    ipcMain.handle("send-support-email", async (event, payload = {}) => {
        const defaultRecipient = "abuthahir133j@gmail.com";
        const recipient = String(payload.recipient || defaultRecipient).trim();
        const { rollNo, category, subject, message, ticketId } = payload;

        console.log(`[Support Email] Delivering support message from ${rollNo} to ${recipient}...`);

        let apiSuccess = false;
        let apiError = null;

        try {
            const axios = require('axios');
            const response = await axios.post(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
                studentRollNumber: rollNo || 'Student',
                ticketId: ticketId || '',
                issueCategory: category || 'General Support',
                _subject: `[One Tutor Support] ${subject || 'Inquiry'} (${rollNo || 'Student'})`,
                subject: subject || 'Support Message',
                message: message || '',
                recipient: recipient,
                _captcha: 'false',
                _template: 'table',
                submittedAt: new Date().toISOString()
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'https://formsubmit.co',
                    'Referer': 'https://formsubmit.co/'
                },
                timeout: 10000
            });

            if (response && response.status === 200) {
                apiSuccess = true;
                console.log(`[Support Email] ✅ Successfully dispatched email to ${recipient} via FormSubmit.`);
            }
        } catch (err) {
            apiError = err.message;
            console.warn(`[Support Email] Dispatch notice (${err.message}).`);
        }

        return {
            success: apiSuccess,
            recipient,
            error: apiError
        };
    });

    // IPC handler to open external URLs / mailto links safely
    ipcMain.handle("open-external", async (event, url) => {
        try {
            if (url && (url.startsWith("mailto:") || url.startsWith("http:") || url.startsWith("https:"))) {
                await shell.openExternal(url);
                return { success: true };
            }
        } catch (e) {
            console.error("[IPC] open-external failed:", e);
        }
        return { success: false };
    });

});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});