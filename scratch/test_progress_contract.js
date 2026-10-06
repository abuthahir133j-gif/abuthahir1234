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
    getSyncState
} = require('../src/main/db/sqlite');

const {
    parseProgressDetails,
    buildProgressSyncPayload,
    pushPendingProgressToCms,
    fetchAllLessonPackagesFromCms,
    validateAndTransformPackages,
    syncWithCms
} = require('../src/main/services/syncService');

async function runProgressContractTests() {
    console.log('================================================================');
    console.log('🧪 LMS -> CMS PROGRESS SYNC & CONTRACT VERIFICATION SUITE');
    console.log('================================================================\n');

    // TEST 1: Details Parsing Helper
    console.log('--- TEST 1: Details Parsing & Robust Handling ---');
    assert.deepStrictEqual(parseProgressDetails('{"timeSpentSeconds": 45, "attempts": 2}'), { timeSpentSeconds: 45, attempts: 2 });
    assert.deepStrictEqual(parseProgressDetails({ timeSpentSeconds: 45 }), { timeSpentSeconds: 45 });
    assert.deepStrictEqual(parseProgressDetails(null), {});
    assert.deepStrictEqual(parseProgressDetails(undefined), {});
    assert.deepStrictEqual(parseProgressDetails(''), {});
    assert.deepStrictEqual(parseProgressDetails('   '), {});
    assert.deepStrictEqual(parseProgressDetails('{}'), {});

    let threwError = false;
    try {
        parseProgressDetails('{ invalid json');
    } catch (e) {
        threwError = true;
    }
    assert.strictEqual(threwError, true, 'parseProgressDetails must throw SyntaxError on malformed JSON');
    console.log('✅ TEST 1 PASSED: Details parsing handles valid objects, strings, empty values, and throws on malformed JSON.\n');

    // TEST 2: camelCase Payload Mapping & No Root-Level device_id
    console.log('--- TEST 2: camelCase Payload Mapping ---');
    const mockPending = [
        {
            progress_id: 'PROG_MOCK_101',
            student_id: 'STU_MOCK_01',
            package_id: 'PKG_101',
            level_id: '1',
            score: 300,
            stars: 3,
            status: 'COMPLETED',
            details_json: JSON.stringify({ timeSpentSeconds: 45 }),
            completed_at: '2026-10-03T10:00:00.000Z',
            device_id: 'device-client-custom-99'
        }
    ];

    const { payload, validIds, invalidIds } = buildProgressSyncPayload(mockPending);

    assert.strictEqual(payload.device_id, undefined, 'device_id must NOT be at payload root level');
    assert.strictEqual(payload.synced_at, undefined, 'synced_at must NOT be at payload root level');
    assert.strictEqual(Array.isArray(payload.progress), true, 'payload must contain progress array');
    assert.strictEqual(payload.progress.length, 1);

    const item = payload.progress[0];
    assert.strictEqual(item.progressId, 'PROG_MOCK_101');
    assert.strictEqual(item.studentId, 'STU_MOCK_01');
    assert.strictEqual(item.packageId, 'PKG_101');
    assert.strictEqual(item.levelId, '1');
    assert.strictEqual(item.score, 300);
    assert.strictEqual(item.stars, 3);
    assert.strictEqual(item.status, 'COMPLETED');
    assert.deepStrictEqual(item.details, { timeSpentSeconds: 45 });
    assert.strictEqual(item.completedAt, '2026-10-03T10:00:00.000Z');
    assert.strictEqual(item.deviceId, 'device-client-custom-99');

    // Verify NO snake_case properties inside item
    assert.strictEqual(item.progress_id, undefined, 'item must not contain progress_id');
    assert.strictEqual(item.student_id, undefined, 'item must not contain student_id');
    assert.strictEqual(item.package_id, undefined, 'item must not contain package_id');
    assert.strictEqual(item.level_id, undefined, 'item must not contain level_id');
    assert.strictEqual(item.details_json, undefined, 'item must not contain details_json');
    assert.strictEqual(item.completed_at, undefined, 'item must not contain completed_at');
    assert.strictEqual(item.device_id, undefined, 'item must not contain device_id');

    console.log('Generated canonical payload structure:\n', JSON.stringify(payload, null, 2));
    console.log('✅ TEST 2 PASSED: Exact camelCase payload mapping verified.\n');

    // TEST 3: Invalid details_json in Batch Isolation
    console.log('--- TEST 3: Batch Isolation with Invalid details_json ---');
    const mixedBatch = [
        {
            progress_id: 'PROG_VALID_1',
            student_id: 'STU_1',
            level_id: '1',
            score: 100,
            stars: 2,
            status: 'COMPLETED',
            details_json: '{"valid": true}'
        },
        {
            progress_id: 'PROG_CORRUPT_2',
            student_id: 'STU_1',
            level_id: '2',
            score: 0,
            stars: 0,
            status: 'FAILED',
            details_json: 'CORRUPTED_NOT_JSON{{'
        },
        {
            progress_id: 'PROG_VALID_3',
            student_id: 'STU_1',
            level_id: '3',
            score: 200,
            stars: 3,
            status: 'COMPLETED',
            details_json: ''
        }
    ];

    const resultMixed = buildProgressSyncPayload(mixedBatch);
    assert.deepStrictEqual(resultMixed.validIds, ['PROG_VALID_1', 'PROG_VALID_3']);
    assert.deepStrictEqual(resultMixed.invalidIds, ['PROG_CORRUPT_2']);
    assert.strictEqual(resultMixed.payload.progress.length, 2);
    assert.deepStrictEqual(resultMixed.payload.progress[1].details, {});
    console.log('✅ TEST 3 PASSED: Corrupted details_json isolated; valid records preserved.\n');

    // TEST 4: Package Parsing downloadUrl Preference
    console.log('--- TEST 4: Package downloadUrl Support and Priority ---');
    const rawCmsPackages = [
        {
            packageId: 'PKG-CANONICAL-1',
            packageName: 'Canonical CMS English Package',
            version: '2.1.0',
            downloadUrl: '/api/packages/PKG-CANONICAL-1/download/',
            checksum: 'hash123'
        },
        {
            package_id: 'PKG-LEGACY-2',
            title: 'Legacy Package',
            version: '1.0.0',
            download_url: '/api/lms/packages/PKG-LEGACY-2/download/',
            checksum: 'hash456'
        }
    ];

    const transformed = validateAndTransformPackages(rawCmsPackages);
    assert.strictEqual(transformed.length, 2);
    assert.strictEqual(transformed[0].downloadUrl, '/api/packages/PKG-CANONICAL-1/download/');
    assert.strictEqual(transformed[0].payload_json.downloadUrl, '/api/packages/PKG-CANONICAL-1/download/');
    assert.strictEqual(transformed[1].downloadUrl, '/api/lms/packages/PKG-LEGACY-2/download/');
    console.log('✅ TEST 4 PASSED: downloadUrl preferred and legacy download_url supported.\n');

    // TEST 5: Canonical Package Endpoint Priority
    console.log('--- TEST 5: Canonical Package Discovery Endpoint Priority ---');
    const syncServiceSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'services', 'syncService.js'), 'utf-8');
    const packageEndpointsMatch = syncServiceSrc.match(/const packageEndpoints = \[([\s\S]*?)\];/);
    assert.ok(packageEndpointsMatch, 'packageEndpoints array found in syncService.js');
    const lines = packageEndpointsMatch[1].split('\n').map(l => l.trim().replace(/['",]/g, '')).filter(Boolean);
    assert.strictEqual(lines[0], '/api/packages/', 'Canonical /api/packages/ must be attempted FIRST');
    console.log('Package discovery priority list:\n', lines);
    console.log('✅ TEST 5 PASSED: /api/packages/ is highest priority endpoint.\n');

    // TEST 6: SQLite Schema Integrity Check
    console.log('--- TEST 6: SQLite Schema Integrity ---');
    const db = initDatabase();
    const cols = db.pragma('table_info(student_progress)').map(c => c.name);
    const expectedCols = [
        'progress_id',
        'student_id',
        'package_id',
        'level_id',
        'score',
        'stars',
        'status',
        'details_json',
        'completed_at',
        'sync_status',
        'synced_at',
        'device_id'
    ];
    for (const exp of expectedCols) {
        assert.ok(cols.includes(exp), `Column ${exp} must exist in student_progress table`);
    }
    console.log('SQLite student_progress columns verified:', cols);
    console.log('✅ TEST 6 PASSED: SQLite schema unchanged.\n');

    // TEST 7: End-to-End Live HTTP Sync with Mock CMS Server
    console.log('--- TEST 7: End-to-End HTTP Sync with Mock CMS ---');
    let receivedPayload = null;
    let receivedAuthHeader = null;

    const testServer = http.createServer((req, res) => {
        if (req.method === 'POST' && (req.url === '/api/lms/login/' || req.url === '/api/lms/login')) {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                let parsed = {};
                try { parsed = JSON.parse(body); } catch (e) {}
                const rollNo = parsed.roll_number || 'STU-CONTRACT-001';
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    tokens: {
                        access: 'mock_jwt_access_token_12345',
                        refresh: 'mock_jwt_refresh_token_67890'
                    },
                    student: {
                        id: 1,
                        user_id: 42,
                        roll_number: rollNo,
                        name: 'Contract Student'
                    }
                }));
            });
            return;
        }

        if (req.method === 'POST' && req.url === '/api/progress/sync/') {
            receivedAuthHeader = req.headers['authorization'];
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                receivedPayload = JSON.parse(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    syncedCount: receivedPayload.progress.length,
                    status: 'RECEIVED'
                }));
            });
            return;
        }

        res.writeHead(404);
        res.end();
    });

    await new Promise((resolve) => testServer.listen(8765, '127.0.0.1', resolve));

    // Save a real progress item to SQLite
    const savedRecord = saveStudentProgress({
        student_id: 'STU-CONTRACT-001',
        level_id: '3',
        package_id: 'PKG-ENG-3',
        score: 450,
        stars: 3,
        status: 'COMPLETED',
        details_json: { timeSpentSeconds: 120, accuracy: 95 },
        device_id: 'electron-win-test-device'
    });

    const syncResult = await pushPendingProgressToCms('http://127.0.0.1:8765');
    console.log('pushPendingProgressToCms result:', syncResult);

    assert.strictEqual(syncResult.synced >= 1, true, 'At least 1 record synced');
    assert.ok(receivedPayload, 'CMS must have received payload');
    assert.strictEqual(receivedPayload.device_id, undefined, 'No root-level device_id in HTTP request');
    assert.ok(Array.isArray(receivedPayload.progress), 'progress array exists');

    const syncedHttpItem = receivedPayload.progress.find(p => p.progressId === savedRecord.progress_id);
    assert.ok(syncedHttpItem, 'Saved progress record found in HTTP payload');
    assert.strictEqual(syncedHttpItem.progressId, savedRecord.progress_id);
    assert.strictEqual(syncedHttpItem.studentId, 'STU-CONTRACT-001');
    assert.strictEqual(syncedHttpItem.packageId, 'PKG-ENG-3');
    assert.strictEqual(syncedHttpItem.levelId, '3');
    assert.strictEqual(syncedHttpItem.score, 450);
    assert.strictEqual(syncedHttpItem.stars, 3);
    assert.strictEqual(syncedHttpItem.status, 'COMPLETED');
    assert.deepStrictEqual(syncedHttpItem.details, { timeSpentSeconds: 120, accuracy: 95 });
    assert.strictEqual(syncedHttpItem.deviceId, 'electron-win-test-device');

    // Verify SQLite record was marked synced
    const recordsInDb = getAllStudentProgress('STU-CONTRACT-001');
    const updatedDbRecord = recordsInDb.find(r => r.progress_id === savedRecord.progress_id);
    assert.strictEqual(updatedDbRecord.sync_status, 'synced');
    assert.ok(updatedDbRecord.synced_at, 'synced_at timestamp set');

    testServer.close();
    console.log('✅ TEST 7 PASSED: End-to-end HTTP sync verified against canonical POST /api/progress/sync/ contract.\n');

    console.log('================================================================');
    console.log('🎉 ALL PROGRESS CONTRACT VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
}

runProgressContractTests().catch(err => {
    console.error('❌ Progress contract test failure:', err);
    process.exit(1);
});
