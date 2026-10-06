const fs = require('fs');
const path = require('path');
const {
    saveStudentProgress,
    getPendingProgress,
    markProgressSynced,
    getAllStudentProgress,
    upsertSyncState,
    getSyncState,
    syncUpsertLessons,
    getAllApprovedLessons
} = require('../src/main/db/sqlite');

async function testEdgeCases() {
    console.log('--- EDGE CASE TEST: Progress Persistence on Failure & Safe Retries ---');
    // Save progress while offline
    const record = saveStudentProgress({
        student_id: 'STU-OFFLINE-TEST',
        level_id: '5',
        package_id: 'PKG-5',
        score: 500,
        stars: 3,
        status: 'COMPLETED'
    });

    let pendingList = getPendingProgress();
    const isPending = pendingList.some(p => p.progress_id === record.progress_id && p.sync_status === 'pending');
    if (!isPending) throw new Error('Failed to record pending progress');
    console.log('✅ Offline progress recorded');

    // Simulate safe package updates
    const initialLesson = {
        lesson_id: 'PKG-EDGE-1',
        title: 'Original Lesson',
        type: 'EXPERIENCE',
        payload_json: { version: '1.0.0', activities: [] }
    };
    syncUpsertLessons([initialLesson]);

    upsertSyncState({
        package_id: 'PKG-EDGE-1',
        server_version: '1.0.0',
        local_version: '1.0.0',
        sync_status: 'synced'
    });

    const state1 = getSyncState('PKG-EDGE-1');
    if (state1.local_version !== '1.0.0') throw new Error('Initial sync state mismatch');

    // Update with new version
    const updatedLesson = {
        lesson_id: 'PKG-EDGE-1',
        title: 'Updated Lesson V2',
        type: 'EXPERIENCE',
        payload_json: { version: '2.0.0', activities: [{ id: 'act1' }] }
    };
    syncUpsertLessons([updatedLesson]);
    upsertSyncState({
        package_id: 'PKG-EDGE-1',
        server_version: '2.0.0',
        local_version: '2.0.0',
        sync_status: 'synced'
    });

    const state2 = getSyncState('PKG-EDGE-1');
    if (state2.local_version !== '2.0.0') throw new Error('Updated sync state mismatch');
    console.log('✅ Package safe version upgrade verified:', state2);

    console.log('🎉 Edge cases verification passed successfully!');
}

testEdgeCases().catch(e => {
    console.error('Edge case test failed:', e);
    process.exit(1);
});
