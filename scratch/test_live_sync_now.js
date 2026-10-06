const { initDatabase } = require('../src/main/db/sqlite');
const { syncWithCms, getCmsHost } = require('../src/main/services/syncService');

async function testSync() {
    console.log('Detected CMS Host before sync:', getCmsHost());
    console.log('Calling syncWithCms()...');
    const result = await syncWithCms();
    console.log('\n--- SYNC RESULT ---');
    console.log(JSON.stringify(result, null, 2));
}

testSync().catch(err => {
    console.error('SYNC EXCEPTION:', err);
});
