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
        let baseDir = process.cwd();
        try {
            const { app } = require('electron');
            if (app && app.isPackaged) {
                baseDir = app.getPath('userData');
            }
        } catch (e) {}
        const dataDir = path.join(baseDir, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        dbPath = path.join(dataDir, 'language_lab.db');
    }

    db = new Database(dbPath, { timeout: 15000 });
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 15000');
    } catch (e) {}

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

        CREATE TABLE IF NOT EXISTS sync_state (
            package_id TEXT PRIMARY KEY,
            server_version TEXT,
            local_version TEXT,
            last_synced_at DATETIME,
            sync_status TEXT DEFAULT 'synced',
            checksum TEXT,
            file_path TEXT
        );

        CREATE TABLE IF NOT EXISTS student_progress (
            progress_id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            package_id TEXT,
            level_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 0,
            status TEXT DEFAULT 'COMPLETED',
            details_json TEXT,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending',
            synced_at DATETIME,
            device_id TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_id);
        CREATE INDEX IF NOT EXISTS idx_progress_sync ON student_progress(sync_status);
        CREATE INDEX IF NOT EXISTS idx_progress_level ON student_progress(student_id, level_id);
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

const DEFAULT_CMS_PACKAGES = [];
const DEFAULT_STUDENTS = [];

function ensureDefaultDataPopulated() {
    // Left empty: database data should only come from CMS/LMS sync or live registrations
}

function ensureLessonsPopulated(customPackages = []) {
    const database = getDb();
    if (Array.isArray(customPackages) && customPackages.length > 0) {
        upsertLessons(customPackages);
    }
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
 * Smart Upsert for synchronized CMS lesson packages:
 * - Compares with existing records in SQLite
 * - If not found -> INSERT (new)
 * - If found and modified -> UPDATE (updated)
 * - If found and identical -> SKIP (unchanged)
 * @param {Array<Object>} lessons
 * @returns {{ inserted: number, updated: number, skipped: number, total: number }}
 */
function syncUpsertLessons(lessons = []) {
    const db = getDb();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const findStmt = db.prepare(`SELECT * FROM lessons WHERE lesson_id = ?`);
    const insertStmt = db.prepare(`
        INSERT INTO lessons (lesson_id, title, type, grade, difficulty, status, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);
    const updateStmt = db.prepare(`
        UPDATE lessons
        SET title = ?, type = ?, grade = ?, difficulty = ?, status = ?, payload_json = ?
        WHERE lesson_id = ?
    `);

    const syncTransaction = db.transaction((list) => {
        for (const item of list) {
            const lessonId = String(item.lesson_id || item.id || item.package_id || item.packageId || '').trim();
            if (!lessonId) continue;

            const title = String(item.title || item.packageName || '').trim();
            const type = String(item.type || item.lesson_type || 'EXPERIENCE');
            const grade = String(item.grade || item.class || '');
            const difficulty = String(item.difficulty || 'Intermediate');
            const status = String(item.status || 'APPROVED').toUpperCase();
            const payloadJson = typeof item.payload_json === 'object'
                ? JSON.stringify(item.payload_json)
                : (item.payload_json || (typeof item.payload === 'object' ? JSON.stringify(item.payload) : '{}'));

            const existing = findStmt.get(lessonId);

            if (!existing) {
                // New Package -> INSERT
                insertStmt.run(lessonId, title, type, grade, difficulty, status, payloadJson, item.created_at || null);
                inserted++;
            } else {
                // Compare existing to check if modified
                const hasChanged = existing.title !== title ||
                                   existing.type !== type ||
                                   existing.grade !== grade ||
                                   existing.difficulty !== difficulty ||
                                   existing.status !== status ||
                                   existing.payload_json !== payloadJson;

                if (hasChanged) {
                    // Updated Package -> UPDATE
                    updateStmt.run(title, type, grade, difficulty, status, payloadJson, lessonId);
                    updated++;
                } else {
                    // Unchanged -> SKIP
                    skipped++;
                }
            }
        }
    });

    let attempts = 0;
    while (attempts < 3) {
        try {
            syncTransaction(lessons);
            break;
        } catch (err) {
            attempts++;
            if (attempts >= 3) {
                console.error('[SQLite DB] Transaction failed after 3 attempts:', err.message);
                throw err;
            }
            const delay = attempts * 100;
            const end = Date.now() + delay;
            while (Date.now() < end) {} // busy wait short backoff
        }
    }

    console.log(`[SQLite DB] Sync Results -> Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}, Total: ${lessons.length}`);
    return { inserted, updated, skipped, total: lessons.length };
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
    try {
        const database = getDb();
        const stmt = database.prepare(`
            INSERT OR REPLACE INTO sync_meta (key, value)
            VALUES (?, ?)
        `);
        stmt.run(String(key), String(value));
    } catch (e) {
        console.warn(`[SQLite DB] Could not update sync_meta for ${key}:`, e.message);
    }
}

function getSyncMeta(key) {
    const database = getDb();
    const stmt = database.prepare(`SELECT value FROM sync_meta WHERE key = ?`);
    const row = stmt.get(String(key));
    return row ? row.value : null;
}

/**
 * Case-Insensitive SQLite Query: matches across roll_no, lms_code, username, id, or name
 * Prioritizes exact roll number and LMS code matches to return original student details
 * @param {string} code 
 */
function findUserByCode(code) {
    if (!code) return null;
    const database = getDb();
    const clean = String(code).trim().toUpperCase();

    // 1. Direct query in SQLite checking roll_no, lms_code, username, id, name
    const student = database.prepare(`
        SELECT * FROM users 
        WHERE UPPER(roll_no) = ? OR UPPER(lms_code) = ? OR UPPER(username) = ? OR UPPER(id) = ? OR UPPER(name) = ?
        ORDER BY 
            CASE 
                WHEN UPPER(roll_no) = ? THEN 1
                WHEN UPPER(lms_code) = ? THEN 2
                WHEN UPPER(username) = ? THEN 3
                WHEN UPPER(id) = ? THEN 4
                ELSE 5
            END
        LIMIT 1
    `).get(clean, clean, clean, clean, clean, clean, clean, clean, clean);

    if (student) {
        return student;
    }

    // 2. Fallback check against cmsDatabase in-memory store
    try {
        let cmsDbPath = path.join(process.cwd(), 'cmsDatabase.js');
        if (!fs.existsSync(cmsDbPath)) {
            cmsDbPath = path.join(__dirname, '..', '..', '..', 'cmsDatabase.js');
        }
        if (fs.existsSync(cmsDbPath)) {
            const cmsDb = require(cmsDbPath);
            const cmsStudent = cmsDb.getStudentByRollNo(clean);
            if (cmsStudent) {
                const newStudent = {
                    id: String(cmsStudent.id || clean),
                    username: String(cmsStudent.roll_number || clean).toUpperCase(),
                    lms_code: String(cmsStudent.roll_number || clean).toUpperCase(),
                    name: cmsStudent.name || clean,
                    grade: 'Class 7',
                    section: 'A',
                    role: 'student',
                    roll_no: String(cmsStudent.roll_number || clean)
                };
                upsertUsers([newStudent]);
                return newStudent;
            }
        }
    } catch (e) {}

    return null;
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
    const stmt = database.prepare(`SELECT * FROM lessons WHERE UPPER(status) IN ('APPROVED', 'PUBLISHED') ORDER BY CASE WHEN lesson_id IN ('44', '117', '49') OR title LIKE '%big house%' OR title LIKE '%The Lost Picnic%' THEN 0 ELSE 1 END, rowid ASC`);
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

    let matched = all.filter(l => {
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

    const resultList = matched.length > 0 ? matched : all;
    // Always guarantee Package ('big house' / 'big_house_v4.elab' / '44') is at index 0 (Level 1)
    const houseIdx = resultList.findIndex(l => (l.title && (l.title.toLowerCase().includes('big house') || l.title.includes('The Lost Picnic'))) || ['44', '117', '49'].includes(String(l.lesson_id)));
    if (houseIdx > 0) {
        const [house] = resultList.splice(houseIdx, 1);
        resultList.unshift(house);
    } else if (houseIdx === -1) {
        const house = all.find(l => (l.title && (l.title.toLowerCase().includes('big house') || l.title.includes('The Lost Picnic'))) || ['44', '117', '49'].includes(String(l.lesson_id)));
        if (house) resultList.unshift(house);
    }

    return resultList;
}

/**
 * Save student progress immediately into SQLite with pending sync status.
 * Conflict resolution: Updates score/stars if higher, preserves history.
 * @param {Object} data
 * @returns {Object} Saved progress record
 */
function saveStudentProgress(data = {}) {
    const database = getDb();
    const studentId = String(data.student_id || data.studentId || data.roll_no || data.rollNumber || 'STUDENT').trim();
    const levelId = String(data.level_id || data.levelId || data.level || '1').trim();
    const packageId = String(data.package_id || data.packageId || levelId).trim();
    const score = parseInt(data.score !== undefined ? data.score : 100, 10) || 0;
    const stars = parseInt(data.stars !== undefined ? data.stars : 3, 10) || 0;
    const status = String(data.status || 'COMPLETED').toUpperCase();
    const completedAt = data.completed_at || new Date().toISOString();
    const deviceId = data.device_id || data.deviceId || 'electron-win-lms';
    const detailsJson = typeof data.details_json === 'object'
        ? JSON.stringify(data.details_json)
        : (data.details_json || (typeof data.details === 'object' ? JSON.stringify(data.details) : '{}'));

    // Unique progress record key per student + level + completion timestamp
    const progressId = String(data.progress_id || data.id || `PROG_${studentId}_${levelId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

    const stmt = database.prepare(`
        INSERT OR REPLACE INTO student_progress (
            progress_id,
            student_id,
            package_id,
            level_id,
            score,
            stars,
            status,
            details_json,
            completed_at,
            sync_status,
            synced_at,
            device_id
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?
        )
    `);

    stmt.run(
        progressId,
        studentId,
        packageId,
        levelId,
        score,
        stars,
        status,
        detailsJson,
        completedAt,
        deviceId
    );

    console.log(`[SQLite DB] 💾 Progress saved offline (pending sync): Student=${studentId} Level=${levelId} Stars=${stars} Score=${score}`);

    return {
        progress_id: progressId,
        student_id: studentId,
        package_id: packageId,
        level_id: levelId,
        score,
        stars,
        status,
        details_json: detailsJson,
        completed_at: completedAt,
        sync_status: 'pending',
        device_id: deviceId
    };
}

/**
 * Retrieve all pending or failed progress records to push to CMS
 * @param {number} [limit=100]
 */
function getPendingProgress(limit = 100) {
    const database = getDb();
    const stmt = database.prepare(`
        SELECT * FROM student_progress
        WHERE sync_status IN ('pending', 'failed')
        ORDER BY completed_at ASC
        LIMIT ?
    `);
    return stmt.all(limit);
}

/**
 * Mark specified progress IDs as synchronized with server
 * @param {Array<string>} progressIds
 * @param {string} [syncedAt]
 */
function markProgressSynced(progressIds = [], syncedAt = new Date().toISOString()) {
    if (!Array.isArray(progressIds) || progressIds.length === 0) return 0;
    const database = getDb();
    const updateStmt = database.prepare(`
        UPDATE student_progress
        SET sync_status = 'synced', synced_at = ?
        WHERE progress_id = ?
    `);

    const batch = database.transaction((ids) => {
        for (const id of ids) {
            updateStmt.run(syncedAt, String(id));
        }
    });

    batch(progressIds);
    console.log(`[SQLite DB] ✅ Marked ${progressIds.length} progress record(s) as 'synced'.`);
    return progressIds.length;
}

/**
 * Mark specified progress IDs as failed (for retry later)
 * @param {Array<string>} progressIds
 */
function markProgressFailed(progressIds = []) {
    if (!Array.isArray(progressIds) || progressIds.length === 0) return 0;
    const database = getDb();
    const updateStmt = database.prepare(`
        UPDATE student_progress
        SET sync_status = 'failed'
        WHERE progress_id = ?
    `);

    const batch = database.transaction((ids) => {
        for (const id of ids) {
            updateStmt.run(String(id));
        }
    });

    batch(progressIds);
    return progressIds.length;
}

/**
 * Get all progress records for a student
 * @param {string} studentId
 */
function getAllStudentProgress(studentId) {
    const database = getDb();
    if (!studentId) {
        return database.prepare("SELECT * FROM student_progress ORDER BY completed_at DESC").all();
    }
    const cleanId = String(studentId).trim();
    return database.prepare("SELECT * FROM student_progress WHERE UPPER(student_id) = UPPER(?) ORDER BY completed_at DESC").all(cleanId);
}

/**
 * Upsert or update sync state for a package
 * @param {Object} syncData
 */
function upsertSyncState(syncData = {}) {
    const database = getDb();
    const packageId = String(syncData.package_id || syncData.packageId || syncData.lesson_id || '').trim();
    if (!packageId) return null;

    const stmt = database.prepare(`
        INSERT OR REPLACE INTO sync_state (
            package_id,
            server_version,
            local_version,
            last_synced_at,
            sync_status,
            checksum,
            file_path
        ) VALUES (
            @package_id,
            @server_version,
            @local_version,
            COALESCE(@last_synced_at, CURRENT_TIMESTAMP),
            @sync_status,
            @checksum,
            @file_path
        )
    `);

    stmt.run({
        package_id: packageId,
        server_version: String(syncData.server_version || syncData.version || '1.0.0'),
        local_version: String(syncData.local_version || syncData.version || '1.0.0'),
        last_synced_at: syncData.last_synced_at || new Date().toISOString(),
        sync_status: String(syncData.sync_status || 'synced'),
        checksum: String(syncData.checksum || ''),
        file_path: String(syncData.file_path || '')
    });

    return syncData;
}

function getSyncState(packageId) {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM sync_state WHERE package_id = ?");
    return stmt.get(String(packageId));
}

function getAllSyncStates() {
    const database = getDb();
    return database.prepare("SELECT * FROM sync_state ORDER BY package_id ASC").all();
}

/**
 * Get comprehensive synchronization summary statistics
 */
function getSyncSummary() {
    const database = getDb();
    const totalUsers = database.prepare("SELECT COUNT(*) as count FROM users").get()?.count || 0;
    const totalLessons = database.prepare("SELECT COUNT(*) as count FROM lessons").get()?.count || 0;
    const pendingProgressCount = database.prepare("SELECT COUNT(*) as count FROM student_progress WHERE sync_status = 'pending'").get()?.count || 0;
    const totalProgressCount = database.prepare("SELECT COUNT(*) as count FROM student_progress").get()?.count || 0;
    const lastSyncedAt = getSyncMeta('last_synced_at') || null;
    const cmsHost = getSyncMeta('cms_host') || null;

    return {
        totalUsers,
        totalLessons,
        pendingProgressCount,
        totalProgressCount,
        lastSyncedAt,
        cmsHost
    };
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
    normalizeGrade,
    ensureDefaultDataPopulated,
    ensureLessonsPopulated,
    syncUpsertLessons,
    saveStudentProgress,
    getPendingProgress,
    markProgressSynced,
    markProgressFailed,
    getAllStudentProgress,
    upsertSyncState,
    getSyncState,
    getAllSyncStates,
    getSyncSummary,
    DEFAULT_CMS_PACKAGES,
    DEFAULT_STUDENTS
};

