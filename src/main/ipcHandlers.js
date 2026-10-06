const { ipcMain, net, app } = require('electron');
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
    findUserByCode,
    upsertUsers,
    upsertLessons,
    getSyncMeta,
    getAllApprovedLessons,
    getLessonsForStudent,
    getUsersCount,
    saveStudentProgress,
    getAllStudentProgress,
    getSyncSummary
} = require('./db/sqlite');
const { syncWithCms, setCmsHost, getCmsHost } = require('./services/syncService');
const cmsAuth = require('./services/cmsAuthService');

/**
 * Auto-load CMS host from data/config.json (set once via terminal).
 * Priority: config.json → CMS_HOST env var → localhost:8000
 */
function loadCmsHostFromConfig() {
    try {
        const candidatePaths = [
            path.join(process.cwd(), 'data', 'config.json'),
            path.join(__dirname, '..', '..', 'data', 'config.json')
        ];
        try {
            if (app && typeof app.getPath === 'function') {
                candidatePaths.unshift(path.join(app.getPath('userData'), 'data', 'config.json'));
            }
        } catch (e) {}

        for (const configPath of candidatePaths) {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.cms_host) {
                    setCmsHost(config.cms_host);
                    console.log(`[Config] CMS host loaded from config.json: ${config.cms_host}`);
                    return config.cms_host;
                }
            }
        }
    } catch (e) {
        console.warn('[Config] Could not read data/config.json:', e.message);
    }
    // Fallback to environment variable or default
    const envHost = process.env.CMS_HOST || 'http://localhost:8000';
    setCmsHost(envHost);
    console.log(`[Config] CMS host from env/default: ${envHost}`);
    return envHost;
}

// Load config immediately when module is required
const AUTO_CMS_HOST = loadCmsHostFromConfig();


/**
 * Fast CMS JSON fetcher with strict 2.5-second timeout per attempt.
 * Fallback chain: curl.exe (2.5s) → Electron net (2.5s) → Node http (2.5s)
 */
function fetchJsonFromCMS(path, hostOverride) {
    let baseUrl = 'http://localhost:8000';

    if (hostOverride) {
        try {
            const targetUrl = hostOverride.startsWith('http') ? hostOverride : `http://${hostOverride}`;
            const parsed = new URL(targetUrl);
            const port = Number(parsed.port) || 8000;
            baseUrl = `http://${parsed.hostname}:${port}`;
        } catch (e) {}
    }

    const fullUrl = `${baseUrl}${path}`;

    // ── Method 1: curl.exe (Windows built-in, 2.5s strict timeout) ──
    const tryCurl = () => {
        return new Promise((resolve, reject) => {
            try {
                const output = execSync(
                    `curl.exe -s --max-time 2.5 -H "Accept: application/json" "${fullUrl}"`,
                    { timeout: 3000, windowsHide: true }
                ).toString().trim();

                if (!output) return reject(new Error('curl returned empty response'));
                resolve(JSON.parse(output));
            } catch (err) {
                reject(new Error(`curl failed: ${err.message}`));
            }
        });
    };

    // ── Method 2: Electron net module (2.5s timeout) ──
    const tryElectronNet = () => {
        return new Promise((resolve, reject) => {
            if (!app.isReady()) return reject(new Error('App not ready'));
            const request = net.request({ method: 'GET', url: fullUrl });
            request.setHeader('Accept', 'application/json');
            
            const timer = setTimeout(() => {
                request.abort();
                reject(new Error('net timeout (2.5s)'));
            }, 2500);

            let body = '';
            request.on('response', (response) => {
                response.on('data', (chunk) => { body += chunk; });
                response.on('end', () => {
                    clearTimeout(timer);
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        try { resolve(JSON.parse(body)); }
                        catch (e) { reject(new Error('Invalid JSON')); }
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}`));
                    }
                });
            });
            request.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
            request.end();
        });
    };

    // ── Method 3: Node http.request (2.5s timeout) ──
    const tryNodeHttp = (hostname) => {
        const port = Number(new URL(baseUrl).port) || 8000;
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname, port, path, method: 'GET',
                headers: { 'Accept': 'application/json', 'Host': `${hostname}:${port}` },
                timeout: 2500
            }, (res) => {
                let data = '';
                res.on('data', (c) => { data += c; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(data)); }
                        catch (e) { reject(new Error('Invalid JSON')); }
                    } else { reject(new Error(`HTTP ${res.statusCode}`)); }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('http timeout (2.5s)')); });
            req.end();
        });
    };

    // Fast Race/Chain: curl first (2.5s max), fallback to net (2.5s max)
    return tryCurl()
        .catch(() => tryElectronNet())
        .catch(() => tryNodeHttp(new URL(baseUrl).hostname));
}



/**
 * Register IPC handlers for Electron main process
 */
function initIpcHandlers() {
    // -----------------------------------------------------------------
    // IPC Handler: start-initial-sync
    // -----------------------------------------------------------------
    ipcMain.handle('start-initial-sync', async (event, cmsHost) => {
        try {
            console.log('[IPC] Received start-initial-sync request with CMS Host:', cmsHost);
            const syncResult = await syncWithCms(cmsHost);
            return syncResult;
        } catch (err) {
            console.error('[IPC] Error in start-initial-sync handler:', err);
            return {
                success: false,
                error: err.message || 'Sync operation failed'
            };
        }
    });

    // -----------------------------------------------------------------
    // IPC Handler: login-user (Direct Call to Real Django CMS Sync API via pure http)
    // -----------------------------------------------------------------
    ipcMain.handle('login-user', async (event, payload = {}) => {
        try {
            const rawCode = typeof payload === 'string'
                ? payload
                : (payload.code || payload.lms_code || payload.lmsCode || payload.username || payload.roll_number || '');

            const cleanCode = String(rawCode).trim().toUpperCase();
            const rawCmsHost = (typeof payload === 'object' && payload.cmsHost) ? payload.cmsHost : getCmsHost();

            if (!cleanCode) {
                return {
                    success: false,
                    error: 'Invalid LMS Code. Please check with your teacher.'
                };
            }

            console.log(`[LMS] Fast authenticating code: ${cleanCode}`);

            // 1. Instant local SQLite lookup or registration (< 10ms)
            let student = findUserByCode(cleanCode);

            if (!student) {
                const originalName = (cleanCode === 'A' || cleanCode === 'ABU' || cleanCode === 'ABU001')
                    ? 'Abuthahir'
                    : cleanCode.replace(/^STU-?/i, '');

                const newStudent = {
                    id: cleanCode,
                    username: cleanCode,
                    lms_code: cleanCode,
                    name: originalName,
                    grade: 'Class 7',
                    section: 'A',
                    role: 'student',
                    roll_no: cleanCode
                };
                upsertUsers([newStudent]);
                student = findUserByCode(cleanCode) || newStudent;
            }

            const studentRollNo = student.roll_no || student.lms_code || student.username || cleanCode;
            const studentOriginalName = (student.name && !/^Student\s+[A-Za-z0-9_-]+$/i.test(student.name))
                ? student.name
                : ((cleanCode === 'A' || cleanCode === 'ABU001' || student.username === 'A' || student.username === 'ABU001' || student.lms_code === 'A') ? 'Abuthahir' : (student.name || cleanCode));

            // Set active student session in central auth service
            cmsAuth.setActiveStudent(studentRollNo, {
                id: student.id,
                name: studentOriginalName,
                roll_number: studentRollNo,
                grade: student.grade
            });

            // 2. Perform CMS online login & package sync asynchronously in the background (non-blocking)
            setImmediate(async () => {
                try {
                    await cmsAuth.loginStudentWithCms(studentRollNo, rawCmsHost);
                } catch (authErr) {
                    console.warn(`[LMS Auth] Online CMS auth notice: ${authErr.message}`);
                }
                syncWithCms(rawCmsHost, studentRollNo).catch(syncErr => {
                    console.warn(`[LMS] Background CMS sync notice: ${syncErr.message}`);
                });
            });

            console.log(`[LMS] ⚡ Instant Login SUCCESS: ${studentOriginalName} | roll_no: ${studentRollNo} | Total DB users: ${getUsersCount()}`);
            return {
                success: true,
                user: {
                    id: student.id,
                    lms_code: student.lms_code || student.username,
                    code: studentRollNo,
                    roll_number: studentRollNo,
                    name: studentOriginalName,
                    roll_no: studentRollNo,
                    grade: student.grade || 'Class 7',
                    section: student.section || 'A',
                    role: student.role || 'student'
                }
            };
        } catch (err) {
            console.error('[LMS Auth] Unexpected error in login-user handler:', err);
            return {
                success: false,
                error: 'Authentication failed. Please try again.'
            };
        }
    });



    // -----------------------------------------------------------------
    // IPC Handler: get-sync-status
    // -----------------------------------------------------------------
    ipcMain.handle('get-sync-status', async () => {
        try {
            const summary = getSyncSummary();
            return {
                success: true,
                lastSyncedAt: summary.lastSyncedAt || getSyncMeta('last_synced_at'),
                cmsHost: summary.cmsHost || getSyncMeta('cms_host') || getCmsHost(),
                userCount: summary.totalUsers,
                totalLessons: summary.totalLessons,
                pendingProgressCount: summary.pendingProgressCount,
                totalProgressCount: summary.totalProgressCount
            };
        } catch (err) {
            return {
                success: false,
                lastSyncedAt: getSyncMeta('last_synced_at'),
                cmsHost: getSyncMeta('cms_host') || getCmsHost(),
                userCount: getUsersCount()
            };
        }
    });

    // -----------------------------------------------------------------
    // IPC Handler: save-student-progress
    // -----------------------------------------------------------------
    ipcMain.handle('save-student-progress', async (event, progressData = {}) => {
        try {
            const saved = saveStudentProgress(progressData);
            const studentId = progressData.student_id || progressData.studentId || progressData.roll_no || progressData.rollNumber;
            // Non-blocking trigger to upload pending progress in background
            setImmediate(() => {
                const { pushPendingProgressToCms } = require('./services/syncService');
                pushPendingProgressToCms(null, null, studentId).catch(err => {
                    console.warn(`[IPC Progress] Background upload notice: ${err.message}`);
                });
            });
            return { success: true, progress: saved };
        } catch (err) {
            console.error('[IPC save-student-progress] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // -----------------------------------------------------------------
    // IPC Handler: get-student-progress
    // -----------------------------------------------------------------
    ipcMain.handle('get-student-progress', async (event, studentId) => {
        try {
            const list = getAllStudentProgress(studentId);
            return { success: true, progress: list };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // -----------------------------------------------------------------
    // IPC Handler: get-lessons
    // -----------------------------------------------------------------
    ipcMain.handle('get-lessons', async (event, grade) => {
        try {
            const lessons = grade ? getLessonsForStudent(grade) : getAllApprovedLessons();
            return {
                success: true,
                lessons: lessons
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    });

    // -----------------------------------------------------------------
    // IPC Handler: push-cms-data
    // Called by the renderer BEFORE login when it fetched CMS data via
    // browser fetch (which always works). Stores users + lessons in SQLite.
    // This completely bypasses Node http loopback connection issues.
    // -----------------------------------------------------------------
    ipcMain.handle('push-cms-data', async (event, payload) => {
        try {
            let usersStored = 0;
            let lessonsStored = 0;

            // Handle users from bootstrap response
            if (payload && payload.users && Array.isArray(payload.users)) {
                upsertUsers(payload.users);
                usersStored = payload.users.length;
                console.log(`[IPC push-cms-data] Stored ${usersStored} users from renderer fetch.`);
            }

            // Handle flat array (some API responses are just an array of users)
            if (payload && Array.isArray(payload)) {
                upsertUsers(payload);
                usersStored = payload.length;
                console.log(`[IPC push-cms-data] Stored ${usersStored} users (array) from renderer fetch.`);
            }

            // Handle lessons
            let lessonsList = [];
            if (payload && payload.lessons) lessonsList = payload.lessons;
            else if (payload && payload.packages) lessonsList = payload.packages;

            if (Array.isArray(lessonsList) && lessonsList.length > 0) {
                const approved = lessonsList.filter(l => String(l.status || '').toUpperCase() === 'APPROVED');
                if (approved.length > 0) {
                    upsertLessons(approved);
                    lessonsStored = approved.length;
                    console.log(`[IPC push-cms-data] Stored ${lessonsStored} approved lessons from renderer fetch.`);
                }
            }

            return { success: true, usersStored, lessonsStored };
        } catch (err) {
            console.error('[IPC push-cms-data] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    console.log('[IPC Handlers] Registered direct Django CMS sync & login handlers.');

}

module.exports = {
    initIpcHandlers,
    fetchJsonFromCMS
};
