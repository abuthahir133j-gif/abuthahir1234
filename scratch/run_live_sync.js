const path = require('path');
const { initDatabase } = require('../src/main/db/sqlite');
const { syncWithCms } = require('../src/main/services/syncService');

async function runLiveSync() {
    console.log('=== RUNNING LMS PACKAGE SYNCHRONIZATION AGAINST LIVE CMS (http://127.0.0.1:8000) ===');
    try {
        const result = await syncWithCms('http://127.0.0.1:8000');
        console.log('\n--- SYNC RESULT ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('SYNC FAILED WITH ERROR:', err);
    }
}

runLiveSync();
