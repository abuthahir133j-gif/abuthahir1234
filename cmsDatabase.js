const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "packages.json");

function ensureDataDirExists() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadDatabase() {
    try {
        ensureDataDirExists();
        if (!fs.existsSync(DB_FILE)) {
            const initialData = { packages: {} };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
            return initialData;
        }
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.packages) {
            return { packages: {} };
        }
        return parsed;
    } catch (error) {
        console.error("[cmsDatabase] Error loading database:", error);
        return { packages: {} };
    }
}

function saveDatabase(data) {
    try {
        ensureDataDirExists();
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
        return true;
    } catch (error) {
        console.error("[cmsDatabase] Error saving database:", error);
        throw new Error("Failed to write package to database storage");
    }
}

function getAllPackages() {
    const db = loadDatabase();
    return Object.values(db.packages || {});
}

function getPublishedPackages() {
    const db = loadDatabase();
    return Object.values(db.packages || {}).filter(pkg => String(pkg.status).toLowerCase() === "published");
}

function getPackageById(packageId) {
    if (!packageId) return null;
    const db = loadDatabase();
    return db.packages[packageId] || null;
}

function upsertPackage(pkgData) {
    const db = loadDatabase();
    const packageId = String(pkgData.packageId).trim();
    const now = new Date().toISOString();

    let isNew = false;
    let existingPkg = db.packages[packageId];

    if (!existingPkg) {
        isNew = true;
        db.packages[packageId] = {
            packageId: packageId,
            packageName: pkgData.packageName || "",
            description: pkgData.description || "",
            status: pkgData.status || "draft",
            lessons: Array.isArray(pkgData.lessons) ? pkgData.lessons : [],
            metadata: pkgData.metadata || pkgData.otherMetadata || {},
            createdAt: now,
            updatedAt: now
        };
    } else {
        isNew = false;
        db.packages[packageId] = {
            ...existingPkg,
            packageName: pkgData.packageName !== undefined ? pkgData.packageName : existingPkg.packageName,
            description: pkgData.description !== undefined ? pkgData.description : existingPkg.description,
            status: pkgData.status !== undefined ? pkgData.status : existingPkg.status,
            lessons: pkgData.lessons !== undefined ? (Array.isArray(pkgData.lessons) ? pkgData.lessons : existingPkg.lessons) : existingPkg.lessons,
            metadata: pkgData.metadata || pkgData.otherMetadata || existingPkg.metadata || {},
            updatedAt: now
        };
    }

    saveDatabase(db);
    return {
        isNew,
        package: db.packages[packageId]
    };
}

// In-Memory CMS Student Registry (No reliance on mock JSON files)
const cmsStudentsStore = {};

function loadStudentsDatabase() {
    return cmsStudentsStore;
}

function getStudentByRollNo(rollNo) {
    if (!rollNo) return null;
    const cleanRoll = String(rollNo).trim().toLowerCase();
    return cmsStudentsStore[cleanRoll] || null;
}

function registerStudent(rollNo, name) {
    if (!rollNo) return null;
    const cleanRoll = String(rollNo).trim().toLowerCase();
    const student = {
        id: Object.keys(cmsStudentsStore).length + 1,
        roll_number: String(rollNo).trim(),
        name: name || `Student ${rollNo}`
    };
    cmsStudentsStore[cleanRoll] = student;
    return student;
}

module.exports = {
    getAllPackages,
    getPublishedPackages,
    getPackageById,
    upsertPackage,
    loadDatabase,
    loadStudentsDatabase,
    getStudentByRollNo,
    registerStudent,
    DB_FILE
};
