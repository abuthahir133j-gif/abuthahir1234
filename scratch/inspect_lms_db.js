const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'language_lab.db');
const db = new Database(dbPath);

console.log('=== SQLITE DATABASE INSPECTION ===');
console.log('DB Path:', dbPath);

// 1. Existing lessons
const lessons = db.prepare('SELECT * FROM lessons').all();
console.log(`\nLessons count: ${lessons.length}`);
lessons.forEach((l, i) => {
    console.log(`  [Lesson ${i + 1}] ID: ${l.lesson_id} | Title: ${l.title} | Status: ${l.status} | Type: ${l.type} | Grade: ${l.grade}`);
});

// 2. Sync state records
const syncStates = db.prepare('SELECT * FROM sync_state').all();
console.log(`\nSync State records count: ${syncStates.length}`);
syncStates.forEach((s, i) => {
    console.log(`  [SyncState ${i + 1}] pkg_id: ${s.package_id} | local_ver: ${s.local_version} | server_ver: ${s.server_version} | status: ${s.sync_status} | checksum: ${s.checksum} | last_synced: ${s.last_synced_at}`);
});

// 3. Sync meta
const syncMeta = db.prepare('SELECT * FROM sync_meta').all();
console.log(`\nSync Meta count: ${syncMeta.length}`);
syncMeta.forEach((m) => {
    console.log(`  ${m.key} = ${m.value}`);
});

// 4. Users count
const users = db.prepare('SELECT * FROM users').all();
console.log(`\nUsers count: ${users.length}`);
users.forEach((u, i) => {
    console.log(`  [User ${i + 1}] ID: ${u.id} | username: ${u.username} | role: ${u.role} | name: ${u.name} | roll_no: ${u.roll_no}`);
});

// 5. Student progress
const progress = db.prepare('SELECT * FROM student_progress').all();
console.log(`\nStudent Progress count: ${progress.length}`);
progress.forEach((p, i) => {
    console.log(`  [Progress ${i + 1}] ID: ${p.progress_id} | student: ${p.student_id} | level: ${p.level_id} | sync_status: ${p.sync_status}`);
});
