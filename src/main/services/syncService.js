const http = require('http');
const { net, app } = require('electron');
const {
    upsertUsers,
    upsertLessons,
    insertNewLessonsOnly,
    getExistingLessonIds,
    updateSyncMeta,
    getSyncMeta,
    getUsersCount
} = require('../db/sqlite');

const path = require('path');
const fs = require('fs');

function loadConfigHost() {
    try {
        const configPath = path.join(process.cwd(), 'data', 'config.json');
        if (fs.existsSync(configPath)) {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (raw.cms_host) return raw.cms_host;
        }
    } catch (e) {}
    return null;
}

// Default CMS Host (reads from config.json or env)
let currentCmsHost = process.env.CMS_HOST || loadConfigHost() || 'http://10.29.224.31:8000';

/**
 * Configure or format the CMS host base URL
 * @param {string} host 
 */
function setCmsHost(host) {
    if (host && typeof host === 'string') {
        currentCmsHost = host.trim().replace(/\/+$/, '');
    }
    return currentCmsHost;
}

function getCmsHost() {
    return currentCmsHost.trim().replace(/\/+$/, '');
}

/**
 * Reliable JSON fetcher for CMS backend API
 * @param {string} reqPath - e.g. '/api/v1/sync/bootstrap/'
 * @param {string} [baseUrl] - e.g. 'http://10.29.224.31:8000'
 */
function fetchJson(reqPath, baseUrl) {
    let hostname = '10.29.224.31';
    let port = 8000;
    try {
        const raw = baseUrl || getCmsHost();
        const parsed = new URL(raw.startsWith('http') ? raw : `http://${raw}`);
        hostname = parsed.hostname || '10.29.224.31';
        port = Number(parsed.port) || 8000;
    } catch (e) {}

    const fullUrl = `http://${hostname}:${port}${reqPath}`;

    // Primary: Electron net module (Chromium stack)
    const tryElectronNet = () => {
        return new Promise((resolve, reject) => {
            if (!app || !app.isReady || !app.isReady()) {
                return reject(new Error('App not ready'));
            }
            const request = net.request({ method: 'GET', url: fullUrl });
            request.setHeader('Accept', 'application/json');
            let body = '';
            request.on('response', (response) => {
                response.on('data', (chunk) => { body += chunk; });
                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        try { resolve(JSON.parse(body)); }
                        catch (e) { reject(new Error('Invalid JSON from CMS')); }
                    } else {
                        reject(new Error(`CMS returned HTTP ${response.statusCode}`));
                    }
                });
            });
            request.on('error', (err) => reject(err));
            request.end();
        });
    };

    // Fallback: Node http.request using target hostname
    const tryNodeHttp = (host) => {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: host,
                port: port,
                path: reqPath,
                method: 'GET',
                headers: { 'Accept': 'application/json', 'Host': `${host}:${port}` },
                timeout: 6000
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(data)); }
                        catch (e) { reject(new Error('Invalid JSON from CMS')); }
                    } else {
                        reject(new Error(`CMS returned HTTP ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('CMS timeout')); });
            req.end();
        });
    };

    return tryElectronNet()
        .catch(() => tryNodeHttp(hostname))
        .catch(() => tryNodeHttp('127.0.0.1'))
        .catch(() => tryNodeHttp('localhost'));
}

/**
 * Executes the full sync pipeline with Central Django CMS Backend
 * @param {string} [cmsHost] - Optional CMS server host URL
 */
async function syncWithCms(cmsHost) {
    const baseUrl = setCmsHost(cmsHost || getCmsHost());
    console.log(`[SyncService] Starting sync handshake with CMS at: ${baseUrl}`);

    let usersSyncedCount = 0;
    let lessonsSyncedCount = 0;

    try {
        // -------------------------------------------------------------
        // Step A: Sync Users (GET /api/v1/sync/bootstrap/)
        // -------------------------------------------------------------
        console.log(`[SyncService] Step A: Fetching users from ${baseUrl}/api/v1/sync/bootstrap/`);

        let usersData = [];
        try {
            const data = await fetchJson('/api/v1/sync/bootstrap/', baseUrl);
            if (data && Array.isArray(data.users)) {
                usersData = data.users;
            } else if (data && Array.isArray(data)) {
                usersData = data;
            }
        } catch (stepErr) {
            console.warn(`[SyncService] Step A fetch error: ${stepErr.message}`);
        }

        if (usersData.length > 0) {
            upsertUsers(usersData);
            usersSyncedCount = usersData.length;
            console.log(`[SyncService] Step A Complete: ${usersSyncedCount} users saved to local SQLite.`);
        } else {
            console.warn(`[SyncService] Step A Notice: No user records returned from bootstrap.`);
        }

        // -------------------------------------------------------------
        // Step B: Sync Lessons/Packages (GET /api/v1/lms/published-packages/)
        // -------------------------------------------------------------
        console.log(`[SyncService] Step B: Fetching approved lessons from CMS at ${baseUrl}`);

        let lessonsData = [];
        const packageEndpoints = [
            '/api/v1/lms/published-packages/',
            '/api/v1/lms/packages/',
            '/api/v1/sync/lessons/package/'
        ];

        for (const ep of packageEndpoints) {
            try {
                const data = await fetchJson(ep, baseUrl);
                if (data && Array.isArray(data.lessons)) {
                    lessonsData = data.lessons;
                } else if (data && Array.isArray(data.packages)) {
                    lessonsData = data.packages;
                } else if (data && Array.isArray(data)) {
                    lessonsData = data;
                }
                if (lessonsData.length > 0) {
                    console.log(`[SyncService] Successfully fetched ${lessonsData.length} packages from ${ep}`);
                    break;
                }
            } catch (e) {
                console.warn(`[SyncService] Endpoint ${ep} error: ${e.message}`);
            }
        }

        // Filter STRICTLY APPROVED / PUBLISHED items (ignore DRAFT)
        const approvedLessons = lessonsData.filter(lesson => {
            const status = String(lesson.status || 'APPROVED').toUpperCase();
            return status !== 'DRAFT' && status !== 'PENDING' && (status === 'APPROVED' || status === 'PUBLISHED');
        });

        let lessonsSkippedCount = 0;
        if (approvedLessons.length > 0) {
            const result = insertNewLessonsOnly(approvedLessons);
            lessonsSyncedCount = result.inserted;
            lessonsSkippedCount = result.skipped;
            console.log(`[SyncService] Step B Complete: ${lessonsSyncedCount} new packages saved, ${lessonsSkippedCount} existing packages skipped.`);
        } else {
            console.warn(`[SyncService] Step B Notice: No APPROVED/PUBLISHED lessons found in package response.`);
        }

        // -------------------------------------------------------------
        // Step C: Update Sync State in sync_meta
        // -------------------------------------------------------------
        const syncTimestamp = new Date().toISOString();
        updateSyncMeta('last_synced_at', syncTimestamp);
        updateSyncMeta('cms_host', baseUrl);
        console.log(`[SyncService] Step C Complete: Updated sync_meta last_synced_at = ${syncTimestamp}`);

        return {
            success: true,
            message: 'CMS Sync handshake completed successfully',
            cmsHost: baseUrl,
            usersSynced: usersSyncedCount,
            lessonsSynced: lessonsSyncedCount,
            lessonsSkipped: lessonsSkippedCount,
            totalLessonsFound: approvedLessons.length,
            lastSyncedAt: syncTimestamp
        };
    } catch (error) {
        console.error(`[SyncService] Error during CMS sync handshake: ${error.message}`);
        return {
            success: false,
            error: error.message || 'Failed to sync with CMS backend',
            cmsHost: baseUrl,
            usersSynced: usersSyncedCount,
            lessonsSynced: lessonsSyncedCount,
            lastSyncedAt: getSyncMeta('last_synced_at')
        };
    }
}

module.exports = {
    setCmsHost,
    getCmsHost,
    syncWithCms
};
