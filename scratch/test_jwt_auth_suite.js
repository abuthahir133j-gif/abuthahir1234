const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const {
    initDatabase,
    getDb,
    saveStudentProgress,
    getPendingProgress,
    markProgressSynced,
    markProgressFailed,
    getAllStudentProgress,
    findUserByCode,
    upsertUsers
} = require('../src/main/db/sqlite');

const cmsAuth = require('../src/main/services/cmsAuthService');
const {
    pushPendingProgressToCms,
    fetchStudentProgressFromCms,
    buildProgressSyncPayload
} = require('../src/main/services/syncService');

// Capture console logs to verify no raw tokens are printed
const capturedLogs = [];
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

function startLogCapture() {
    console.log = function (...args) {
        capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        origLog.apply(console, args);
    };
    console.warn = function (...args) {
        capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        origWarn.apply(console, args);
    };
    console.error = function (...args) {
        capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        origError.apply(console, args);
    };
}

function stopLogCapture() {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
}

// Known sensitive token secrets used in test scenarios
const SENSITIVE_TOKENS = [
    'secret_access_jwt_aaa_111',
    'secret_refresh_jwt_rrr_111',
    'secret_access_jwt_refreshed_222',
    'secret_refresh_jwt_rotated_333',
    'secret_access_jwt_relogin_444',
    'secret_refresh_jwt_relogin_555',
    'secret_student_a_access_token',
    'secret_student_b_access_token'
];

async function runTestSuite() {
    console.log('================================================================');
    console.log('🧪 CMS STUDENT JWT AUTHENTICATION VERIFICATION TEST SUITE');
    console.log('================================================================\n');

    startLogCapture();

    // Initialize temporary SQLite DB for test isolation
    const testDbPath = path.join(__dirname, 'test_jwt_auth.db');
    if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
    initDatabase(testDbPath);

    // Seed test users in SQLite
    upsertUsers([
        {
            id: 'STU-2026-001',
            username: 'STU-2026-001',
            lms_code: 'STU-2026-001',
            roll_no: 'STU-2026-001',
            name: 'Alice Johnson',
            grade: 'Class 7',
            section: 'A'
        },
        {
            id: 'STU-2026-002',
            username: 'STU-2026-002',
            lms_code: 'STU-2026-002',
            roll_no: 'STU-2026-002',
            name: 'Bob Smith',
            grade: 'Class 7',
            section: 'B'
        }
    ]);

    const PORT = 8991;
    const CMS_HOST = `http://127.0.0.1:${PORT}`;

    let serverState = {
        mode: 'normal', // 'normal', 'expire_access', 'fail_refresh', 'offline'
        receivedRequests: []
    };

    const mockServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            let parsedBody = {};
            try { parsedBody = JSON.parse(body); } catch (e) {}

            const requestRecord = {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: parsedBody,
                rawBody: body
            };
            serverState.receivedRequests.push(requestRecord);

            const authHeader = req.headers['authorization'] || '';
            const cookieHeader = req.headers['cookie'] || '';

            // Route: POST /api/lms/login/
            if (req.method === 'POST' && (req.url === '/api/lms/login/' || req.url === '/api/lms/login')) {
                const rollNo = parsedBody.roll_number;
                if (rollNo === 'STU-2026-001') {
                    const isFallback = serverState.mode === 'fallback_mode' || serverState.mode === 'in_refresh_fail';
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        tokens: {
                            access: isFallback
                                ? 'secret_access_jwt_relogin_444'
                                : 'secret_access_jwt_aaa_111',
                            refresh: isFallback
                                ? 'secret_refresh_jwt_relogin_555'
                                : 'secret_refresh_jwt_rrr_111'
                        },
                        student: {
                            id: 1,
                            user_id: 42,
                            roll_number: 'STU-2026-001',
                            full_name: 'Alice Johnson',
                            email: 'alice@example.edu'
                        }
                    }));
                } else if (rollNo === 'STU-2026-002') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        tokens: {
                            access: 'secret_student_b_access_token',
                            refresh: 'secret_student_b_refresh_token'
                        },
                        student: {
                            id: 2,
                            user_id: 43,
                            roll_number: 'STU-2026-002',
                            full_name: 'Bob Smith',
                            email: 'bob@example.edu'
                        }
                    }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Student not found' }));
                }
            }

            // Route: POST /api/auth/refresh/
            if (req.method === 'POST' && (req.url === '/api/auth/refresh/' || req.url === '/api/auth/refresh')) {
                if (serverState.mode === 'fail_refresh' || serverState.mode === 'in_refresh_fail') {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Token is invalid or expired', code: 'token_not_valid' }));
                }

                if (cookieHeader.includes('refresh_token=secret_refresh_jwt_rrr_111')) {
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': 'refresh_token=secret_refresh_jwt_rotated_333; Path=/; HttpOnly'
                    });
                    return res.end(JSON.stringify({
                        access: 'secret_access_jwt_refreshed_222'
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Invalid refresh token cookie' }));
                }
            }

            // Route: POST /api/progress/sync/
            if (req.method === 'POST' && (req.url === '/api/progress/sync/' || req.url === '/api/progress/sync')) {
                if (serverState.mode === 'expire_access') {
                    serverState.mode = 'normal'; // Next attempt should succeed with refreshed token
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Given token not valid for any token type', code: 'token_not_valid' }));
                }

                if (serverState.mode === 'fail_refresh') {
                    serverState.mode = 'in_refresh_fail'; // Next refresh should fail, triggering re-login fallback
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Given token not valid for any token type', code: 'token_not_valid' }));
                }

                if (authHeader.startsWith('Bearer secret_')) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        synced: parsedBody.progress ? parsedBody.progress.length : 1,
                        syncedAt: new Date().toISOString()
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Authentication credentials were not provided or invalid' }));
                }
            }

            // Route: GET /api/progress/
            if (req.method === 'GET' && (req.url === '/api/progress/' || req.url === '/api/progress')) {
                if (authHeader.startsWith('Bearer secret_')) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        results: [
                            { progressId: 'PROG_1', score: 100, stars: 3, levelId: '1' }
                        ]
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: 'Unauthorized' }));
                }
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        });
    });

    await new Promise(resolve => mockServer.listen(PORT, '127.0.0.1', resolve));

    const testResults = [];

    try {
        // -------------------------------------------------------------
        // TEST 1: Correct roll number POST /api/lms/login/ -> Tokens extracted
        // -------------------------------------------------------------
        console.log('--- TEST 1: CMS Student Login & Token Extraction ---');
        cmsAuth.clearCmsSession();
        const loginResult = await cmsAuth.loginStudentWithCms('STU-2026-001', CMS_HOST);
        assert.strictEqual(loginResult.success, true, 'CMS student login should succeed');
        assert.strictEqual(loginResult.rollNumber, 'STU-2026-001');
        assert.strictEqual(loginResult.userId, 42);
        assert.strictEqual(loginResult.studentId, 1);

        const activeSession = cmsAuth.getActiveStudentSession();
        assert.strictEqual(activeSession.hasAccessToken, true, 'Active session must have access token');
        assert.strictEqual(activeSession.hasRefreshToken, true, 'Active session must have refresh token');
        assert.strictEqual(activeSession.rollNumber, 'STU-2026-001');

        const loginReq = serverState.receivedRequests.find(r => r.url === '/api/lms/login/' && r.method === 'POST');
        assert.ok(loginReq, 'Login request must be sent to /api/lms/login/');
        assert.strictEqual(loginReq.body.roll_number, 'STU-2026-001');

        console.log('✅ TEST 1 PASSED: Correct roll number extracts access + refresh tokens and session metadata.\n');
        testResults.push({ name: 'Test 1: CMS Student Login & Token Extraction', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 2: Authenticated progress upload POST /api/progress/sync/
        // -------------------------------------------------------------
        console.log('--- TEST 2: Authenticated Progress Upload with Student JWT ---');
        saveStudentProgress({
            student_id: 'STU-2026-001',
            level_id: '1',
            package_id: 'PKG_1',
            score: 100,
            stars: 3,
            status: 'COMPLETED',
            details_json: { timeSpent: 30 }
        });

        const syncUploadResult = await pushPendingProgressToCms(CMS_HOST, '127.0.0.1', 'STU-2026-001');
        assert.strictEqual(syncUploadResult.synced, 1, '1 progress record should be synced');

        const uploadReq = serverState.receivedRequests.find(r => r.url === '/api/progress/sync/' && r.method === 'POST');
        assert.ok(uploadReq, 'Progress sync must post to /api/progress/sync/');
        assert.ok(uploadReq.headers['authorization'], 'Authorization header must be present');
        assert.strictEqual(uploadReq.headers['authorization'], 'Bearer secret_access_jwt_aaa_111');

        // Check SQLite sync_status is updated
        const progressInDb = getPendingProgress(10);
        assert.strictEqual(progressInDb.length, 0, 'No progress records should remain in pending queue after sync');

        console.log('✅ TEST 2 PASSED: Authenticated progress upload uses Authorization: Bearer <student_access_token>.\n');
        testResults.push({ name: 'Test 2: Authenticated Progress Upload with Student JWT', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 3: Authenticated progress download GET /api/progress/
        // -------------------------------------------------------------
        console.log('--- TEST 3: Authenticated Progress Download with Student JWT ---');
        const downloadResult = await fetchStudentProgressFromCms(CMS_HOST, 'STU-2026-001');
        assert.ok(downloadResult, 'Progress download result must be returned');
        assert.strictEqual(downloadResult.success, true);

        const downloadReq = serverState.receivedRequests.find(r => r.url === '/api/progress/' && r.method === 'GET');
        assert.ok(downloadReq, 'Progress download must request GET /api/progress/');
        assert.strictEqual(downloadReq.headers['authorization'], 'Bearer secret_access_jwt_aaa_111');

        console.log('✅ TEST 3 PASSED: Authenticated progress download uses same student\'s JWT.\n');
        testResults.push({ name: 'Test 3: Authenticated Progress Download with Student JWT', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 4 & 5: 401 response -> Token Refresh & Retry
        // -------------------------------------------------------------
        console.log('--- TEST 4 & 5: 401 Expiration -> POST /api/auth/refresh/ & Retry with New Token ---');
        serverState.mode = 'expire_access';
        serverState.receivedRequests = [];

        saveStudentProgress({
            student_id: 'STU-2026-001',
            level_id: '2',
            package_id: 'PKG_2',
            score: 95,
            stars: 3,
            status: 'COMPLETED'
        });

        const refreshSyncResult = await pushPendingProgressToCms(CMS_HOST, '127.0.0.1', 'STU-2026-001');
        assert.strictEqual(refreshSyncResult.synced, 1, 'Progress should sync successfully after automatic refresh and retry');

        const refreshReq = serverState.receivedRequests.find(r => r.url === '/api/auth/refresh/' && r.method === 'POST');
        assert.ok(refreshReq, 'Refresh endpoint /api/auth/refresh/ must be called on 401');
        assert.ok(refreshReq.headers['cookie'], 'Refresh cookie must be present in Cookie header');
        assert.strictEqual(refreshReq.headers['cookie'], 'refresh_token=secret_refresh_jwt_rrr_111');
        assert.deepStrictEqual(refreshReq.body, {}, 'Refresh token must NOT be sent in JSON body');

        // Check that retry used the refreshed access token
        const retriedSyncReq = serverState.receivedRequests.filter(r => r.url === '/api/progress/sync/' && r.method === 'POST')[1];
        assert.ok(retriedSyncReq, 'Request must be retried after token refresh');
        assert.strictEqual(retriedSyncReq.headers['authorization'], 'Bearer secret_access_jwt_refreshed_222');

        // Check rotated refresh token was stored
        const currentToken = cmsAuth.getAccessToken('STU-2026-001');
        assert.strictEqual(currentToken, 'secret_access_jwt_refreshed_222');

        console.log('✅ TEST 4 PASSED: 401 response triggers POST /api/auth/refresh/ with Cookie header.');
        console.log('✅ TEST 5 PASSED: Rotated tokens updated and original request retried successfully.\n');
        testResults.push({ name: 'Test 4: 401 Response Triggers Cookie-Based Refresh', status: 'PASS' });
        testResults.push({ name: 'Test 5: Token Refresh & Request Retry', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 6: Refresh failure -> Fallback to /api/lms/login/
        // -------------------------------------------------------------
        console.log('--- TEST 6: Refresh Failure -> Automatic Fallback to /api/lms/login/ ---');
        serverState.mode = 'fail_refresh';
        serverState.receivedRequests = [];

        saveStudentProgress({
            student_id: 'STU-2026-001',
            level_id: '3',
            package_id: 'PKG_3',
            score: 90,
            stars: 2,
            status: 'COMPLETED'
        });

        const fallbackSyncResult = await pushPendingProgressToCms(CMS_HOST, '127.0.0.1', 'STU-2026-001');
        assert.strictEqual(fallbackSyncResult.synced, 1, 'Sync must succeed via fallback login');

        const failedRefreshReq = serverState.receivedRequests.find(r => r.url === '/api/auth/refresh/' || r.url === '/api/auth/refresh');
        assert.ok(failedRefreshReq, 'Refresh was attempted first');

        const reloginReq = serverState.receivedRequests.find(r => (r.url === '/api/lms/login/' || r.url === '/api/lms/login') && r.method === 'POST');
        assert.ok(reloginReq, 'Fallback login to /api/lms/login/ was executed');
        assert.strictEqual(reloginReq.body.roll_number, 'STU-2026-001');

        const retriedAfterRelogin = serverState.receivedRequests.filter(r => r.url === '/api/progress/sync/')[1];
        assert.ok(retriedAfterRelogin, 'Request was retried after fallback login');
        assert.strictEqual(retriedAfterRelogin.headers['authorization'], 'Bearer secret_access_jwt_relogin_444');

        console.log('✅ TEST 6 PASSED: Refresh failure automatically falls back to /api/lms/login/ and retries.\n');
        testResults.push({ name: 'Test 6: Refresh Failure Re-Login Fallback', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 7: Network unavailable -> Local progress retained in SQLite
        // -------------------------------------------------------------
        console.log('--- TEST 7: Network Unavailable / CMS Outage ---');
        saveStudentProgress({
            student_id: 'STU-2026-001',
            level_id: '4',
            package_id: 'PKG_4',
            score: 85,
            stars: 2,
            status: 'COMPLETED'
        });

        const unreachableHost = 'http://127.0.0.1:19999'; // Non-existent port
        const offlineSyncResult = await pushPendingProgressToCms(unreachableHost, '127.0.0.1', 'STU-2026-001');

        assert.strictEqual(offlineSyncResult.synced, 0, 'No records synced when network is unavailable');
        assert.strictEqual(offlineSyncResult.failed >= 1, true, 'Records marked as failed for later retry');

        const pendingRecords = getPendingProgress(10);
        assert.ok(pendingRecords.length >= 1, 'Pending progress must remain safely in SQLite');

        // Confirm local SQLite user account is intact
        const localUser = findUserByCode('STU-2026-001');
        assert.ok(localUser, 'Local SQLite student account must NOT be deleted');
        assert.strictEqual(localUser.name, 'Alice Johnson');

        console.log('✅ TEST 7 PASSED: Network outage retains pending progress in SQLite and preserves local account.\n');
        testResults.push({ name: 'Test 7: Offline Behavior & SQLite Pending Retention', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 8: Session separation across student switching
        // -------------------------------------------------------------
        console.log('--- TEST 8: Session Separation & No Token Leakage on Student Switch ---');
        serverState.mode = 'normal';
        serverState.receivedRequests = [];

        // Log in Student A
        await cmsAuth.loginStudentWithCms('STU-2026-001', CMS_HOST);
        const tokenA = cmsAuth.getAccessToken('STU-2026-001');

        // Switch to Student B
        cmsAuth.setActiveStudent('STU-2026-002', { id: 2, name: 'Bob Smith', roll_number: 'STU-2026-002' });
        assert.strictEqual(cmsAuth.getActiveRollNumber(), 'STU-2026-002');
        assert.notStrictEqual(cmsAuth.getAccessToken(), tokenA, 'Active access token must NOT be Student A\'s token');

        // Log in Student B with CMS
        await cmsAuth.loginStudentWithCms('STU-2026-002', CMS_HOST);
        const tokenB = cmsAuth.getAccessToken('STU-2026-002');
        assert.strictEqual(tokenB, 'secret_student_b_access_token');
        assert.notStrictEqual(tokenA, tokenB, 'Tokens for different students must be strictly separate');

        // Sync progress for Student B
        saveStudentProgress({
            student_id: 'STU-2026-002',
            level_id: '1',
            package_id: 'PKG_1',
            score: 100,
            stars: 3,
            status: 'COMPLETED'
        });

        await pushPendingProgressToCms(CMS_HOST, '127.0.0.1', 'STU-2026-002');

        const studentBSyncReq = serverState.receivedRequests.find(r => r.url === '/api/progress/sync/' && r.method === 'POST');
        assert.ok(studentBSyncReq, 'Student B sync request found');
        assert.strictEqual(studentBSyncReq.headers['authorization'], 'Bearer secret_student_b_access_token');
        assert.notStrictEqual(studentBSyncReq.headers['authorization'], `Bearer ${tokenA}`, 'Student B request must NEVER use Student A token');

        console.log('✅ TEST 8 PASSED: Student switching cleanly isolates credentials without cross-contamination.\n');
        testResults.push({ name: 'Test 8: Session Separation Across Students', status: 'PASS' });

        // -------------------------------------------------------------
        // TEST 9: Security Check — Verify no tokens are leaked in logs
        // -------------------------------------------------------------
        console.log('--- TEST 9: Security Audit & Token Exposure Check ---');
        stopLogCapture();

        const allLogsText = capturedLogs.join('\n');
        let leakedTokens = [];

        for (const secret of SENSITIVE_TOKENS) {
            if (allLogsText.includes(secret)) {
                leakedTokens.push(secret);
            }
        }

        assert.strictEqual(leakedTokens.length, 0, `Security violation: Tokens found in console logs: ${leakedTokens.length} tokens leaked`);

        console.log('✅ TEST 9 PASSED: No access tokens, refresh tokens, or Authorization headers printed in logs.\n');
        testResults.push({ name: 'Test 9: Security Audit - Zero Token Leakage in Logs', status: 'PASS' });

    } finally {
        mockServer.close();
        stopLogCapture();
        try {
            if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        } catch (e) {}
    }

    console.log('================================================================');
    console.log('📊 TEST SUMMARY RESULTS:');
    console.log('================================================================');
    testResults.forEach(r => {
        console.log(`[${r.status}] ${r.name}`);
    });
    console.log('================================================================\n');

    return testResults;
}

if (require.main === module) {
    runTestSuite().catch(err => {
        console.error('❌ Test suite failed:', err);
        process.exit(1);
    });
}

module.exports = { runTestSuite };
