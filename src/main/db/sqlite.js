const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize SQLite connection and database schema.
 * @param {string} [customPath] - Optional custom path for the database file.
 */
function initDatabase(customPath) {
    let dbPath = customPath;
    if (!dbPath) {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        dbPath = path.join(dataDir, 'language_lab.db');
    }

    db = new Database(dbPath, { timeout: 7000 });
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 7000');

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            name TEXT,
            grade TEXT,
            section TEXT,
            lms_code TEXT
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

    // Ensure columns exist if database was created with earlier schema
    try {
        const userCols = db.pragma('table_info(users)').map(c => c.name);
        if (!userCols.includes('lms_code')) {
            db.exec(`ALTER TABLE users ADD COLUMN lms_code TEXT;`);
        }
        if (!userCols.includes('roll_no')) {
            db.exec(`ALTER TABLE users ADD COLUMN roll_no TEXT;`);
        }
        const lessonCols = db.pragma('table_info(lessons)').map(c => c.name);
        if (!lessonCols.includes('grade')) {
            db.exec(`ALTER TABLE lessons ADD COLUMN grade TEXT;`);
        }
        if (!lessonCols.includes('difficulty')) {
            db.exec(`ALTER TABLE lessons ADD COLUMN difficulty TEXT;`);
        }
    } catch (e) {
        console.warn('[SQLite DB] Column migration notice:', e.message);
    }

    console.log(`[SQLite DB] Database initialized successfully at: ${dbPath}`);
    return db;
}

function getDb() {
    if (!db) {
        initDatabase();
    }
    return db;
}

/**
 * Batch insert or replace users into SQLite
 * @param {Array<Object>} users 
 */
function upsertUsers(users = []) {
    const database = getDb();

    try {
        const columns = database.pragma('table_info(users)').map(c => c.name);
        if (!columns.includes('roll_no')) {
            database.exec(`ALTER TABLE users ADD COLUMN roll_no TEXT;`);
        }
    } catch (e) {}

    const insert = database.prepare(`
        INSERT OR REPLACE INTO users (id, username, password_hash, role, name, grade, section, lms_code, roll_no)
        VALUES (@id, @username, @password_hash, @role, @name, @grade, @section, @lms_code, @roll_no)
    `);

    const insertMany = database.transaction((userList) => {
        for (const user of userList) {
            const usernameVal = String(user.lms_code || user.username || user.roll_number || user.roll_no || user.id || '');
            const idVal = String(user.id || user.user_id || usernameVal);

            insert.run({
                id: idVal,
                username: usernameVal,
                password_hash: String(user.password_hash || user.password || 'N/A'),
                role: String(user.role || 'STUDENT'),
                name: user.name || user.full_name || usernameVal,
                grade: user.grade || user.class || '',
                section: user.section || '',
                lms_code: String(user.lms_code || user.username || usernameVal),
                roll_no: user.roll_no || user.roll_number || ''
            });
        }
    });

    insertMany(users);
    console.log(`[SQLite DB] Upserted ${users.length} users successfully.`);
}

/**
 * Batch insert or replace approved lessons into SQLite
 * @param {Array<Object>} lessons 
 */
function upsertLessons(lessons = []) {
    const db = getDb();
    const insert = db.prepare(`
        INSERT OR REPLACE INTO lessons (
            lesson_id, 
            title, 
            type, 
            grade, 
            difficulty, 
            status, 
            payload_json, 
            created_at
        ) VALUES (
            @lesson_id, 
            @title, 
            @type, 
            @grade, 
            @difficulty, 
            @status, 
            @payload_json, 
            COALESCE(@created_at, CURRENT_TIMESTAMP)
        )
    `);

    const insertMany = db.transaction((list) => {
        for (const item of list) {
            insert.run({
                lesson_id: String(item.lesson_id || item.id || item.package_id || item.packageId || ''),
                title: item.title || item.packageName || '',
                type: item.type || item.lesson_type || 'Lesson',
                grade: item.grade || item.class || '',
                difficulty: item.difficulty || 'Intermediate',
                status: item.status || 'APPROVED',
                payload_json: typeof item.payload_json === 'object' ? JSON.stringify(item.payload_json) : (item.payload_json || (typeof item.payload === 'object' ? JSON.stringify(item.payload) : '{}')),
                created_at: item.created_at || null
            });
        }
    });

    insertMany(lessons);
    console.log(`[SQLite DB] Upserted ${lessons.length} lessons successfully.`);
}

/**
 * Student Lesson Query by Grade:
 * Retrieve lessons matching student's grade or universal lessons
 * @param {string} [grade]
 */
function getLessonsForStudent(grade) {
    const db = getDb();
    if (!grade) {
        return db.prepare("SELECT * FROM lessons WHERE status = 'APPROVED'").all();
    }
    return db.prepare("SELECT * FROM lessons WHERE status = 'APPROVED' AND (grade = ? OR grade = '' OR grade IS NULL)").all(grade);
}

/**
 * Insert or replace key-value metadata in sync_meta table
 */
function updateSyncMeta(key, value) {
    const database = getDb();
    const stmt = database.prepare(`
        INSERT OR REPLACE INTO sync_meta (key, value)
        VALUES (?, ?)
    `);
    stmt.run(String(key), String(value));
}

function getSyncMeta(key) {
    const database = getDb();
    const stmt = database.prepare(`SELECT value FROM sync_meta WHERE key = ?`);
    const row = stmt.get(String(key));
    return row ? row.value : null;
}

/**
 * Case-Insensitive SQLite Query: matches across username, id, or lms_code
 * @param {string} code 
 */
function findUserByCode(code) {
    if (!code) return null;
    const database = getDb();
    const clean = String(code).trim().toUpperCase();
    return database.prepare(`
        SELECT * FROM users 
        WHERE UPPER(username) = ? OR UPPER(id) = ? OR UPPER(lms_code) = ?
    `).get(clean, clean, clean) || null;
}

function findUserByLmsCode(code) {
    return findUserByCode(code);
}

function findUserByUsername(username) {
    return findUserByCode(username);
}

function getUsersCount() {
    const database = getDb();
    const stmt = database.prepare(`SELECT COUNT(*) as count FROM users`);
    const row = stmt.get();
    return row ? row.count : 0;
}

function getExistingLessonIds() {
    const database = getDb();
    const rows = database.prepare(`SELECT lesson_id FROM lessons`).all();
    return new Set(rows.map(r => String(r.lesson_id)));
}

/**
 * Filter out already existing packages and insert only new packages into SQLite
 * @param {Array<Object>} lessons 
 */
function insertNewLessonsOnly(lessons = []) {
    const existingIds = getExistingLessonIds();
    const newLessons = lessons.filter(l => {
        const id = String(l.lesson_id || l.id || l.package_id || l.packageId);
        return !existingIds.has(id);
    });

    const skippedCount = lessons.length - newLessons.length;

    if (newLessons.length > 0) {
        upsertLessons(newLessons);
        console.log(`[SQLite DB] Inserted ${newLessons.length} new lessons (Skipped ${skippedCount} already existing).`);
    } else {
        console.log(`[SQLite DB] Skipped all ${lessons.length} lessons (all already exist in SQLite).`);
    }

    return {
        total: lessons.length,
        inserted: newLessons.length,
        skipped: skippedCount,
        newLessons
    };
}

/**
 * Helper to normalize grade strings (e.g., 'Class 4', 'Grade 4', '4th', '4' -> '4')
 */
function normalizeGrade(gradeStr) {
    if (!gradeStr) return '';
    const clean = String(gradeStr).trim().toLowerCase();
    const digits = clean.replace(/[^0-9]/g, '');
    return digits || clean;
}

function getAllApprovedLessons() {
    const database = getDb();
    const stmt = database.prepare(`SELECT * FROM lessons WHERE UPPER(status) IN ('APPROVED', 'PUBLISHED') ORDER BY rowid ASC`);
    return stmt.all();
}

/**
 * Filter lessons for a specific student grade (e.g. "Class 4", "4")
 * @param {string} [grade] 
 */
function getLessonsForGrade(grade) {
    const all = getAllApprovedLessons();
    if (!grade) return all;

    const normTarget = normalizeGrade(grade);
    if (!normTarget) return all;

    const matched = all.filter(l => {
        let pkg = {};
        try {
            pkg = typeof l.payload_json === 'string' ? JSON.parse(l.payload_json) : (l.payload_json || {});
        } catch (e) {
            pkg = {};
        }

        const pkgGrade = l.grade || pkg.grade || pkg.class || pkg.target_grade || pkg.target_class || '';
        const normPkgGrade = normalizeGrade(pkgGrade);

        // Explicit grade match
        if (normPkgGrade && normPkgGrade === normTarget) {
            return true;
        }

        // Title or description mentions the grade
        const titleAndDesc = `${l.title || ''} ${pkg.description || ''} ${pkg.packageName || ''}`.toLowerCase();
        if (titleAndDesc.includes(`class ${normTarget}`) || titleAndDesc.includes(`grade ${normTarget}`) || titleAndDesc.includes(`class-${normTarget}`) || titleAndDesc.includes(`grade-${normTarget}`)) {
            return true;
        }

        // Universal package (no grade specified or marked 'all')
        if (!normPkgGrade || normPkgGrade === 'all') {
            return true;
        }

        return false;
    });

    return matched.length > 0 ? matched : all;
}

module.exports = {
    initDatabase,
    getDb,
    upsertUsers,
    upsertLessons,
    getLessonsForStudent,
    insertNewLessonsOnly,
    getExistingLessonIds,
    updateSyncMeta,
    getSyncMeta,
    findUserByCode,
    findUserByLmsCode,
    findUserByUsername,
    getUsersCount,
    getAllApprovedLessons,
    getLessonsForGrade,
    normalizeGrade
};
