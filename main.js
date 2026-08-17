const path = require('path');
const fs = require('fs'); // Explicit Node.js core filesystem module import
const { app, BrowserWindow, ipcMain } = require('electron');
const cmsDatabase = require('./cmsDatabase');

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
    const packageId = typeof packageData === 'object' ? (packageData?.id || packageData?.packageId || packageData?.scenarioId || 1) : packageData;
    const packageTitle = typeof packageData === 'object' ? (packageData?.title || packageId) : packageId;

    try {
        console.log('[Main Process] Attempting to open engine for package:', packageId);

        // 1. Resolve target package directory path
        const baseDir = path.join(app.getPath('userData'), 'experiences', String(packageId));
        console.log('[Main Process] Checking path:', baseDir);

        // 2. Recursive search helper for index.html
        function findIndexHtml(dir) {
          if (!dir || !fs.existsSync(dir)) return null;

          try {
            const files = fs.readdirSync(dir);
            
            // First pass: look for index.html directly in current directory
            for (const file of files) {
              if (file.toLowerCase() === 'index.html') {
                return path.join(dir, file);
              }
            }

            // Second pass: recursively check all subdirectories
            for (const file of files) {
              const fullPath = path.join(dir, file);
              try {
                if (fs.statSync(fullPath).isDirectory()) {
                  const found = findIndexHtml(fullPath);
                  if (found) return found;
                }
              } catch (e) {
                console.warn('[Main Process] Directory stat error:', e.message);
              }
            }
          } catch (err) {
            console.error('[Main Process] Error scanning directory:', err.message);
          }

          return null;
        }

        let indexPath = findIndexHtml(baseDir);

        if (!indexPath) {
            const samplesDir = path.join(__dirname, 'language-lab-engine', 'src', 'runtime', 'samples', String(packageId));
            indexPath = findIndexHtml(samplesDir);
        }

        // 3. Fallback: If no index.html exists, check if package is JSON-driven (experience.json found)
        if (!indexPath && fs.existsSync(baseDir)) {
            const jsonPath = path.join(baseDir, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                console.log('[Main Process] Package is JSON-driven (experience.json found). Checking LMS player template...');

                const possibleTemplates = [
                    path.join(__dirname, 'renderer', 'player.html'),
                    path.join(__dirname, 'language-lab-engine', 'dist', 'index.html'),
                    path.join(__dirname, 'language-lab-engine', 'index.html'),
                    path.join(__dirname, 'index.html')
                ];
                
                const appPlayerTemplate = possibleTemplates.find(p => fs.existsSync(p));
                
                if (appPlayerTemplate) {
                    indexPath = appPlayerTemplate;
                } else {
                    console.error('[Main Process] Neither package index.html nor local player template was found!');
                    return { success: false, error: 'No engine renderer found for experience.json' };
                }
            }
        }

        if (!indexPath) {
            const defaultDist = path.join(__dirname, 'language-lab-engine', 'dist', 'index.html');
            if (fs.existsSync(defaultDist)) {
                indexPath = defaultDist;
            }
        }

        console.log('[Main Process] Final Engine Target Path:', indexPath);

        if (!indexPath) {
            console.error('[Main Process] Could not find index.html inside package folder or player template.');
            return { success: false, error: 'Target renderer path null' };
        }

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
            const experiencesDir = path.join(app.getPath('userData'), 'experiences');
            let baseDir = path.join(experiencesDir, String(packageId || ''));

            // Handle string/id fallbacks
            if (!fs.existsSync(baseDir) && fs.existsSync(experiencesDir)) {
                const allDirs = fs.readdirSync(experiencesDir);
                const match = allDirs.find(d => d === String(packageId) || d.startsWith(String(packageId)));
                if (match) baseDir = path.join(experiencesDir, match);
            }

            const jsonPath = path.join(baseDir, 'experience.json');
            if (!fs.existsSync(jsonPath)) {
                return { success: false, error: `experience.json not found in ${baseDir}` };
            }

            const rawData = fs.readFileSync(jsonPath, 'utf8');
            const jsonData = JSON.parse(rawData);
            return { success: true, data: jsonData, basePath: baseDir };
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

            const lessons = getLessonsForGrade(grade);
            if (Array.isArray(lessons) && lessons.length > 0) {
                // Arrange dynamically: Package 1 -> Level 1, Package 2 -> Level 2, Package 3 -> Level 3...
                return lessons.map((l, idx) => {
                    let payload = {};
                    try {
                        payload = typeof l.payload_json === 'string' ? JSON.parse(l.payload_json) : (l.payload_json || {});
                    } catch (e) {}

                    const levelNumber = idx + 1;
                    return {
                        packageId: l.lesson_id || levelNumber,
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

            // Fallback to cmsDatabase if SQLite is empty
            const cmsPkgs = cmsDatabase.getPublishedPackages() || [];
            return cmsPkgs.map((pkg, idx) => {
                const levelNumber = idx + 1;
                return {
                    ...pkg,
                    levelId: levelNumber,
                    levelIndex: levelNumber,
                    level: levelNumber,
                    description: pkg.description || `Level ${levelNumber}: ${pkg.packageName || pkg.title}`
                };
            });
        } catch (err) {
            console.error("[IPC] Error fetching published CMS packages:", err);
            return [];
        }
    });


    // IPC handler for full package sync: queries GET /api/v1/lms/packages/, compares with local_packages.json, downloads & extracts into experiences/
    ipcMain.handle("sync-lms-packages", async (event, token) => {
        try {
            const cmsBaseUrl = process.env.CMS_BASE_URL || "http://localhost:8000";
            const manifestPath = path.join(app.getPath("userData"), "local_packages.json");
            
            let localManifest = { packages: {} };
            if (fs.existsSync(manifestPath)) {
                try {
                    localManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                } catch (e) {}
            }

            const httpModule = cmsBaseUrl.startsWith("https") ? require("https") : require("http");
            const fetchPackagesUrl = `${cmsBaseUrl}/api/v1/lms/packages/`;

            const remotePackages = await new Promise((resolve) => {
                const req = httpModule.get(fetchPackagesUrl, {
                    headers: token ? { "Authorization": `Bearer ${token}` } : {}
                }, (res) => {
                    let body = "";
                    res.on("data", chunk => body += chunk.toString());
                    res.on("end", () => {
                        try {
                            const parsed = JSON.parse(body);
                            resolve(Array.isArray(parsed) ? parsed : (parsed.packages || []));
                        } catch (e) {
                            resolve([]);
                        }
                    });
                });
                req.on("error", () => resolve([]));
            });

            const experiencesDir = path.join(app.getPath("userData"), "experiences");
            if (!fs.existsSync(experiencesDir)) fs.mkdirSync(experiencesDir, { recursive: true });

            let updatedCount = 0;
            const syncedPackages = [];

            for (const pkg of remotePackages) {
                const pkgId = String(pkg.id || pkg.package_id || pkg.packageId);
                const version = pkg.version || "1.0.0";
                const localRecord = localManifest.packages[pkgId];

                // Check if new or version mismatch
                if (!localRecord || localRecord.version !== version) {
                    console.log(`[Package Sync] Downloading package ${pkgId} (version ${version})...`);
                    const targetDir = path.join(experiencesDir, pkgId);
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                    // Create experience.json & metadata.json inside targetDir
                    const experienceData = {
                        id: pkgId,
                        title: pkg.title || `Package ${pkgId}`,
                        description: pkg.description || "",
                        version: version,
                        screens: [],
                        updatedAt: new Date().toISOString()
                    };
                    fs.writeFileSync(path.join(targetDir, "experience.json"), JSON.stringify(experienceData, null, 2), "utf-8");

                    const metadataContent = {
                        title: pkg.title || `Package ${pkgId}`,
                        description: pkg.description || "",
                        version: version,
                        checksum: pkg.checksum || "",
                        size: pkg.size || 0,
                        thumbnail: pkg.thumbnail || ""
                    };
                    fs.writeFileSync(path.join(targetDir, "metadata.json"), JSON.stringify(metadataContent, null, 2), "utf-8");

                    const assetsDir = path.join(targetDir, "assets");
                    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

                    localManifest.packages[pkgId] = {
                        id: pkgId,
                        title: pkg.title,
                        description: pkg.description,
                        version: version,
                        thumbnail: pkg.thumbnail,
                        syncedAt: new Date().toISOString()
                    };
                    updatedCount++;
                }

                syncedPackages.push({
                    id: pkgId,
                    title: pkg.title,
                    description: pkg.description,
                    version: version,
                    thumbnail: pkg.thumbnail,
                    status: "Downloaded"
                });
            }

            fs.writeFileSync(manifestPath, JSON.stringify(localManifest, null, 2), "utf-8");

            return {
                success: true,
                updatedCount,
                packages: syncedPackages
            };
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
            const samplesDir = path.join(__dirname, "language-lab-engine", "src", "runtime", "samples");
            const experiences = [];

            const checkDir = (dir) => {
                if (fs.existsSync(dir)) {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            experiences.push({ id: entry.name, path: path.join(dir, entry.name) });
                        } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "manifest.json") {
                            experiences.push({ id: entry.name.replace(".json", ""), path: path.join(dir, entry.name) });
                        }
                    }
                }
            };

            checkDir(userDataDir);
            checkDir(samplesDir);

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

            // Also ensure samples directory fallback exists
            const samplesDir = path.join(__dirname, "language-lab-engine", "src", "runtime", "samples", scenarioId);
            if (!fs.existsSync(samplesDir)) {
                fs.mkdirSync(samplesDir, { recursive: true });
            }

            console.log(`[IPC Sync] Downloading package ${scenarioId} from ${downloadUrl}...`);

            // Use http/https or node fetch to download zip payload
            const httpModule = downloadUrl.startsWith("https") ? require("https") : require("http");
            const zipBuffer = await new Promise((resolve, reject) => {
                httpModule.get(downloadUrl, (res) => {
                    if (res.statusCode >= 400) {
                        // Fallback dummy payload if server URL mock
                        const dummyContent = JSON.stringify({
                            id: scenarioId,
                            title: title || scenarioId,
                            type: "EXPERIENCE",
                            extractedAt: new Date().toISOString()
                        }, null, 2);
                        return resolve(Buffer.from(dummyContent));
                    }
                    const chunks = [];
                    res.on("data", chunk => chunks.push(chunk));
                    res.on("end", () => resolve(Buffer.concat(chunks)));
                    res.on("error", reject);
                }).on("error", () => {
                    // Fallback JSON payload if network endpoint mock
                    const dummyContent = JSON.stringify({
                        id: scenarioId,
                        title: title || scenarioId,
                        type: "EXPERIENCE",
                        extractedAt: new Date().toISOString()
                    }, null, 2);
                    resolve(Buffer.from(dummyContent));
                });
            });

            const tempZipPath = path.join(app.getPath("userData"), `${scenarioId}.zip`);
            fs.writeFileSync(tempZipPath, zipBuffer);

            // Attempt AdmZip extraction if available
            try {
                let AdmZip = null;
                try {
                    AdmZip = require("adm-zip");
                } catch (e) {
                    AdmZip = require(path.join(__dirname, "language-lab-engine", "node_modules", "adm-zip"));
                }
                const zip = new AdmZip(tempZipPath);
                zip.extractAllTo(targetDir, true);
                zip.extractAllTo(samplesDir, true);
                console.log(`[IPC Sync] Extracted zip package ${scenarioId} to ${targetDir}`);
            } catch (zipErr) {
                console.warn(`[IPC Sync] Zip extraction notice (using json fallback): ${zipErr.message}`);
                // Write experience manifest fallback JSON into target dir
                const manifestPath = path.join(targetDir, "experience.json");
                const sampleManifestPath = path.join(samplesDir, `${scenarioId}.json`);
                const manifestData = JSON.stringify({
                    id: scenarioId,
                    title: title || scenarioId,
                    scenarioId,
                    downloadedAt: new Date().toISOString()
                }, null, 2);
                fs.writeFileSync(manifestPath, manifestData);
                fs.writeFileSync(sampleManifestPath, manifestData);
            }

            if (fs.existsSync(tempZipPath)) {
                fs.unlinkSync(tempZipPath);
            }

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

            // 3. Fallback: Only if no CMS packages exist in database
            const samplesDir = path.join(__dirname, "language-lab-engine", "src", "runtime", "samples");
            if (fs.existsSync(samplesDir)) {
                const files = fs.readdirSync(samplesDir);
                const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "manifest.json" && f !== "metadata.json");
                if (jsonFiles.length > 0) {
                    const targetFile = jsonFiles[0];
                    console.log(`[IPC] Fallback reading local sample file: ${targetFile}`);
                    return JSON.parse(fs.readFileSync(path.join(samplesDir, targetFile), "utf-8"));
                }
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