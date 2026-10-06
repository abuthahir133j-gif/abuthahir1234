process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_SECURITY_WARNINGS = 'false';

const path = require('path');
const fs = require('fs'); // Explicit Node.js core filesystem module import
const { pathToFileURL } = require('url');
const { app, BrowserWindow, ipcMain, shell, session, protocol, net } = require('electron');

// Register custom media scheme for secure local asset delivery
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'media-loader',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            corsEnabled: true,
            stream: true
        }
    }
]);

// Allow Electron's net module (Chromium) to connect to localhost without TLS/CORS issues
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('host-resolver-rules', 'MAP localhost 127.0.0.1');
// Prevent Windows Chromium GPUCache / disk_cache file-lock permission errors & silence noise
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('log-level', '3');
// Ensure Chromium automatically allows microphone stream capture without browser prompt UI
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-features', 'AudioServiceOutOfProcess');

let mainWindow = null;
let engineWindow = null;

const APP_ICON = process.platform === 'win32' && fs.existsSync(path.join(__dirname, "assets", "Icon", "labIcon.ico"))
    ? path.join(__dirname, "assets", "Icon", "labIcon.ico")
    : path.join(__dirname, "assets", "Icon", "labIcon.png");

if (process.platform === 'win32') {
    app.setAppUserModelId("com.english.adventure");
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "English Adventure",
        width: 1280,
        height: 720,
        show: false,
        backgroundColor: '#6366f1',
        icon: APP_ICON,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Shortcuts: F11 (Fullscreen), F12 / Ctrl+Shift+I (DevTools/Console), F5 / Ctrl+R (Reload), Ctrl+Shift+R (Hard Reload)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if (input.key === 'F11') {
                mainWindow.setFullScreen(!mainWindow.isFullScreen());
                event.preventDefault();
            } else if (input.key === 'F12' || (input.control && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'c'))) {
                mainWindow.webContents.toggleDevTools();
                event.preventDefault();
            } else if ((input.control && input.shift && input.key.toLowerCase() === 'r') || (input.control && input.key === 'F5')) {
                mainWindow.webContents.reloadIgnoringCache();
                event.preventDefault();
            } else if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
                mainWindow.webContents.reload();
                event.preventDefault();
            }
        }
    });

    // Automatically enter fullscreen when navigating to the LMS game map (index.html),
    // and exit fullscreen when returning to the login page (login.html)
    mainWindow.webContents.on('did-navigate', (event, url) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        if (url && (url.includes('index.html') || url.endsWith('/index.html'))) {
            mainWindow.setFullScreen(true);
        } else if (url && (url.includes('login.html') || url.endsWith('/login.html'))) {
            mainWindow.setFullScreen(false);
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

const BOSS_EXPERIENCE_PACKAGES = {
    1: { id: "Assessent_v5", title: "Assessment Challenge", zone: 1, season: "summer" },
    2: { id: "My School World", title: "My School World", zone: 2, season: "winter" },
    3: { id: "My_Everyday_Life_v1", title: "My Everyday Life", zone: 3, season: "spring" },
    4: { id: "PEOPLE,_PLACES_&_ACTIONS_v1", title: "People, Places & Actions", zone: 4, season: "marine" },
    5: { id: "STORIES,_MESSAGES_&_IDEAS_v1", title: "Stories, Messages & Ideas", zone: 5, season: "desert" },
    6: { id: "FINAL_ENGLISH_CHALLENGE_v1", title: "Final English Challenge", zone: 6, season: "lava" }
};

const SAMPLES_REGULAR_PACKAGES = [
    // Zone 1: Summer Season (Levels 1 - 5)
    { id: "Hello!_This_Is_Me..._v1", title: "Hello! This Is Me", zone: 1, season: "summer" },
    { id: "Things_I_Like_v6", title: "Things I Like", zone: 1, season: "summer" },
    { id: "Meet_My_Friends_v8", title: "Meet My Friends", zone: 1, season: "summer" },
    { id: "This_Is_My_Family_v7", title: "This Is My Family", zone: 1, season: "summer" },
    { id: "Welcome_to_My_Classroom_v3", title: "Welcome to My Classroom", zone: 1, season: "summer" },

    // Zone 2: Winter Season (Levels 6 - 10)
    { id: "Where_Is_My_Pencil__v2", title: "Where Is My Pencil?", zone: 2, season: "winter" },
    { id: "What's_in_My_School_Bag__v4", title: "What's in My School Bag?", zone: 2, season: "winter" },
    { id: "Can_You_Help_Me__v1", title: "Can You Help Me?", zone: 2, season: "winter" },
    { id: "A_Day_at_School_v1", title: "A Day at School", zone: 2, season: "winter" },
    { id: "Amazing_Animals_Around_Us_v1", title: "Amazing Animals Around Us", zone: 2, season: "winter" },

    // Zone 3: Spring Season (Levels 11 - 15)
    { id: "AROUND_MY_NEIGHBOURHOOD_v1", title: "Around My Neighbourhood", zone: 3, season: "spring" },
    { id: "How_Are_You_Today__v1", title: "How Are You Today?", zone: 3, season: "spring" },
    { id: "Let's_Play!_vv1", title: "Let's Play!", zone: 3, season: "spring" },
    { id: "LET’S_ACT_IT_OUT!_v1", title: "Let's Act It Out!", zone: 3, season: "spring" },
    { id: "Let’s_Go_Shopping!_v1", title: "Let's Go Shopping!", zone: 3, season: "spring" },

    // Zone 4: Marine Season (Levels 16 - 20)
    { id: "My_Day_Begins_v1", title: "My Day Begins", zone: 4, season: "marine" },
    { id: "My_Happy_Day_v1", title: "My Happy Day", zone: 4, season: "marine" },
    { id: "MY_LITTLE_STORY_v1", title: "My Little Story", zone: 4, season: "marine" },
    { id: "PICTURE_DETECTIVE_v1", title: "Picture Detective", zone: 4, season: "marine" },
    { id: "READ_THE_WORLD_AROUND_ME_v1", title: "Read The World Around Me", zone: 4, season: "marine" },

    // Zone 5: Desert Season (Levels 21 - 25)
    { id: "RHYTHM,_RHYME_&_ENGLISH_TIME!_v1", title: "Rhythm, Rhyme & English Time!", zone: 5, season: "desert" },
    { id: "THIS_IS_MY_ENGLISH!_v1", title: "This Is My English!", zone: 5, season: "desert" },
    { id: "Welcome_to_My_Home_v1", title: "Welcome to My Home", zone: 5, season: "desert" },
    { id: "What's_the_Weather_Like__v1", title: "What's the Weather Like?", zone: 5, season: "desert" },
    { id: "What_Are_They_Doing__v1", title: "What Are They Doing?", zone: 5, season: "desert" },

    // Zone 6: Lava Season (Levels 26 - 30)
    { id: "WHAT_HAPPENED_NEXT__v1", title: "What Happened Next?", zone: 6, season: "lava" },
    { id: "YESTERDAY_AND_TODAY_v1", title: "Yesterday and Today", zone: 6, season: "lava" },
    { id: "Yummy!_What_Shall_We_Eat__v1", title: "Yummy! What Shall We Eat?", zone: 6, season: "lava" },
    { id: "I'VE_GOT_A_MESSAGE!_v1", title: "I've Got A Message!", zone: 6, season: "lava" },
    { id: "I’VE_GOT_A_MESSAGE!_v1", title: "I've Got A Message!", zone: 6, season: "lava" }
];

function getSamplePackageForLevel(levelId, isBoss = false) {
    const isBossLevel = Boolean(
        isBoss || 
        String(levelId).startsWith("boss-")
    );
    if (isBossLevel) {
        let bossIdx = 1;
        if (typeof levelId === 'string' && levelId.startsWith('boss-')) {
            bossIdx = parseInt(levelId.replace('boss-', ''), 10) || 1;
        } else if (levelId === 30 || levelId === '30') {
            bossIdx = 6;
        }
        const bossPkg = BOSS_EXPERIENCE_PACKAGES[bossIdx] || BOSS_EXPERIENCE_PACKAGES[1];
        return {
            packageId: bossPkg.id,
            packageTitle: bossPkg.title,
            zone: bossPkg.zone,
            season: bossPkg.season,
            isBoss: true
        };
    }
    const num = parseInt(levelId, 10);
    const validNum = (!isNaN(num) && num >= 1 && num <= SAMPLES_REGULAR_PACKAGES.length) ? num : 1;
    const pkg = SAMPLES_REGULAR_PACKAGES[validNum - 1];
    return {
        packageId: pkg.id,
        packageTitle: pkg.title,
        zone: pkg.zone,
        season: pkg.season,
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
        'Hello!_This_Is_Me..._v233',
        'Things_I_Like_v6',
        'Meet_My_Friends_v8',
        'This_Is_My_Family_v7',
        'Welcome_to_My_Classroom_v3',
        'Where_Is_My_Pencil__v2',
        'What\'s_in_My_School_Bag__v4',
        'Can_You_Help_Me__v1'
    ].filter(Boolean);

    const baseSearchDirs = [
        path.join(__dirname, 'LMS Engine', 'src', 'runtime', 'samples', 'Lession'),
        path.join(__dirname, 'LMS Engine', 'src', 'runtime', 'samples', 'Assigment'),
        path.join(__dirname, 'LMS Engine', 'src', 'runtime', 'samples'),
        path.join(__dirname, 'LMS Engine', 'src', 'packages'),
        path.join(__dirname, 'LMS Engine', 'public', 'packages'),
        path.join(__dirname, 'assets', 'packages'),
        path.join(__dirname, 'assets')
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
    let zone = mapped.zone;
    let season = mapped.season;
    let isBoss = mapped.isBoss;

    if (typeof packageData === 'object' && packageData?.packageId && !['1', 1, 'big_house_v4.elab', 'asses_v6'].includes(packageData.packageId)) {
        packageId = packageData.packageId;
    }
    if (typeof packageData === 'object' && packageData?.title && !['asses', 'big house'].includes(packageData.title)) {
        packageTitle = packageData.title;
    }
    if (typeof packageData === 'object' && packageData?.zone) {
        zone = packageData.zone;
    }
    if (typeof packageData === 'object' && packageData?.season) {
        season = packageData.season;
    }

    try {
        console.log('[Main Process] Attempting to open engine for level:', originalLevelId, 'Package:', packageId, 'Title:', packageTitle, 'isBoss:', isBoss);

        const possibleIndexPaths = [
            path.join(__dirname, 'LMS Engine', 'dist', 'index.html'),
            path.join(__dirname, 'dist', 'index.html')
        ];
        let indexPath = possibleIndexPaths.find(p => fs.existsSync(p)) || possibleIndexPaths[0];
        console.log('[Main Process] Engine Renderer Target:', indexPath);

        // Launch Engine Window in Fullscreen Mode
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.setFullScreen(true);
            engineWindow.focus();
        } else {
            engineWindow = new BrowserWindow({
                width: 1280,
                height: 800,
                fullscreen: true,
                modal: false,
                title: `LMS Engine - ${packageTitle}`,
                icon: APP_ICON,
                autoHideMenuBar: true,
                webPreferences: {
                    contextIsolation: true,
                    nodeIntegration: false,
                    webSecurity: false,
                    allowRunningInsecureContent: true,
                    preload: path.join(__dirname, "preload.js")
                }
            });

            engineWindow.setMenu(null);
            engineWindow.setMenuBarVisibility(false);
            engineWindow.setFullScreen(true);

            engineWindow.once('ready-to-show', () => {
                if (engineWindow && !engineWindow.isDestroyed()) {
                    engineWindow.setFullScreen(true);
                    engineWindow.show();
                }
            });

            engineWindow.webContents.on('did-finish-load', () => {
                if (engineWindow && !engineWindow.isDestroyed()) {
                    engineWindow.setFullScreen(true);
                }
            });

            // Shortcuts: F11 (Fullscreen), F12 / Ctrl+Shift+I (DevTools/Console), F5 / Ctrl+R (Reload), Ctrl+Shift+R (Hard Reload)
            engineWindow.webContents.on('before-input-event', (event, input) => {
                if (!engineWindow || engineWindow.isDestroyed()) return;
                if (input.type === 'keyDown') {
                    if (input.key === 'F11') {
                        engineWindow.setFullScreen(!engineWindow.isFullScreen());
                        event.preventDefault();
                    } else if (input.key === 'F12' || (input.control && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'c'))) {
                        if (engineWindow && !engineWindow.isDestroyed() && engineWindow.webContents && !engineWindow.webContents.isDestroyed()) {
                            engineWindow.webContents.toggleDevTools();
                        }
                        event.preventDefault();
                    } else if ((input.control && input.shift && input.key.toLowerCase() === 'r') || (input.control && input.key === 'F5')) {
                        if (engineWindow && !engineWindow.isDestroyed() && engineWindow.webContents && !engineWindow.webContents.isDestroyed()) {
                            engineWindow.webContents.reloadIgnoringCache();
                        }
                        event.preventDefault();
                    } else if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
                        if (engineWindow && !engineWindow.isDestroyed() && engineWindow.webContents && !engineWindow.webContents.isDestroyed()) {
                            engineWindow.webContents.reload();
                        }
                        event.preventDefault();
                    }
                }
            });

            // Diagnostics: Log engine render errors and console messages
            engineWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
                if (errorCode === -21 || errorDescription === 'ERR_NETWORK_CHANGED' || errorCode === -3) {
                    return; // Ignore transient network route changes or aborted requests
                }
                console.error('[Engine Window] Load Failed:', errorCode, errorDescription, validatedURL);
            });
            engineWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
                if (
                    message.includes('CleanUnusedInitializersAndNodeArgs') ||
                    message.includes('Removing initializer') ||
                    message.includes('Electron Security Warning') ||
                    message.includes('Speech recognition status: network') ||
                    message.includes('ERR_NETWORK_CHANGED') ||
                    message.includes('Failed to load resource') ||
                    message.includes('DEBUG: experienceType is:')
                ) {
                    return;
                }
                console.log(`[Engine Console] ${message} (${sourceId}:${line})`);
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
                    mainWindow.setFullScreen(true);
                    mainWindow.focus();
                }
            });
        }

        // Load target into engine window
        const queryParams = `levelId=${encodeURIComponent(originalLevelId)}&title=${encodeURIComponent(packageTitle)}&packageId=${encodeURIComponent(packageId)}&zone=${encodeURIComponent(zone || '')}&season=${encodeURIComponent(season || '')}&isBoss=${encodeURIComponent(isBoss ? 'true' : 'false')}`;

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
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
        }
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
    // Automatically grant media/microphone permissions to renderers
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (['media', 'microphone', 'audio-capture'].includes(permission)) {
            return callback(true);
        }
        callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (['media', 'microphone', 'audio-capture'].includes(permission)) {
            return true;
        }
        return true;
    });

    // Protocol handler for secure local media loading without disabling webSecurity
    protocol.handle('media-loader', (request) => {
        try {
            const parsed = new URL(request.url);
            let decodedPath = decodeURIComponent(parsed.pathname);
            if (parsed.host && parsed.host !== 'local') {
                decodedPath = decodeURIComponent(parsed.host + parsed.pathname);
            }
            if (process.platform === 'win32' && decodedPath.startsWith('/')) {
                decodedPath = decodedPath.slice(1);
            }
            return net.fetch(pathToFileURL(decodedPath).toString());
        } catch (err) {
            console.error('[Protocol media-loader] Failed to load:', request.url, err);
            return new Response('Not Found', { status: 404 });
        }
    });

    // Intercept root-relative requests (e.g., /arrrow.png, /quiz images/...) from engine and map to engine dist
    const possibleDistDirs = [
        path.join(__dirname, 'LMS Engine', 'dist'),
        path.join(__dirname, 'dist')
    ];
    let engineDistDir = possibleDistDirs.find(d => fs.existsSync(d)) || possibleDistDirs[0];
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        const url = details.url;
        if (url && url.startsWith('file:///')) {
            const decoded = decodeURIComponent(url.replace('file:///', ''));
            const subPath = decoded.replace(/^[a-zA-Z]:\//, '').replace(/^\/+/, '');
            const candidate = path.join(engineDistDir, subPath);
            try {
                if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
                    return callback({ redirectURL: `file:///${candidate.replace(/\\/g, '/')}` });
                }
            } catch (e) {}
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
                    `default-src 'self' media-loader:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://esm.sh https://cdn.jsdelivr.net https://*.jsdelivr.net${devScript}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${devStyle}; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: media-loader: file: http: https:; media-src 'self' blob: data: media-loader: file: http: https:; connect-src 'self' media-loader: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://esm.sh https://huggingface.co https://*.huggingface.co https://hf.co https://*.hf.co https://cdn-lfs.huggingface.co https://cdn.jsdelivr.net https://*.jsdelivr.net data: blob:${devConnect}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';`
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
                    const candidatePkgs = [
                        path.join(__dirname, 'LMS Engine', 'src', 'packages', requestedId)
                    ];
                    const pkgBasePath = candidatePkgs.find(p => fs.existsSync(p)) || candidatePkgs[0];
                    return { success: true, data, basePath: pkgBasePath };
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
        try {
            const { saveStudentProgress } = require("./src/main/db/sqlite");
            const levelId = (typeof data === 'object' && data?.levelId) ? data.levelId : data;
            const stars = (typeof data === 'object' && data?.stars) ? data.stars : 3;
            const score = (typeof data === 'object' && data?.score) ? data.score : stars * 100;
            
            // Read active student from saved session if available
            let studentId = 'STUDENT';
            try {
                const sessionPath = path.join(app.getPath("userData"), "student_session.json");
                if (fs.existsSync(sessionPath)) {
                    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                    studentId = session.roll_number || session.student?.roll_number || session.student?.roll_no || 'STUDENT';
                }
            } catch (e) {}

            saveStudentProgress({
                student_id: studentId,
                level_id: String(levelId),
                package_id: String(levelId),
                stars: stars,
                score: score,
                status: 'COMPLETED'
            });

            // Trigger background progress sync
            const { pushPendingProgressToCms } = require("./src/main/services/syncService");
            setImmediate(() => {
                pushPendingProgressToCms(null, null, studentId).catch(() => {});
            });
        } catch (e) {
            console.warn('[main.js] Complete-level progress save notice:', e.message);
        }

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
                try {
                    const { clearCmsSession } = require("./src/main/services/cmsAuthService");
                    clearCmsSession();
                } catch (e) {}
                return { success: true };
            }

            const rollNo = sessionData.roll_number || sessionData.student?.roll_number || sessionData.student?.roll_no;
            if (rollNo) {
                try {
                    const { setActiveStudent } = require("./src/main/services/cmsAuthService");
                    setActiveStudent(rollNo, sessionData.student || sessionData);
                } catch (e) {}
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

    // IPC handlers for Window Fullscreen Controls (Engine and Dashboard)
    ipcMain.handle("set-fullscreen", (event, flag) => {
        const targetWin = (engineWindow && !engineWindow.isDestroyed()) ? engineWindow : mainWindow;
        if (targetWin && !targetWin.isDestroyed()) {
            targetWin.setFullScreen(Boolean(flag));
            return targetWin.isFullScreen();
        }
        return false;
    });

    ipcMain.handle("toggle-fullscreen", (event) => {
        const targetWin = (engineWindow && !engineWindow.isDestroyed()) ? engineWindow : mainWindow;
        if (targetWin && !targetWin.isDestroyed()) {
            const nextState = !targetWin.isFullScreen();
            targetWin.setFullScreen(nextState);
            return nextState;
        }
        return false;
    });

    ipcMain.handle("is-fullscreen", (event) => {
        const targetWin = (engineWindow && !engineWindow.isDestroyed()) ? engineWindow : mainWindow;
        if (targetWin && !targetWin.isDestroyed()) {
            return targetWin.isFullScreen();
        }
        return false;
    });

    ipcMain.on("close-engine", () => {
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
        }
    });

    ipcMain.handle("close-engine", () => {
        if (engineWindow && !engineWindow.isDestroyed()) {
            engineWindow.close();
            return true;
        }
        return false;
    });

    // IPC handlers to cleanly close all windows and exit Electron
    ipcMain.handle("exit-app", () => {
        try {
            if (engineWindow && !engineWindow.isDestroyed()) {
                engineWindow.close();
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.close();
            }
        } catch (e) {
            console.error("[Exit App] Error closing windows:", e);
        }
        app.quit();
        return true;
    });

    ipcMain.on("exit-app", () => {
        try {
            if (engineWindow && !engineWindow.isDestroyed()) {
                engineWindow.close();
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.close();
            }
        } catch (e) {
            console.error("[Exit App] Error closing windows:", e);
        }
        app.quit();
    });

});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});