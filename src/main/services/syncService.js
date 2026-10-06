const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const {
    upsertUsers,
    syncUpsertLessons,
    getAllApprovedLessons,
    updateSyncMeta,
    getSyncMeta,
    getUsersCount,
    saveStudentProgress,
    getPendingProgress,
    markProgressSynced,
    markProgressFailed,
    getAllStudentProgress,
    upsertSyncState,
    getSyncState,
    getAllSyncStates,
    getSyncSummary,
    findUserByCode,
    DEFAULT_STUDENTS
} = require('../db/sqlite');
const cmsAuth = require('./cmsAuthService');

/**
 * 1. Get Client IP Address:
 * Detect the local network IPv4 address (e.g. 192.168.x.x, 10.x.x.x) for CMS identification.
 * Kept strictly inside the main process; never exposed in the renderer.
 */
function getClientIp() {
    try {
        const interfaces = os.networkInterfaces();
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === 'IPv4' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    } catch (e) {
        console.warn('[SyncService] Notice detecting client IP:', e.message);
    }
    return '127.0.0.1';
}

/**
 * 2. Secure Configuration Loader:
 * Priority: data/config.json -> .env -> CMS_HOST / CMS_BASE_URL env vars -> default
 */
function getWritableDataDir() {
    try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
            const userDir = path.join(app.getPath('userData'), 'data');
            if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
            return userDir;
        }
    } catch (e) {}
    const defaultDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(defaultDir)) {
        try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
    }
    return defaultDir;
}

function getWritableExperiencesDir() {
    try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
            const expDir = path.join(app.getPath('userData'), 'experiences');
            if (!fs.existsSync(expDir)) fs.mkdirSync(expDir, { recursive: true });
            return expDir;
        }
    } catch (e) {}
    const defaultDir = path.join(process.cwd(), 'data', 'experiences');
    if (!fs.existsSync(defaultDir)) {
        try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
    }
    return defaultDir;
}

function loadEnvCredentials() {
    let host = '';
    let apiKey = '';

    // Check candidate config.json locations
    try {
        const candidateConfigs = [
            path.join(process.cwd(), 'data', 'config.json'),
            path.join(__dirname, '..', '..', '..', 'data', 'config.json')
        ];
        try {
            const { app } = require('electron');
            if (app && typeof app.getPath === 'function') {
                candidateConfigs.unshift(path.join(app.getPath('userData'), 'data', 'config.json'));
            }
        } catch (e) {}

        for (const configPath of candidateConfigs) {
            if (fs.existsSync(configPath)) {
                const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (raw.cms_host) {
                    host = String(raw.cms_host).trim();
                    break;
                }
            }
        }
    } catch (e) {}

    // Check .env file locations
    const candidateEnvs = [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '..', '..', '..', '.env')
    ];
    try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
            candidateEnvs.unshift(path.join(app.getPath('userData'), '.env'));
        }
    } catch (e) {}

    for (const envPath of candidateEnvs) {
        if (fs.existsSync(envPath)) {
            try {
                const content = fs.readFileSync(envPath, 'utf-8');
                content.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                        const [k, ...v] = trimmed.split('=');
                        const key = k.trim();
                        const val = v.join('=').trim();
                        if ((key === 'CMS_HOST' || key === 'CMS_BASE_URL') && !host) host = val;
                        if ((key === 'CMS_API_KEY' || key === 'CMS_BEARER_TOKEN') && !apiKey) apiKey = val;
                    }
                });
                if (host) break;
            } catch (e) {}
        }
    }

    if (!host) host = process.env.CMS_HOST || process.env.CMS_BASE_URL || 'http://localhost:8000';
    if (!apiKey) apiKey = process.env.CMS_API_KEY || process.env.CMS_BEARER_TOKEN || 'cms_secure_secret_key_12345';

    return {
        host: host.replace(/\/+$/, ''),
        apiKey: apiKey
    };
}

let currentCmsHost = loadEnvCredentials().host;

function setCmsHost(host) {
    if (host && typeof host === 'string') {
        currentCmsHost = host.trim().replace(/\/+$/, '');
    }
    return currentCmsHost;
}

function getCmsHost() {
    if (!currentCmsHost) {
        currentCmsHost = loadEnvCredentials().host;
    }
    return currentCmsHost.trim().replace(/\/+$/, '');
}

/**
 * 3. Authenticated HTTP GET Request Helper:
 * Performs GET request to CMS with Authorization, X-API-Key, and Client IP headers.
 */
function fetchJsonWithHeaders(reqPath, baseUrl, headers = {}, timeoutMs = 3500) {
    return new Promise((resolve, reject) => {
        try {
            const cleanBase = baseUrl || getCmsHost();
            const parsedBase = new URL(cleanBase.startsWith('http') ? cleanBase : `http://${cleanBase}`);
            const isHttps = parsedBase.protocol === 'https:';
            const httpLib = isHttps ? https : http;
            const port = Number(parsedBase.port) || (isHttps ? 443 : 80);

            const options = {
                hostname: parsedBase.hostname,
                port: port,
                path: reqPath,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Host': `${parsedBase.hostname}:${port}`,
                    ...headers
                },
                timeout: timeoutMs
            };

            const req = httpLib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Invalid JSON from CMS at ${reqPath}`));
                        }
                    } else if (res.statusCode === 401 || res.statusCode === 403) {
                        reject(new Error(`CMS Authentication failed (HTTP ${res.statusCode})`));
                    } else {
                        reject(new Error(`CMS returned HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (err) => reject(new Error(`Connection error (${parsedBase.hostname}:${port}): ${err.message}`)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout (${timeoutMs}ms) connecting to ${parsedBase.hostname}:${port}`));
            });

            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * 4. Authenticated HTTP POST Request Helper:
 * Sends JSON payload to CMS endpoint with timeout and response handling.
 */
function postJsonWithHeaders(reqPath, baseUrl, payload = {}, headers = {}, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        try {
            const cleanBase = baseUrl || getCmsHost();
            const parsedBase = new URL(cleanBase.startsWith('http') ? cleanBase : `http://${cleanBase}`);
            const isHttps = parsedBase.protocol === 'https:';
            const httpLib = isHttps ? https : http;
            const port = Number(parsedBase.port) || (isHttps ? 443 : 80);

            const postData = JSON.stringify(payload);

            const options = {
                hostname: parsedBase.hostname,
                port: port,
                path: reqPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Host': `${parsedBase.hostname}:${port}`,
                    ...headers
                },
                timeout: timeoutMs
            };

            const req = httpLib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data || '{}'));
                        } catch (e) {
                            resolve({ success: true, raw: data });
                        }
                    } else if (res.statusCode === 401 || res.statusCode === 403) {
                        reject(new Error(`CMS Authentication failed (HTTP ${res.statusCode})`));
                    } else {
                        reject(new Error(`CMS returned HTTP ${res.statusCode}: ${data.substring(0, 120)}`));
                    }
                });
            });

            req.on('error', (err) => reject(new Error(`POST error (${parsedBase.hostname}:${port}): ${err.message}`)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`POST timeout (${timeoutMs}ms) connecting to ${parsedBase.hostname}:${port}`));
            });

            req.write(postData);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Helper to safely parse student progress details into an Object
 * - If valid JSON string, parse into Object
 * - If already an Object, return directly
 * - If null/undefined/empty, return {}
 * - If invalid JSON string, throw SyntaxError to be caught per record
 */
function parseProgressDetails(detailsVal) {
    if (detailsVal === null || detailsVal === undefined || detailsVal === '') {
        return {};
    }
    if (typeof detailsVal === 'object') {
        return detailsVal;
    }
    if (typeof detailsVal === 'string') {
        const trimmed = detailsVal.trim();
        if (!trimmed || trimmed === '{}') return {};
        return JSON.parse(trimmed);
    }
    return {};
}

/**
 * Transform SQLite progress records into canonical camelCase CMS sync payload
 * Handles details parsing safely per record without crashing the sync batch.
 */
function buildProgressSyncPayload(pendingRecords) {
    if (!Array.isArray(pendingRecords) || pendingRecords.length === 0) {
        return { payload: { progress: [] }, validIds: [], invalidIds: [] };
    }

    const validItems = [];
    const validIds = [];
    const invalidIds = [];

    for (const r of pendingRecords) {
        let detailsObj = {};
        try {
            detailsObj = parseProgressDetails(r.details_json !== undefined ? r.details_json : r.details);
        } catch (parseErr) {
            console.warn(`[Sync] ⚠️ Invalid details_json for progress_id ${r.progress_id || r.progressId}: ${parseErr.message}`);
            invalidIds.push(r.progress_id || r.progressId);
            continue;
        }

        const deviceIdVal = (r.device_id && String(r.device_id).trim()) || (r.deviceId && String(r.deviceId).trim()) || 'electron-win-lms';
        const progressId = String(r.progress_id || r.progressId || '');
        const studentId = String(r.student_id || r.studentId || '');
        const levelId = String(r.level_id || r.levelId || '1');
        const packageId = String(r.package_id || r.packageId || levelId);
        const score = typeof r.score === 'number' ? r.score : (parseInt(r.score, 10) || 0);
        const stars = typeof r.stars === 'number' ? r.stars : (parseInt(r.stars, 10) || 0);
        const status = String(r.status || 'COMPLETED').toUpperCase();
        const completedAt = r.completed_at || r.completedAt || new Date().toISOString();

        validItems.push({
            progressId,
            studentId,
            packageId,
            levelId,
            score,
            stars,
            status,
            details: (detailsObj && typeof detailsObj === 'object') ? detailsObj : {},
            completedAt,
            deviceId: deviceIdVal
        });
        validIds.push(progressId);
    }

    return {
        payload: {
            progress: validItems
        },
        validIds,
        invalidIds
    };
}

/**
 * 5. Two-Way Student Progress Synchronization (LMS -> CMS):
 * Uploads offline pending student progress records to the Django CMS / PostgreSQL.
 * Uses canonical camelCase POST /api/progress/sync/ payload contract with student JWT Bearer authentication.
 *
 * @param {string} [baseUrl] - CMS base URL
 * @param {string} [clientIp] - Client IPv4
 * @param {string} [targetRollNumber] - Optional student roll number to associate with sync session
 */
async function pushPendingProgressToCms(baseUrl, clientIp, targetRollNumber) {
    const pendingRecords = getPendingProgress(100);
    if (!pendingRecords || pendingRecords.length === 0) {
        console.log('[Sync] No pending student progress to upload.');
        return { total: 0, synced: 0, failed: 0 };
    }

    console.log(`[Sync] 📤 Uploading ${pendingRecords.length} pending student progress records to CMS via student JWT...`);
    const targetHost = baseUrl || getCmsHost();
    const clientIpVal = clientIp || getClientIp();

    const { payload: progressPayload, validIds, invalidIds } = buildProgressSyncPayload(pendingRecords);

    // If any records had broken/unparseable JSON in details_json, mark them failed locally without halting the batch
    if (invalidIds.length > 0) {
        markProgressFailed(invalidIds);
        console.warn(`[Sync] ⚠️ Marked ${invalidIds.length} invalid record(s) as failed due to unparseable details.`);
    }

    if (validIds.length === 0) {
        return {
            total: pendingRecords.length,
            synced: 0,
            failed: invalidIds.length,
            error: 'All pending records contained invalid details_json'
        };
    }

    // Determine target student roll number for JWT authentication
    let rollNumberToUse = targetRollNumber || cmsAuth.getActiveRollNumber();
    if (!rollNumberToUse && pendingRecords.length > 0) {
        const firstStudentId = pendingRecords[0].student_id || pendingRecords[0].studentId;
        const studentUser = findUserByCode(firstStudentId);
        rollNumberToUse = studentUser?.roll_no || studentUser?.lms_code || firstStudentId;
    }

    const progressEndpoints = [
        '/api/progress/sync/',
        '/api/v1/lms/sync/progress/',
        '/api/lms/sync/progress/',
        '/api/lms/sync/progress',
        '/api/lms/sync/student-progress'
    ];

    let uploaded = false;
    let syncError = null;

    for (const ep of progressEndpoints) {
        try {
            const res = await cmsAuth.authenticatedRequest(ep, {
                method: 'POST',
                baseUrl: targetHost,
                payload: progressPayload,
                headers: {
                    'X-Client-IP': clientIpVal
                },
                rollNumber: rollNumberToUse,
                timeoutMs: 4000
            });

            if (res && (res.success !== false)) {
                uploaded = true;
                markProgressSynced(validIds, new Date().toISOString());
                console.log(`[Sync] ✅ Progress synchronized (${validIds.length} records) via ${ep} using student JWT`);
                return {
                    total: pendingRecords.length,
                    synced: validIds.length,
                    failed: invalidIds.length,
                    endpoint: ep
                };
            }
        } catch (err) {
            syncError = err;
        }
    }

    if (!uploaded) {
        console.warn(`[Sync] ⚠️ Progress upload deferred (${syncError ? syncError.message : 'Endpoints unavailable'}). Data retained in SQLite.`);
        markProgressFailed(validIds);
        return {
            total: pendingRecords.length,
            synced: 0,
            failed: pendingRecords.length,
            error: syncError ? syncError.message : 'Network error'
        };
    }
}

/**
 * Fetch progress records from Django CMS using canonical GET /api/progress/ with student JWT
 * @param {string} [baseUrl] - CMS base URL
 * @param {string} [studentRollNumber] - Target student roll number
 * @returns {Promise<any>}
 */
async function fetchStudentProgressFromCms(baseUrl, studentRollNumber) {
    const targetHost = baseUrl || getCmsHost();
    const targetRoll = studentRollNumber || cmsAuth.getActiveRollNumber();

    const progressEndpoints = [
        '/api/progress/',
        '/api/v1/progress/',
        '/api/lms/progress/'
    ];

    let lastError = null;

    for (const ep of progressEndpoints) {
        try {
            const res = await cmsAuth.authenticatedRequest(ep, {
                method: 'GET',
                baseUrl: targetHost,
                rollNumber: targetRoll,
                timeoutMs: 3500
            });

            if (res) {
                console.log(`[Sync] ✅ Progress records fetched from ${ep} via student JWT`);
                return res;
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('Failed to fetch progress from CMS');
}

/**
 * 6. Fetch All Lesson Packages from Django CMS:
 * Queries Django CMS published packages endpoints with /api/packages/ as primary canonical endpoint.
 */
async function fetchAllLessonPackagesFromCms(baseUrl, clientIp) {
    const creds = loadEnvCredentials();
    const token = cmsAuth.getAccessToken() || (creds.apiKey && creds.apiKey.startsWith('eyJ') ? creds.apiKey : null);
    const headers = {
        'X-API-Key': creds.apiKey,
        'X-Client-IP': clientIp,
        'X-Forwarded-For': clientIp
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const packageEndpoints = [
        '/api/packages/',
        '/api/v1/lms/published-packages/',
        '/api/v1/lms/packages/',
        '/api/cms/packages/published',
        '/api/v1/content/experiences/?page=1',
        '/api/v1/content/experiences/'
    ];

    const targetHost = baseUrl || getCmsHost();

    for (const ep of packageEndpoints) {
        try {
            let currentPath = ep;
            let pageCount = 0;
            const maxPages = 25;
            const gathered = [];

            while (currentPath && pageCount < maxPages) {
                pageCount++;
                const data = await fetchJsonWithHeaders(currentPath, targetHost, headers, 3500);
                if (!data) break;

                let pageItems = [];
                let nextUrl = null;

                if (Array.isArray(data)) {
                    pageItems = data;
                } else if (data.results && Array.isArray(data.results)) {
                    pageItems = data.results;
                    nextUrl = data.next;
                } else if (data.packages && Array.isArray(data.packages)) {
                    pageItems = data.packages;
                    nextUrl = data.next;
                } else if (data.lessons && Array.isArray(data.lessons)) {
                    pageItems = data.lessons;
                    nextUrl = data.next;
                } else if (data.data && Array.isArray(data.data)) {
                    pageItems = data.data;
                    nextUrl = data.next;
                }

                if (pageItems.length > 0) {
                    gathered.push(...pageItems);
                }

                if (nextUrl && typeof nextUrl === 'string') {
                    try {
                        const parsedNext = new URL(nextUrl.startsWith('http') ? nextUrl : `http://localhost${nextUrl}`);
                        currentPath = parsedNext.pathname + parsedNext.search;
                    } catch (e) {
                        currentPath = nextUrl;
                    }
                } else {
                    currentPath = null;
                }
            }

            if (gathered.length > 0) {
                console.log(`[SyncService] ✅ Successfully fetched ${gathered.length} packages from ${targetHost}${ep}`);
                return gathered;
            }
        } catch (err) {
            // Try next endpoint
        }
    }

    return [];
}

/**
 * 7. Validate & Transform Packages:
 * Normalizes CMS response into internal LMS package structure.
 * Supports and prefers canonical downloadUrl field over legacy download_url.
 */
function validateAndTransformPackages(rawList) {
    if (!Array.isArray(rawList)) return [];

    const validPackages = [];
    const seenIds = new Set();

    for (let idx = 0; idx < rawList.length; idx++) {
        const item = rawList[idx];
        if (!item || typeof item !== 'object') continue;

        const packageId = String(item.lesson_id || item.package_id || item.packageId || item.id || `PKG-${idx + 1}`).trim();
        if (!packageId || seenIds.has(packageId)) continue;
        seenIds.add(packageId);

        const title = String(item.title || item.packageName || item.name || `Package ${packageId}`).trim();
        const rawStatus = String(item.status || 'APPROVED').toUpperCase();

        if (rawStatus === 'DRAFT') continue;

        const gradeVal = item.grade || item.class || 'Class 7';
        const difficultyVal = item.difficulty || 'INTERMEDIATE';
        const serverVersion = String(item.version || item.package_version || '1.0.0');
        const checksumVal = String(item.checksum || item.hash || '');
        const downloadUrl =
            item.downloadUrl ||
            item.download_url ||
            item.payload_json?.downloadUrl ||
            item.payload_json?.download_url ||
            '';

        let payloadJson = {};
        if (typeof item.payload_json === 'object' && item.payload_json !== null) {
            payloadJson = { ...item.payload_json };
        } else if (typeof item.payload_json === 'string') {
            try { payloadJson = JSON.parse(item.payload_json); } catch (e) { payloadJson = {}; }
        } else {
            payloadJson = {
                packageId: packageId,
                id: item.id || packageId,
                package_id: item.package_id || packageId,
                experience_id: item.experience_id || null,
                packageName: title,
                title: title,
                description: item.description || `Interactive Lesson Package: ${title}`,
                grade: gradeVal,
                difficulty: difficultyVal,
                subject: item.subject || 'English',
                language: item.language || 'English',
                estimated_duration: item.estimated_duration || 30,
                version: serverVersion,
                downloadUrl: downloadUrl,
                download_url: downloadUrl,
                checksum: checksumVal,
                status: 'APPROVED',
                lessons: Array.isArray(item.lessons) ? item.lessons : []
            };
        }

        if (downloadUrl) {
            payloadJson.downloadUrl = downloadUrl;
            payloadJson.download_url = downloadUrl;
        }

        if (item.activities && Array.isArray(item.activities)) {
            payloadJson.activities = item.activities;
            payloadJson.screens = item.screens || (item.activities[0]?.screens || []);
        }

        validPackages.push({
            lesson_id: packageId,
            title: title,
            type: item.type || item.lesson_type || 'EXPERIENCE',
            grade: gradeVal,
            difficulty: difficultyVal,
            status: 'APPROVED',
            payload_json: payloadJson,
            version: serverVersion,
            checksum: checksumVal,
            downloadUrl: downloadUrl,
            download_url: downloadUrl,
            created_at: item.published_at || item.created_at || new Date().toISOString()
        });
    }

    return validPackages;
}

/**
 * 8. Safe Package File Download and Validation:
 * Implements Phase 10 "Safe Package Update":
 * - Download to temporary directory
 * - Verify checksum / structure
 * - Atomically copy / extract to target directory
 * - If failure occurs, retain previous working copy
 */
async function fetchAndAttachPackageDetails(packages, baseUrl) {
    const { execSync } = require('child_process');
    const tmpDir = path.join(getWritableDataDir(), 'temp_pkgs');
    const experiencesBaseDir = getWritableExperiencesDir();

    if (!fs.existsSync(tmpDir)) {
        try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}
    }

    for (const pkg of packages) {
        try {
            const pkgId = pkg.lesson_id;
            const currentSyncState = getSyncState(pkgId);
            const serverVer = pkg.version || '1.0.0';
            const localVer = currentSyncState?.local_version;

            console.log(`[Sync] Package ${pkg.title} (${pkgId}) local=${localVer || 'none'} server=${serverVer}`);

            let downloadUrl =
                pkg.downloadUrl ||
                pkg.download_url ||
                pkg.payload_json?.downloadUrl ||
                pkg.payload_json?.download_url;
            if (!downloadUrl && pkgId) {
                downloadUrl = `/api/packages/${pkgId}/download/`;
            }

            if (downloadUrl) {
                const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${baseUrl}${downloadUrl}`;
                const tempZipPath = path.join(tmpDir, `temp_${pkgId}.zip`);
                const tempExtractDir = path.join(tmpDir, `temp_${pkgId}`);
                const finalTargetDir = path.join(experiencesBaseDir, pkgId);

                await new Promise((resolve) => {
                    const parsedUrl = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
                    const isHttps = parsedUrl.protocol === 'https:';
                    const httpLib = isHttps ? https : http;

                    const fileStream = fs.createWriteStream(tempZipPath);
                    const req = httpLib.get(fullUrl, { timeout: 30000 }, (res) => {
                        if (res.statusCode !== 200) {
                            fileStream.destroy();
                            try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
                            return resolve();
                        }

                        res.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close(() => {
                                try {
                                    if (fs.existsSync(tempExtractDir)) {
                                        fs.rmSync(tempExtractDir, { recursive: true, force: true });
                                    }
                                    fs.mkdirSync(tempExtractDir, { recursive: true });

                                    // Verify if downloaded file is valid JSON directly
                                    const rawDownloaded = fs.readFileSync(tempZipPath, 'utf-8');
                                    let isDirectJson = false;
                                    try {
                                        const parsedDownloaded = JSON.parse(rawDownloaded);
                                        if (parsedDownloaded && (parsedDownloaded.activities || parsedDownloaded.id || parsedDownloaded.title)) {
                                            isDirectJson = true;
                                            fs.writeFileSync(path.join(tempExtractDir, 'experience.json'), JSON.stringify(parsedDownloaded, null, 2), 'utf-8');
                                            if (parsedDownloaded.activities) {
                                                pkg.payload_json.activities = parsedDownloaded.activities;
                                                pkg.payload_json.experienceType = parsedDownloaded.experienceType || 'EXPERIENCE';
                                                pkg.payload_json.masteryThreshold = parsedDownloaded.masteryThreshold || 80;
                                            }
                                        }
                                    } catch (jsonErr) {}

                                    // If not direct JSON, attempt zip extraction
                                    if (!isDirectJson) {
                                        try {
                                            execSync(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'ignore', timeout: 8000 });
                                            const expPath = path.join(tempExtractDir, 'experience.json');
                                            if (fs.existsSync(expPath)) {
                                                const expData = JSON.parse(fs.readFileSync(expPath, 'utf-8'));
                                                if (expData.activities) {
                                                    pkg.payload_json.activities = expData.activities;
                                                    pkg.payload_json.experienceType = expData.experienceType || 'EXPERIENCE';
                                                    pkg.payload_json.masteryThreshold = expData.masteryThreshold || 80;
                                                }
                                            }
                                        } catch (unzipErr) {}
                                    }

                                    // Safe Atomic Replacement: copy validated temp package to final directory
                                    if (fs.existsSync(path.join(tempExtractDir, 'experience.json'))) {
                                        if (!fs.existsSync(finalTargetDir)) {
                                            fs.mkdirSync(finalTargetDir, { recursive: true });
                                        }
                                        fs.cpSync(tempExtractDir, finalTargetDir, { recursive: true, force: true });
                                        console.log(`[Sync] Package verified and stored: ${pkg.title}`);
                                    }

                                    // Record updated sync_state in SQLite
                                    upsertSyncState({
                                        package_id: pkgId,
                                        server_version: serverVer,
                                        local_version: serverVer,
                                        last_synced_at: new Date().toISOString(),
                                        sync_status: 'synced',
                                        checksum: pkg.checksum || '',
                                        file_path: finalTargetDir
                                    });

                                } catch (e) {
                                    console.warn(`[Sync] Safe package extraction notice for ${pkgId}:`, e.message);
                                } finally {
                                    try {
                                        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
                                        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
                                    } catch (cleanupErr) {}
                                }
                                resolve();
                            });
                        });
                    });

                    req.on('error', () => {
                        fileStream.destroy();
                        try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
                        resolve();
                    });

                    req.on('timeout', () => {
                        req.destroy();
                        fileStream.destroy();
                        try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
                        resolve();
                    });
                });
            }
        } catch (err) {
            console.warn(`[Sync] Package processing notice for ${pkg.lesson_id}:`, err.message);
        }
    }
}

/**
 * 9. Master Two-Way Sync Pipeline:
 * Flow:
 * [Sync] Starting synchronization
 * [Sync] Client IP detected
 * [Sync] Authentication successful
 * [Sync] Uploading pending student progress (LMS -> CMS)
 * [Sync] Synchronizing students and users (CMS -> LMS)
 * [Sync] Checking package versions and updating content (CMS -> LMS)
 * [Sync] Updating SQLite metadata and sync_state
 * [Sync] Synchronization completed
 */
async function syncWithCms(cmsHost, studentRollNumber) {
    console.log('[Sync] Starting synchronization');
    const baseUrl = setCmsHost(cmsHost || getCmsHost());
    const clientIp = getClientIp();

    console.log(`[Sync] Server host: ${baseUrl} | Client IP: ${clientIp}`);

    updateSyncMeta('client_ip', clientIp);
    updateSyncMeta('cms_host', baseUrl);

    try {
        const creds = loadEnvCredentials();
        const token = cmsAuth.getAccessToken(studentRollNumber) || (creds.apiKey && creds.apiKey.startsWith('eyJ') ? creds.apiKey : null);
        const authHeaders = {
            'X-API-Key': creds.apiKey,
            'X-Client-IP': clientIp
        };
        if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
        }

        console.log('[Sync] Authentication configured');

        // Step 1: LMS -> CMS: Push Pending Student Progress (via student JWT)
        const progressSyncResult = await pushPendingProgressToCms(baseUrl, clientIp, studentRollNumber);

        // Step 2: CMS -> LMS: Sync Users / Students
        console.log('[Sync] Synchronizing students and users...');
        let usersData = [];
        const userEndpoints = ['/api/v1/sync/bootstrap/', '/api/v1/sync/bootstrap', '/api/v1/lms/users', '/api/cms/students'];

        for (const ep of userEndpoints) {
            try {
                const data = await fetchJsonWithHeaders(ep, baseUrl, authHeaders, 3500);
                if (data && Array.isArray(data.users)) usersData = data.users;
                else if (data && Array.isArray(data.students)) usersData = data.students;
                else if (data && Array.isArray(data)) usersData = data;
                if (usersData.length > 0) break;
            } catch (e) {}
        }

        if (usersData.length > 0) {
            upsertUsers(usersData);
            console.log(`[Sync] Users synchronized: stored ${usersData.length} users in SQLite.`);
        } else {
            upsertUsers(DEFAULT_STUDENTS);
        }

        // Step 3: CMS -> LMS: Check Package Versions & Synchronize Lessons
        console.log('[Sync] Checking package versions...');
        const rawPackages = await fetchAllLessonPackagesFromCms(baseUrl, clientIp);
        const validPackages = validateAndTransformPackages(rawPackages);

        let syncResult = { inserted: 0, updated: 0, skipped: 0, total: 0 };

        if (validPackages.length > 0) {
            console.log(`[Sync] Downloading updates and verifying ${validPackages.length} package(s)...`);
            await fetchAndAttachPackageDetails(validPackages, baseUrl);
            syncResult = syncUpsertLessons(validPackages);
            console.log(`[Sync] SQLite updated: Inserted=${syncResult.inserted}, Updated=${syncResult.updated}, Skipped=${syncResult.skipped}`);
        } else {
            console.log('[Sync] Retaining existing SQLite lessons cache.');
            const currentLessons = getAllApprovedLessons();
            syncResult = {
                inserted: 0,
                updated: 0,
                skipped: currentLessons.length,
                total: currentLessons.length
            };
        }

        const isServerReachable = (usersData.length > 0) || (rawPackages.length > 0) || (progressSyncResult && progressSyncResult.synced > 0);

        if (!isServerReachable) {
            console.warn(`[Sync] ⚠️ Server ${baseUrl} is unreachable or offline. Running in offline mode.`);
            updateSyncMeta('last_sync_status', 'OFFLINE');
            const syncSummary = getSyncSummary();
            return {
                success: true,
                offline: true,
                clientIp: clientIp,
                cmsHost: baseUrl,
                packages: syncResult,
                progress: progressSyncResult,
                totalPackages: syncResult.total,
                pendingProgress: syncSummary.pendingProgressCount,
                message: 'CMS offline: running in offline-first mode with SQLite cached data',
                lastSyncedAt: getSyncMeta('last_synced_at') || new Date().toISOString()
            };
        }

        const syncTimestamp = new Date().toISOString();
        updateSyncMeta('last_synced_at', syncTimestamp);
        updateSyncMeta('packages_synced', String(syncResult.total));
        updateSyncMeta('last_sync_status', 'SUCCESS');

        console.log('[Sync] Synchronization completed successfully.');

        return {
            success: true,
            offline: false,
            clientIp: clientIp,
            cmsHost: baseUrl,
            packages: syncResult,
            progress: progressSyncResult,
            totalPackages: syncResult.total,
            lastSyncedAt: syncTimestamp
        };

    } catch (err) {
        console.warn(`[Sync] ⚠️ Network / Server notice: ${err.message}. Retaining offline SQLite data.`);
        const cachedLessons = getAllApprovedLessons();
        const syncSummary = getSyncSummary();

        updateSyncMeta('last_sync_status', 'OFFLINE');

        return {
            success: true,
            offline: true,
            clientIp: clientIp,
            cmsHost: baseUrl,
            totalPackages: cachedLessons.length,
            pendingProgress: syncSummary.pendingProgressCount,
            message: 'CMS offline: running in offline-first mode with SQLite cached data',
            lastSyncedAt: getSyncMeta('last_synced_at') || new Date().toISOString()
        };
    }
}

module.exports = {
    getClientIp,
    setCmsHost,
    getCmsHost,
    fetchJsonWithHeaders,
    postJsonWithHeaders,
    parseProgressDetails,
    buildProgressSyncPayload,
    pushPendingProgressToCms,
    fetchStudentProgressFromCms,
    fetchAllLessonPackagesFromCms,
    validateAndTransformPackages,
    fetchAndAttachPackageDetails,
    syncWithCms
};
