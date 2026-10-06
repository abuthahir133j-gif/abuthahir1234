const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPaths = [
    path.join(__dirname, '..', 'data', 'language_lab.db'),
    path.join(process.env.APPDATA || '', 'language-lab', 'data', 'language_lab.db'),
    path.join(process.env.APPDATA || '', 'Abuthahir-lab', 'data', 'language_lab.db')
];

console.log('--- Language Lab Database Cleaner ---');

for (const dbPath of dbPaths) {
    if (!fs.existsSync(dbPath)) {
        console.log(`[Skip] DB does not exist at: ${dbPath}`);
        continue;
    }

    console.log(`\n[Cleaning] Opening database: ${dbPath}`);
    let db;
    try {
        db = new Database(dbPath, { timeout: 5000 });
        
        // Check existing tables
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        console.log('Tables found:', tables.map(t => t.name));

        // Delete all rows from each table
        for (const t of tables) {
            const countBefore = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get().c;
            db.prepare(`DELETE FROM ${t.name}`).run();
            console.log(`Cleared table '${t.name}': removed ${countBefore} rows.`);
        }

        // Re-run schema initialization to ensure correct structure
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT,
                grade TEXT,
                section TEXT,
                lms_code TEXT,
                roll_no TEXT
            );

            CREATE TABLE IF NOT EXISTS lessons (
                lesson_id TEXT PRIMARY KEY,
                title TEXT,
                type TEXT,
                grade TEXT,
                difficulty TEXT,
                status TEXT,
                payload_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // Run vacuum to reclaim disk space
        db.exec('VACUUM;');
        console.log(`Successfully vacuumed and cleared: ${dbPath}`);

    } catch (err) {
        console.error(`Error cleaning ${dbPath}:`, err.message);
    } finally {
        if (db) db.close();
    }
}

// Clean temporary package cache / json files if any
const tempPkgDir = path.join(__dirname, '..', 'data', 'temp_pkgs');
if (fs.existsSync(tempPkgDir)) {
    const files = fs.readdirSync(tempPkgDir);
    for (const f of files) {
        try {
            fs.unlinkSync(path.join(tempPkgDir, f));
            console.log(`Deleted temp package file: ${f}`);
        } catch (e) {}
    }
}

const packagesJson = path.join(__dirname, '..', 'data', 'packages.json');
if (fs.existsSync(packagesJson)) {
    try {
        fs.writeFileSync(packagesJson, JSON.stringify({ packages: {} }, null, 2), 'utf-8');
        console.log('Reset data/packages.json to empty packages.');
    } catch (e) {}
}

console.log('\n--- Database clear completed successfully! ---');
