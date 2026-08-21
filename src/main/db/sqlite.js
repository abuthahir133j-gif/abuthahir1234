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
    
    // Auto-populate lessons and users if empty
    ensureDefaultDataPopulated();

    return db;
}

const DEFAULT_CMS_PACKAGES = [
    {
        lesson_id: "PKG-ENG-101",
        title: "Grammar Basics & Daily Vocabulary",
        type: "EXPERIENCE",
        grade: "Class 7",
        difficulty: "Beginner",
        status: "APPROVED",
        payload_json: {
            packageId: "PKG-ENG-101",
            packageName: "Grammar Basics & Daily Vocabulary",
            title: "Grammar Basics & Daily Vocabulary",
            description: "Foundational English grammar, nouns, verbs, and daily conversational vocabulary.",
            grade: "Class 7",
            status: "published",
            lessons: [
                { lessonId: "L1", title: "Greeting & Introductions", duration: "15 mins" },
                { lessonId: "L2", title: "Nouns & Action Verbs", duration: "20 mins" },
                { lessonId: "L3", title: "Daily Conversation Starters", duration: "25 mins" }
            ]
        }
    },
    {
        lesson_id: "PKG-ENG-102",
        title: "Advanced English Conversation & Dialogue",
        type: "EXPERIENCE",
        grade: "Class 7",
        difficulty: "Intermediate",
        status: "APPROVED",
        payload_json: {
            packageId: "PKG-ENG-102",
            packageName: "Advanced English Conversation & Dialogue",
            title: "Advanced English Conversation & Dialogue",
            description: "Interactive dialogue practice, sentence formation, and real-world travel conversations.",
            grade: "Class 7",
            status: "published",
            lessons: [
                { lessonId: "L4", title: "Travel Dialogue & Asking Directions", duration: "20 mins" },
                { lessonId: "L5", title: "Ordering Food & Polite Requests", duration: "25 mins" },
                { lessonId: "L6", title: "Storytelling & Expressing Opinions", duration: "30 mins" }
            ]
        }
    },
    {
        lesson_id: "PKG-ENG-103",
        title: "Language Masterclass: Fluency & Phonetics",
        type: "EXPERIENCE",
        grade: "Class 7",
        difficulty: "Advanced",
        status: "APPROVED",
        payload_json: {
            packageId: "PKG-ENG-103",
            packageName: "Language Masterclass: Fluency & Phonetics",
            title: "Language Masterclass: Fluency & Phonetics",
            description: "Master English phonetics, clear pronunciation, listening comprehension, and fluency drills.",
            grade: "Class 7",
            status: "published",
            lessons: [
                { lessonId: "L7", title: "Phonetics & Pronunciation Drills", duration: "20 mins" },
                { lessonId: "L8", title: "Listening Comprehension & Accents", duration: "25 mins" },
                { lessonId: "L9", title: "Public Speaking & Speech Mastery", duration: "35 mins" }
            ]
        }
    },
    {
        lesson_id: "PKG-ENG-104",
        title: "Travel English & Global Expressions",
        type: "EXPERIENCE",
        grade: "Class 7",
        difficulty: "Intermediate",
        status: "APPROVED",
        payload_json: {
            packageId: "PKG-ENG-104",
            packageName: "Travel English & Global Expressions",
            title: "Travel English & Global Expressions",
            description: "Practical language skills for airport navigation, hotel bookings, and global travel scenarios.",
            grade: "Class 7",
            status: "published",
            lessons: [
                { lessonId: "L10", title: "Airport & Transport Phrases", duration: "20 mins" },
                { lessonId: "L11", title: "Hotel & Accommodation Check-in", duration: "25 mins" },
                { lessonId: "L12", title: "Emergency & Assistance Dialogues", duration: "20 mins" }
            ]
        }
    },
    {
        lesson_id: "PKG-ENG-105",
        title: "Creative Writing & Advanced Comprehension",
        type: "EXPERIENCE",
        grade: "Class 7",
        difficulty: "Advanced",
        status: "APPROVED",
        payload_json: {
            packageId: "PKG-ENG-105",
            packageName: "Creative Writing & Advanced Comprehension",
            title: "Creative Writing & Advanced Comprehension",
            description: "Express creative thoughts, write descriptive paragraphs, and analyze engaging short stories.",
            grade: "Class 7",
            status: "published",
            lessons: [
                { lessonId: "L13", title: "Creative Storytelling & Descriptive Words", duration: "25 mins" },
                { lessonId: "L14", title: "Essay Structure & Logic Flow", duration: "30 mins" },
                { lessonId: "L15", title: "Grand Championship Quiz & Showcase", duration: "40 mins" }
            ]
        }
    }
];

const DEFAULT_STUDENTS = [
    { id: "1", username: "ABU001", lms_code: "ABU001", name: "Abuthahir", grade: "Class 7", section: "A", role: "student" },
    { id: "2", username: "ARJ001", lms_code: "ARJ001", name: "Arjun", grade: "Class 7", section: "A", role: "student" },
    { id: "3", username: "STU-101", lms_code: "STU-101", name: "Student STU-101", grade: "Class 7", section: "B", role: "student" },
    { id: "4", username: "STU-102", lms_code: "STU-102", name: "Student STU-102", grade: "Class 7", section: "B", role: "student" },
    { id: "5", username: "STU-103", lms_code: "STU-103", name: "Student STU-103", grade: "Class 7", section: "B", role: "student" },
    { id: "6", username: "101", lms_code: "101", name: "Student 101", grade: "Class 7", section: "C", role: "student" },
    { id: "7", username: "102", lms_code: "102", name: "Student 102", grade: "Class 7", section: "C", role: "student" },
    { id: "8", username: "103", lms_code: "103", name: "Student 103", grade: "Class 7", section: "C", role: "student" },
    { id: "9", username: "STUDENT1", lms_code: "STUDENT1", name: "Student One", grade: "Class 7", section: "A", role: "student" },
    { id: "10", username: "DEMO", lms_code: "DEMO", name: "Demo Student", grade: "Class 7", section: "A", role: "student" },
    { id: "11", username: "MAS002", lms_code: "MAS002", name: "Master Student 002", grade: "Class 7", section: "A", role: "student" }
];

function ensureDefaultDataPopulated() {
    try {
        const database = getDb();
        
        // 1. Check if lessons table is empty
        const lessonCount = database.prepare("SELECT COUNT(*) as count FROM lessons").get()?.count || 0;
        if (lessonCount === 0) {
            console.log("[SQLite DB] Seeding default CMS packages into SQLite lessons table...");
            
            // Try loading from data/packages.json first if available
            let loadedPackages = [];
            try {
                const pkgJsonPath = path.join(process.cwd(), 'data', 'packages.json');
                if (fs.existsSync(pkgJsonPath)) {
                    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                    if (raw && raw.packages) {
                        loadedPackages = Object.values(raw.packages).map((p, idx) => ({
                            lesson_id: p.packageId || `PKG-${idx + 1}`,
                            title: p.packageName || p.title || `Package ${idx + 1}`,
                            type: "EXPERIENCE",
                            grade: p.grade || "Class 7",
                            difficulty: p.difficulty || "Intermediate",
                            status: "APPROVED",
                            payload_json: p
                        }));
                    }
                }
            } catch (e) {}

            const packagesToSeed = (loadedPackages.length > 0) ? loadedPackages : DEFAULT_CMS_PACKAGES;
            upsertLessons(packagesToSeed);
            console.log(`[SQLite DB] Successfully populated ${packagesToSeed.length} CMS packages into lessons table.`);
        }

        // 2. Check if users table is empty
        const userCount = database.prepare("SELECT COUNT(*) as count FROM users").get()?.count || 0;
        if (userCount === 0) {
            console.log("[SQLite DB] Seeding default student users into SQLite users table...");
            upsertUsers(DEFAULT_STUDENTS);
        }
    } catch (err) {
        console.error("[SQLite DB] Error ensuring default data population:", err.message);
    }
}

function ensureLessonsPopulated(customPackages = []) {
    const database = getDb();
    if (Array.isArray(customPackages) && customPackages.length > 0) {
        upsertLessons(customPackages);
        return;
    }
    const lessonCount = database.prepare("SELECT COUNT(*) as count FROM lessons").get()?.count || 0;
    if (lessonCount === 0) {
        ensureDefaultDataPopulated();
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
    const stmt = database.prepare(`SELECT * FROM lessons WHERE UPPER(status) IN ('APPROVED', 'PUBLISHED') ORDER BY CASE WHEN title LIKE '%The Lost Picnic%' OR lesson_id = '49' THEN 0 ELSE 1 END, rowid ASC`);
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
    // Always guarantee 'The Lost Picnic' is Level 1 at index 0
    const picnicIdx = resultList.findIndex(l => (l.title && l.title.includes('The Lost Picnic')) || l.lesson_id === '49');
    if (picnicIdx > 0) {
        const [picnic] = resultList.splice(picnicIdx, 1);
        resultList.unshift(picnic);
    } else if (picnicIdx === -1) {
        const picnic = all.find(l => (l.title && l.title.includes('The Lost Picnic')) || l.lesson_id === '49');
        if (picnic) resultList.unshift(picnic);
    }

    return resultList;
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
    DEFAULT_CMS_PACKAGES,
    DEFAULT_STUDENTS
};
