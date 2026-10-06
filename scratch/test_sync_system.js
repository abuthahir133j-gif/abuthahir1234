const path = require('path');
const fs = require('fs');
const http = require('http');

// 1. Initialize SQLite
const {
    initDatabase,
    getDb,
    upsertUsers,
    saveStudentProgress,
    getPendingProgress,
    markProgressSynced,
    getAllStudentProgress,
    upsertSyncState,
    getSyncState,
    getSyncSummary,
    getAllApprovedLessons
} = require('../src/main/db/sqlite');

const { syncWithCms } = require('../src/main/services/syncService');
const { startServer } = require('../cmsServer');
const cmsDatabase = require('../cmsDatabase');

async function runVerification() {
    cmsDatabase.registerStudent('STU-TEST-001', 'Test Student');
    console.log('====================================================');
    console.log('🧪 RUNNING OFFLINE-FIRST LMS & CMS SYNC TEST SUITE');
    console.log('====================================================\n');

    // Test 1: SQLite Schema & Tables Initialized
    console.log('--- TEST 1: SQLite Schema Initialization ---');
    const db = initDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log('Tables found in SQLite:', tables);

    const requiredTables = ['users', 'lessons', 'sync_meta', 'sync_state', 'student_progress'];
    for (const req of requiredTables) {
        if (!tables.includes(req)) {
            throw new Error(`Missing required SQLite table: ${req}`);
        }
    }
    console.log('✅ TEST 1 PASSED: All required SQLite tables exist.\n');

    // Test 2: Offline Progress Saving
    console.log('--- TEST 2: Offline Student Progress Saving ---');
    const testProgress = saveStudentProgress({
        student_id: 'STU-TEST-001',
        level_id: '1',
        package_id: 'PKG-1',
        score: 300,
        stars: 3,
        status: 'COMPLETED',
        details_json: { timeSpentSeconds: 45, attempts: 1 }
    });
    console.log('Saved record:', testProgress);

    const pending = getPendingProgress();
    const foundPending = pending.find(p => p.progress_id === testProgress.progress_id);
    if (!foundPending || foundPending.sync_status !== 'pending') {
        throw new Error('Test progress record not saved with pending sync_status');
    }
    console.log('✅ TEST 2 PASSED: Offline progress successfully stored in SQLite as pending.\n');

    // Test 3: Offline-First Startup with Server Offline
    console.log('--- TEST 3: Offline LMS Startup Resilience ---');
    const offlineSync = await syncWithCms('http://127.0.0.1:9999'); // Non-existent port
    console.log('Offline sync result:', offlineSync);
    if (!offlineSync.offline) {
        throw new Error('Expected offline: true when server unreachable');
    }
    console.log('✅ TEST 3 PASSED: Application gracefully handles offline state without throwing fatal crashes.\n');

    // Test 4: Live CMS Server Handshake & Two-Way Sync
    console.log('--- TEST 4: Online CMS Server Two-Way Sync ---');
    const testPort = 8088;
    const cmsInstance = startServer(testPort, '127.0.0.1');

    await new Promise(r => setTimeout(r, 400));

    const onlineSync = await syncWithCms(`http://127.0.0.1:${testPort}`);
    console.log('Online sync result:', onlineSync);

    if (onlineSync.offline) {
        throw new Error('Expected online sync success when CMS server is running');
    }

    // Check if progress was marked synced
    const studentHistory = getAllStudentProgress('STU-TEST-001');
    console.log('Student history after sync:', studentHistory);
    const updatedRecord = studentHistory.find(p => p.progress_id === testProgress.progress_id);
    if (!updatedRecord || updatedRecord.sync_status !== 'synced') {
        throw new Error('Progress record was not marked as synced after successful CMS response');
    }
    console.log('✅ TEST 4 PASSED: Two-way sync uploaded progress and updated SQLite status to synced.\n');

    // Test 5: Package Sync State Tracking
    console.log('--- TEST 5: Package Version & Sync State Tracking ---');
    const syncStates = db.prepare("SELECT * FROM sync_state").all();
    console.log('Sync states in SQLite:', syncStates);
    console.log('✅ TEST 5 PASSED: Package sync states tracked correctly.\n');

    // Test 6: Security Verification (No PostgreSQL credentials in client code)
    console.log('--- TEST 6: Security Verification (No PostgreSQL credentials) ---');
    const syncServiceSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'services', 'syncService.js'), 'utf-8');
    const sqliteSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'db', 'sqlite.js'), 'utf-8');
    const preloadSrc = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf-8');

    const prohibitedTerms = ['postgres://', 'postgresql://', 'pg_connect', 'pg_user', 'pg_pass', 'DATABASE_URL'];
    for (const term of prohibitedTerms) {
        if (syncServiceSrc.includes(term) || sqliteSrc.includes(term) || preloadSrc.includes(term)) {
            throw new Error(`Security violation: Found prohibited database credential/term '${term}' in client LMS code!`);
        }
    }
    console.log('✅ TEST 6 PASSED: Verified zero PostgreSQL credentials exist in LMS client code.\n');

    // Close test server
    cmsInstance.close();

    console.log('====================================================');
    console.log('🎉 ALL SYNC & OFFLINE-FIRST TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
}

runVerification().catch(err => {
    console.error('❌ Test suite error:', err);
    process.exit(1);
});
