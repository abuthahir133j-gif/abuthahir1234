const http = require("http");
const fs = require("fs");
const path = require("path");
const cmsDatabase = require("./cmsDatabase");

// Simple helper to load .env variables if process.env is not populated
function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, "utf-8");
            const lines = content.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                    const [key, ...valueParts] = trimmed.split("=");
                    const val = valueParts.join("=").trim();
                    if (key && !process.env[key.trim()]) {
                        process.env[key.trim()] = val;
                    }
                }
            }
        } catch (e) {
            console.error("[cmsServer] Error loading .env file:", e);
        }
    }
}

loadEnv();

const PORT = parseInt(process.env.CMS_PORT || "8000", 10);
const HOST = process.env.CMS_HOST || "0.0.0.0";
const EXPECTED_API_KEY = process.env.CMS_API_KEY || process.env.CMS_BEARER_TOKEN || "cms_secure_secret_key_12345";

function sendJSONResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    });
    res.end(JSON.stringify(data, null, 2));
}

function validateAuth(req) {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const apiKeyHeader = req.headers["x-api-key"] || req.headers["X-API-KEY"];

    let token = null;

    if (authHeader) {
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else {
            token = authHeader.trim();
        }
    } else if (apiKeyHeader) {
        token = String(apiKeyHeader).trim();
    }

    if (!token) return false;
    return token === EXPECTED_API_KEY;
}

const server = http.createServer((req, res) => {
    // Handle CORS Preflight OPTIONS
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, "");

    // Route: POST /api/auth/student, /api/v1/auth/student, /api/v1/lms/auth/student-login/ or /api/v1/lms/login/ or /api/lms/login
    if (req.method === "POST" && (pathname === "/api/auth/student" || pathname === "/api/v1/auth/student" || pathname === "/api/v1/lms/auth/student-login" || pathname === "/api/lms/auth/student-login" || pathname === "/api/v1/lms/login" || pathname === "/api/lms/login")) {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) {}
            const rollNo = data.roll_number || data.roll_no || data.rollNumber || "";
            const foundStudent = cmsDatabase.getStudentByRollNo(rollNo);

            if (!foundStudent) {
                console.warn(`[CMS Auth] Authentication rejected: Roll number '${rollNo}' not found in CMS database.`);
                return sendJSONResponse(res, 404, {
                    success: false,
                    error: "Wrong Student ID",
                    message: `Wrong Student ID. Roll number '${rollNo}' is not registered in CMS.`
                });
            }

            const dbPackages = cmsDatabase.getPublishedPackages() || [];
            return sendJSONResponse(res, 200, {
                success: true,
                token: "lms_access_token_mock_jwt_12345",
                access: "lms_access_token_mock_jwt_12345",
                refresh: "lms_refresh_token_mock_jwt_67890",
                student: {
                    student_id: foundStudent.id || 1,
                    id: foundStudent.id || 1,
                    roll_number: foundStudent.roll_number,
                    roll_no: foundStudent.roll_number,
                    name: foundStudent.name || foundStudent.roll_number,
                    school_id: 2
                },
                assigned_packages: dbPackages.map((pkg, idx) => ({
                    package_id: pkg.packageId || (idx + 1),
                    title: pkg.packageName || pkg.title || `Package ${pkg.packageId || (idx + 1)}`,
                    download_url: `/api/lms/packages/${pkg.packageId || (idx + 1)}/download/`
                }))
            });
        });
        return;
    }

    // Route: POST /api/lms/packages/check-updates/
    if (req.method === "POST" && (pathname === "/api/lms/packages/check-updates" || pathname === "/api/v1/lms/packages/check-updates")) {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            let payload = {};
            try { payload = JSON.parse(body); } catch (e) {}

            const dbPackages = cmsDatabase.getPublishedPackages();
            const clientPackages = Array.isArray(payload.packages) ? payload.packages : [];
            const updatesAvailable = [];

            dbPackages.forEach((pkg, idx) => {
                const expId = pkg.experience_id || pkg.packageId || (idx + 1);
                const clientPkg = clientPackages.find(cp => String(cp.experience_id || cp.package_id || cp.id) === String(expId));
                
                if (!clientPkg || clientPkg.version !== (pkg.version || "1.0.1")) {
                    updatesAvailable.push({
                        id: pkg.packageId || (idx + 10),
                        package_id: pkg.packageId || (idx + 2),
                        experience_id: expId,
                        title: pkg.packageName || pkg.title || `Package ${expId}`,
                        version: pkg.version || "1.0.1",
                        checksum: pkg.checksum || "a1b2c3d4e5f67890123456789abcdef0",
                        download_url: `/api/lms/packages/${pkg.packageId || (idx + 10)}/download/`,
                        package_size: pkg.size || 1542000
                    });
                }
            });

            if (updatesAvailable.length === 0 && clientPackages.length === 0) {
                updatesAvailable.push({
                    id: 10,
                    package_id: 2,
                    experience_id: 1,
                    title: "Grammar Basics & Vocabulary",
                    version: "1.0.1",
                    checksum: "a1b2c3d4e5f67890123456789abcdef0",
                    download_url: "/api/lms/packages/10/download/",
                    package_size: 1542000
                });
            }

            return sendJSONResponse(res, 200, {
                updates_available: updatesAvailable
            });
        });
        return;
    }

    // Route: GET /api/v1/lms/packages/ or /api/lms/packages/
    if (req.method === "GET" && (pathname === "/api/v1/lms/packages" || pathname === "/api/lms/packages" || pathname === "/api/v1/lms/published-packages" || pathname === "/api/cms/packages" || pathname === "/api/cms/packages/published")) {
        const dbPackages = cmsDatabase.getPublishedPackages();
        const formattedPackages = dbPackages.map((pkg, index) => ({
            id: pkg.packageId || (index + 1),
            package_id: pkg.packageId || (index + 1),
            experience_id: pkg.experience_id || pkg.packageId || (index + 1),
            version: pkg.version || "1.0.1",
            build_number: 1,
            title: pkg.packageName || pkg.title || `Package ${pkg.packageId}`,
            description: pkg.description || "Interactive Language Experience Lesson",
            download_url: `/api/lms/packages/${pkg.packageId || (index + 10)}/download/`,
            checksum: pkg.checksum || "a1b2c3d4e5f67890123456789abcdef0",
            size: pkg.size || 1542000,
            thumbnail: pkg.thumbnail || `http://${req.headers.host || 'localhost:5000'}/media/media_library/thumb.png`
        }));

        if (formattedPackages.length === 0) {
            formattedPackages.push({
                id: 10,
                package_id: 2,
                experience_id: 1,
                version: "1.0.1",
                build_number: 1,
                title: "Grammar Basics & Vocabulary",
                description: "Interactive Language Experience Lesson",
                download_url: "/api/lms/packages/10/download/",
                checksum: "a1b2c3d4e5f67890123456789abcdef0",
                size: 1542000,
                thumbnail: "student_avatar.png"
            });
        }

        return sendJSONResponse(res, 200, formattedPackages);
    }

    // Route: GET /api/lms/packages/{version_id}/download/ (.elab Package Download Stream)
    if (req.method === "GET" && (pathname.includes("/packages/") && pathname.endsWith("/download"))) {
        const parts = pathname.split("/");
        const packageId = parts[parts.indexOf("packages") + 1] || "10";
        
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${packageId}.elab"`,
            "X-Package-Checksum": "a1b2c3d4e5f67890123456789abcdef0",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "X-Package-Checksum"
        });

        const packageContent = JSON.stringify({
            id: packageId,
            scenarioId: packageId,
            experience_id: packageId,
            title: `Package ${packageId}`,
            type: "EXPERIENCE",
            version: "1.0.1",
            extractedAt: new Date().toISOString()
        }, null, 2);

        return res.end(Buffer.from(packageContent));
    }

    // Route: POST /api/v1/licensing/activate-server & deactivate-server
    if (req.method === "POST" && pathname === "/api/v1/licensing/activate-server") {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) {}
            return sendJSONResponse(res, 200, {
                success: true,
                message: "LMS Server activated successfully",
                serverName: data.serverName || "School-LMS-Server-1",
                licenseKey: data.licenseKey || "KEY-XXXX",
                status: "ACTIVE",
                activatedAt: new Date().toISOString()
            });
        });
        return;
    }

    if (req.method === "POST" && pathname === "/api/v1/licensing/deactivate-server") {
        return sendJSONResponse(res, 200, {
            success: true,
            message: "LMS Server deactivated successfully",
            status: "DEACTIVATED",
            deactivatedAt: new Date().toISOString()
        });
    }

    // Route: LMS Offline Sync & Analytics POST APIs (/api/lms/sync/)
    if (req.method === "POST" && pathname.startsWith("/api/lms/sync/")) {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) {}

            const subEndpoint = pathname.replace("/api/lms/sync/", "");
            console.log(`[CMS Server] Sync event received [${subEndpoint}]:`, data);

            return sendJSONResponse(res, 200, {
                success: true,
                endpoint: subEndpoint,
                syncedAt: new Date().toISOString(),
                status: "RECEIVED"
            });
        });
        return;
    }

    if (req.method === "GET" && (pathname === "/api/lms/sync/pull-updates" || pathname === "/api/v1/lms/sync/pull-updates")) {
        const dbPackages = cmsDatabase.getPublishedPackages();
        return sendJSONResponse(res, 200, {
            success: true,
            packages: dbPackages,
            pulledAt: new Date().toISOString()
        });
    }

    // Route: GET /api/v1/sync/bootstrap/ (Django CMS Bootstrap Users Sync)
    if (req.method === "GET" && (pathname === "/api/v1/sync/bootstrap" || pathname === "/api/v1/sync/bootstrap/")) {
        const studentsObj = cmsDatabase.loadStudentsDatabase();
        const usersList = Object.values(studentsObj).map((stu, index) => ({
            id: String(stu.id || index + 1),
            username: stu.roll_number || stu.username || `student_${index + 1}`,
            lms_code: stu.roll_number || stu.lms_code || stu.username || `ABU00${index + 1}`,
            password_hash: "pbkdf2_sha256$260000$mockhash123456",
            role: "student",
            name: stu.name || stu.roll_number,
            grade: "Class 7",
            section: "C"
        }));

        return sendJSONResponse(res, 200, {
            success: true,
            users: usersList
        });
    }

    // Route: GET /api/v1/sync/lessons/package/ (Django CMS Lessons Package Sync)
    if (req.method === "GET" && (pathname === "/api/v1/sync/lessons/package" || pathname === "/api/v1/sync/lessons/package/")) {
        const packages = cmsDatabase.getAllPackages() || [];
        let lessonsList = packages.map((pkg, idx) => ({
            lesson_id: String(pkg.packageId || `LESSON-${idx + 1}`),
            title: pkg.packageName || pkg.title || `Lesson ${idx + 1}`,
            type: "EXPERIENCE",
            status: String(pkg.status || "APPROVED").toUpperCase() === "DRAFT" ? "DRAFT" : "APPROVED",
            payload_json: JSON.stringify(pkg)
        }));

        if (lessonsList.length === 0) {
            lessonsList = [
                {
                    lesson_id: "LESSON-ENG-101",
                    title: "Grammar Basics & Vocabulary",
                    type: "EXPERIENCE",
                    status: "APPROVED",
                    payload_json: JSON.stringify({ description: "Foundational Grammar and Daily Vocabulary" })
                },
                {
                    lesson_id: "LESSON-ENG-102",
                    title: "Advanced English Conversation",
                    type: "EXPERIENCE",
                    status: "APPROVED",
                    payload_json: JSON.stringify({ description: "Interactive Conversation Practice" })
                }
            ];
        }

        return sendJSONResponse(res, 200, {
            success: true,
            lessons: lessonsList
        });
    }

    // Route: POST /api/cms/packages (Primary Webhook Endpoint from CMS)
    if (req.method === "POST" && pathname === "/api/cms/packages") {
        // 1. Request Authentication
        if (!validateAuth(req)) {
            return sendJSONResponse(res, 401, {
                success: false,
                message: "Unauthorized request: Invalid or missing API key / Bearer token"
            });
        }

        // 2. Read Request Body Data
        let body = "";
        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            let payload = null;

            // 3. Request Validation - Parse JSON
            try {
                payload = JSON.parse(body);
            } catch (err) {
                return sendJSONResponse(res, 400, {
                    success: false,
                    message: "Invalid request: Malformed JSON payload"
                });
            }

            if (!payload || typeof payload !== "object") {
                return sendJSONResponse(res, 400, {
                    success: false,
                    message: "Invalid request: Request body must be a JSON object"
                });
            }

            // 4. Required Fields Check
            const requiredFields = ["packageId", "packageName", "status", "lessons"];
            const missingFields = requiredFields.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === "");

            if (missingFields.length > 0) {
                return sendJSONResponse(res, 400, {
                    success: false,
                    message: `Missing required fields: ${missingFields.join(", ")}`
                });
            }

            if (!Array.isArray(payload.lessons)) {
                return sendJSONResponse(res, 400, {
                    success: false,
                    message: "Invalid request: lessons field must be an array"
                });
            }

            // 5. Database Logic (Duplicate Check & Upsert)
            try {
                const result = cmsDatabase.upsertPackage(payload);
                const statusCode = result.isNew ? 201 : 200;
                const actionMessage = result.isNew 
                    ? "Package published and created successfully in LMS database" 
                    : "Package updated successfully in LMS database";

                return sendJSONResponse(res, statusCode, {
                    success: true,
                    packageId: result.package.packageId,
                    message: actionMessage,
                    status: result.package.status,
                    isNew: result.isNew
                });
            } catch (dbError) {
                console.error("[cmsServer] Database error occurred:", dbError);
                return sendJSONResponse(res, 500, {
                    success: false,
                    message: `Database error: ${dbError.message || "Failed to process package"}`
                });
            }
        });

        req.on("error", (err) => {
            console.error("[cmsServer] Request stream error:", err);
            return sendJSONResponse(res, 400, {
                success: false,
                message: `Request error: ${err.message}`
            });
        });

        return;
    }

    // Route: POST /api/cms/students, /api/v1/students, /api/students (Register/Sync Student from CMS)
    if (req.method === "POST" && (pathname === "/api/cms/students" || pathname === "/api/v1/students" || pathname === "/api/students" || pathname === "/api/v1/lms/students")) {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) {}
            const rollNo = data.roll_number || data.roll_no || data.rollNumber || data.lms_login_code;
            const name = data.name || data.full_name || data.fullName;
            if (!rollNo) {
                return sendJSONResponse(res, 400, {
                    success: false,
                    message: "roll_number or roll_no is required"
                });
            }
            const student = cmsDatabase.registerStudent(rollNo, name);
            return sendJSONResponse(res, 201, {
                success: true,
                message: `Student '${rollNo}' registered successfully in CMS database.`,
                student: student
            });
        });
        return;
    }

    // Route: GET /api/cms/students, /api/v1/students
    if (req.method === "GET" && (pathname === "/api/cms/students" || pathname === "/api/v1/students" || pathname === "/api/students")) {
        const studentsObj = cmsDatabase.loadStudentsDatabase();
        return sendJSONResponse(res, 200, {
            success: true,
            students: Object.values(studentsObj)
        });
    }

    // 404 Route Not Found
    return sendJSONResponse(res, 404, {
        success: false,
        message: "Endpoint not found. Use POST /api/cms/packages to publish packages or POST /api/cms/students to register students."
    });
});

function startServer(port = PORT, host = HOST) {
    server.listen(port, host, () => {
        console.log(`[CMS Server] LMS Webhook Endpoint listening at http://${host}:${port}/api/cms/packages`);
    });
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = {
    startServer,
    server
};
