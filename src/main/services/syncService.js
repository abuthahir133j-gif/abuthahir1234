const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    upsertUsers,
    syncUpsertLessons,
    getAllApprovedLessons,
    updateSyncMeta,
    getSyncMeta,
    getUsersCount,
    DEFAULT_STUDENTS
} = require('../db/sqlite');

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
function loadEnvCredentials() {
    let host = '';
    let apiKey = '';

    // First check data/config.json
    try {
        const configPath = path.join(process.cwd(), 'data', 'config.json');
        if (fs.existsSync(configPath)) {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (raw.cms_host) host = String(raw.cms_host).trim();
        }
    } catch (e) {}

    // Check .env file
    const envPath = path.join(process.cwd(), '.env');
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
        } catch (e) {}
    }

    if (!host) host = process.env.CMS_HOST || process.env.CMS_BASE_URL || 'http://10.29.224.31:8000';
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
 * 3. Authenticated HTTP Request Helper:
 * Performs GET request to CMS with Authorization, X-API-Key, and Client IP headers.
 */
function fetchJsonWithHeaders(reqPath, baseUrl, headers = {}, timeoutMs = 3000) {
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
 * 4. Fetch All Lesson Packages from Django CMS:
 * Queries Django CMS published packages endpoints and handles pagination.
 */
async function fetchAllLessonPackagesFromCms(baseUrl, clientIp) {
    const creds = loadEnvCredentials();
    const headers = {
        'Authorization': `Bearer ${creds.apiKey}`,
        'X-API-Key': creds.apiKey,
        'X-Client-IP': clientIp,
        'X-Forwarded-For': clientIp
    };

    const packageEndpoints = [
        '/api/v1/lms/published-packages/',
        '/api/v1/lms/packages/',
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
                const data = await fetchJsonWithHeaders(currentPath, targetHost, headers, 3000);
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
 * 5. Validate & Transform Packages:
 * Normalizes CMS response into internal LMS package structure.
 */
function validateAndTransformPackages(rawList) {
    if (!Array.isArray(rawList)) return [];

    const validPackages = [];
    const seenIds = new Set();

    for (let idx = 0; idx < rawList.length; idx++) {
        const item = rawList[idx];
        if (!item || typeof item !== 'object') continue;

        // Extract primary package ID (e.g. 49, 46, PKG-ENG-101)
        const packageId = String(item.lesson_id || item.package_id || item.packageId || item.id || `PKG-${idx + 1}`).trim();
        if (!packageId || seenIds.has(packageId)) continue;
        seenIds.add(packageId);

        const title = String(item.title || item.packageName || item.name || `Package ${packageId}`).trim();
        const rawStatus = String(item.status || 'APPROVED').toUpperCase();

        // Skip DRAFT if explicitly flagged
        if (rawStatus === 'DRAFT') continue;

        const gradeVal = item.grade || item.class || 'Class 7';
        const difficultyVal = item.difficulty || 'INTERMEDIATE';

        let payloadJson = {};
        if (typeof item.payload_json === 'object' && item.payload_json !== null) {
            payloadJson = item.payload_json;
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
                version: item.version || '1.0.0',
                download_url: item.download_url || '',
                checksum: item.checksum || '',
                status: 'APPROVED',
                lessons: Array.isArray(item.lessons) ? item.lessons : []
            };
        }

        // If experience.json data was provided or exists in item, embed it directly
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
            created_at: item.published_at || item.created_at || new Date().toISOString()
        });
    }

    return validPackages;
}

/**
 * Helper to download and parse experience.json for a list of packages
 */
async function fetchAndAttachPackageDetails(packages, baseUrl) {
    const { execSync } = require('child_process');
    const tmpDir = path.join(process.cwd(), 'data', 'temp_pkgs');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    for (const pkg of packages) {
        try {
            let downloadUrl = pkg.payload_json?.download_url;
            if (!downloadUrl && pkg.lesson_id) {
                downloadUrl = `/api/lms/packages/${pkg.lesson_id}/download/`;
            }

            if (downloadUrl) {
                const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${baseUrl}${downloadUrl}`;
                const zipPath = path.join(tmpDir, `pkg_${pkg.lesson_id}.zip`);
                const extractDir = path.join(tmpDir, `pkg_${pkg.lesson_id}`);

                await new Promise((resolve) => {
                    const file = fs.createWriteStream(zipPath);
                    http.get(fullUrl, (res) => {
                        if (res.statusCode !== 200) return resolve();
                        res.pipe(file);
                        file.on('finish', () => {
                            file.close(() => {
                                try {
                                    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
                                    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'ignore' });
                                    const expPath = path.join(extractDir, 'experience.json');
                                    if (fs.existsSync(expPath)) {
                                        const expData = JSON.parse(fs.readFileSync(expPath, 'utf-8'));
                                        if (expData.activities) {
                                            pkg.payload_json.activities = expData.activities;
                                            pkg.payload_json.experienceType = expData.experienceType || 'EXPERIENCE';
                                            pkg.payload_json.masteryThreshold = expData.masteryThreshold || 80;
                                        }
                                        console.log(`[SyncService] 📦 Attached ${expData.activities?.length || 0} real CMS activities to pkg ${pkg.lesson_id} (${pkg.title})`);
                                    }
                                } catch (e) {}
                                resolve();
                            });
                        });
                    }).on('error', () => resolve());
                });
            }
        } catch (err) {}
    }
}

/**
 * 6. Master Sync Pipeline:
 * Flow: Login → Get Client IP → Connect to CMS → Fetch All Lesson Packages → Store in LMS → Store in SQLite
 * Offline-safe with SQLite persistence.
 */
async function syncWithCms(cmsHost) {
    const baseUrl = setCmsHost(cmsHost || getCmsHost());
    const clientIp = getClientIp();

    console.log(`[SyncService] 🚀 Triggering CMS Sync -> Host: ${baseUrl} | Client IP: ${clientIp}`);

    // Update client IP and host in sync_meta
    updateSyncMeta('client_ip', clientIp);
    updateSyncMeta('cms_host', baseUrl);

    try {
        const creds = loadEnvCredentials();
        const authHeaders = {
            'Authorization': `Bearer ${creds.apiKey}`,
            'X-API-Key': creds.apiKey,
            'X-Client-IP': clientIp
        };

        // Step A: Sync Users (GET /api/v1/sync/bootstrap/)
        console.log(`[SyncService] 👥 Syncing users from CMS...`);
        let usersData = [];
        const userEndpoints = ['/api/v1/sync/bootstrap/', '/api/v1/sync/bootstrap', '/api/v1/lms/users'];

        for (const ep of userEndpoints) {
            try {
                const data = await fetchJsonWithHeaders(ep, baseUrl, authHeaders, 3000);
                if (data && Array.isArray(data.users)) usersData = data.users;
                else if (data && Array.isArray(data)) usersData = data;
                if (usersData.length > 0) break;
            } catch (e) {}
        }

        if (usersData.length > 0) {
            upsertUsers(usersData);
            console.log(`[SyncService] Stored ${usersData.length} users in SQLite.`);
        } else {
            upsertUsers(DEFAULT_STUDENTS);
        }

        // Step B: Fetch All Lesson Packages from CMS
        console.log(`[SyncService] 📦 Fetching all lesson packages from CMS (${baseUrl})...`);
        const rawPackages = await fetchAllLessonPackagesFromCms(baseUrl, clientIp);
        const validPackages = validateAndTransformPackages(rawPackages);

        let syncResult = { inserted: 0, updated: 0, skipped: 0, total: 0 };

        // Step C: Persist / Upsert into SQLite
        if (validPackages.length > 0) {
            console.log(`[SyncService] 📥 Extracting rich experience activities and screens for ${validPackages.length} packages...`);
            await fetchAndAttachPackageDetails(validPackages, baseUrl);
            syncResult = syncUpsertLessons(validPackages);
            console.log(`[SyncService] ✅ Successfully synced ${validPackages.length} package(s) with full CMS content into SQLite!`);
        } else {
            console.log(`[SyncService] ℹ️ Retaining existing lessons in SQLite.`);
            const currentLessons = getAllApprovedLessons();
            syncResult = {
                inserted: 0,
                updated: 0,
                skipped: currentLessons.length,
                total: currentLessons.length
            };
        }

        const syncTimestamp = new Date().toISOString();
        updateSyncMeta('last_synced_at', syncTimestamp);
        updateSyncMeta('packages_synced', String(syncResult.total));

        return {
            success: true,
            clientIp: clientIp,
            cmsHost: baseUrl,
            packages: syncResult,
            totalPackages: syncResult.total,
            lastSyncedAt: syncTimestamp
        };

    } catch (err) {
        console.warn(`[SyncService] ⚠️ Notice during CMS sync: ${err.message}. Retaining offline SQLite cache.`);
        const cachedLessons = getAllApprovedLessons();

        return {
            success: true,
            offline: true,
            clientIp: clientIp,
            cmsHost: baseUrl,
            totalPackages: cachedLessons.length,
            message: 'CMS offline: loaded local SQLite cached packages',
            lastSyncedAt: new Date().toISOString()
        };
    }
}

module.exports = {
    getClientIp,
    setCmsHost,
    getCmsHost,
    fetchJsonWithHeaders,
    fetchAllLessonPackagesFromCms,
    validateAndTransformPackages,
    syncWithCms
};
