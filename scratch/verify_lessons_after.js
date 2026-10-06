const Database = require('better-sqlite3');
const db = new Database('d:/LMS/data/language_lab.db');
const lessons = db.prepare('SELECT lesson_id, title, status, grade FROM lessons').all();
const syncs = db.prepare('SELECT package_id, local_version, server_version, sync_status FROM sync_state').all();
const meta = db.prepare('SELECT * FROM sync_meta').all();

console.log('=== VERIFICATION SUMMARY ===');
console.log('Total Lessons in SQLite:', lessons.length);
console.log('Total Sync States in SQLite:', syncs.length);
console.log('Sync Meta:');
meta.forEach(m => console.log(`  ${m.key} = ${m.value}`));

console.log('\nAll 40 Synced Lessons:');
lessons.forEach((l, i) => {
    console.log(`  [${i + 1}] ID: ${l.lesson_id} | Title: '${l.title}' | Grade: '${l.grade}' | Status: '${l.status}'`);
});
