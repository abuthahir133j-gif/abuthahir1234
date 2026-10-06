const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * In-memory active student CMS authentication session.
 * Access tokens and refresh tokens are strictly maintained in memory.
 * Raw token values are NEVER logged, printed, or exposed to renderer.
 */
let currentSession = {
    accessToken: null,
    refreshToken: null,
    rollNumber: null,
    studentId: null,
    userId: null,
    loginTimestamp: null
};

// Map of per-student cached sessions by normalized roll number for session separation
const studentSessions = new Map();

/**
 * Safely parse cookies from response Set-Cookie headers
 * @param {string|string[]} setCookieHeader
 * @param {string} cookieName
 * @returns {string|null}
 */
function extractCookieValue(setCookieHeader, cookieName) {
    if (!setCookieHeader) return null;
    const headerArr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const cookieStr of headerArr) {
        if (!cookieStr || typeof cookieStr !== 'string') continue;
        const parts = cookieStr.split(';');
        const nameVal = parts[0];
        if (nameVal && nameVal.includes('=')) {
            const [k, ...v] = nameVal.split('=');
            if (k.trim().toLowerCase() === cookieName.toLowerCase()) {
                return v.join('=').trim();
            }
        }
    }
    return null;
}

/**
 * Extract tokens and student metadata from CMS login response payload
 * Handles canonical { tokens: { access, refresh }, student: { id, user_id, roll_number } }
 * as well as standard JWT response variations.
 */
function extractTokensAndStudent(data, defaultRollNumber) {
    let accessToken = null;
    let refreshToken = null;
    let studentObj = null;

    if (data && typeof data === 'object') {
        if (data.tokens && typeof data.tokens === 'object') {
            accessToken = data.tokens.access || data.tokens.access_token || data.tokens.token || null;
            refreshToken = data.tokens.refresh || data.tokens.refresh_token || null;
        }
        if (!accessToken) {
            accessToken = data.access || data.access_token || data.token || null;
        }
        if (!refreshToken) {
            refreshToken = data.refresh || data.refresh_token || null;
        }
        if (data.student && typeof data.student === 'object') {
            studentObj = data.student;
        }
    }

    const rollNumber = String(
        studentObj?.roll_number ||
        studentObj?.roll_no ||
        data?.roll_number ||
        data?.roll_no ||
        defaultRollNumber ||
        ''
    ).trim();

    const studentId = studentObj?.id ?? studentObj?.student_id ?? null;
    const userId = studentObj?.user_id ?? studentObj?.userId ?? null;

    return {
        accessToken,
        refreshToken,
        rollNumber,
        studentId,
        userId,
        student: studentObj
    };
}

/**
 * Low-level HTTP / HTTPS request helper using Node.js core libraries.
 * Returns { statusCode, headers, body, data }
 */
function rawHttpRequest(reqPath, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const method = (options.method || 'GET').toUpperCase();
            const baseUrl = options.baseUrl || 'http://localhost:8000';
            const cleanBase = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
                ? baseUrl
                : `http://${baseUrl}`;

            const parsedBase = new URL(cleanBase);
            const isHttps = parsedBase.protocol === 'https:';
            const httpLib = isHttps ? https : http;
            const port = Number(parsedBase.port) || (isHttps ? 443 : 80);
            const timeoutMs = options.timeoutMs || 4000;

            const postData = options.body !== undefined
                ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
                : null;

            const reqHeaders = {
                'Accept': 'application/json',
                'Host': `${parsedBase.hostname}:${port}`,
                ...(options.headers || {})
            };

            if (postData !== null) {
                if (!reqHeaders['Content-Type']) {
                    reqHeaders['Content-Type'] = 'application/json';
                }
                reqHeaders['Content-Length'] = Buffer.byteLength(postData);
            }

            const cleanPath = reqPath.startsWith('/') ? reqPath : `/${reqPath}`;

            const reqOptions = {
                hostname: parsedBase.hostname,
                port: port,
                path: cleanPath,
                method: method,
                headers: reqHeaders,
                timeout: timeoutMs
            };

            const req = httpLib.request(reqOptions, (res) => {
                let responseBody = '';
                res.on('data', chunk => { responseBody += chunk; });
                res.on('end', () => {
                    let parsedJson = null;
                    if (responseBody) {
                        try {
                            parsedJson = JSON.parse(responseBody);
                        } catch (e) {
                            parsedJson = null;
                        }
                    }

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseBody,
                        data: parsedJson
                    });
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Network error (${parsedBase.hostname}:${port}): ${err.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Timeout (${timeoutMs}ms) connecting to ${parsedBase.hostname}:${port}`));
            });

            if (postData !== null) {
                req.write(postData);
            }
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Perform online CMS student login via POST /api/lms/login/
 * @param {string} rollNumber - Student's roll number
 * @param {string} [baseUrl] - CMS base URL
 * @returns {Promise<{ success: boolean, rollNumber?: string, studentId?: any, userId?: any, error?: string, statusCode?: number }>}
 */
async function loginStudentWithCms(rollNumber, baseUrl) {
    const cleanRoll = String(rollNumber || '').trim();
    if (!cleanRoll) {
        return { success: false, error: 'Student roll number is required for CMS login' };
    }

    console.log(`[CMS Auth] Initiating online authentication for roll number: ${cleanRoll}`);

    const candidateEndpoints = [
        '/api/lms/login/',
        '/api/lms/login'
    ];

    let lastError = null;
    let lastStatusCode = null;

    for (const ep of candidateEndpoints) {
        try {
            const response = await rawHttpRequest(ep, {
                method: 'POST',
                baseUrl,
                body: { roll_number: cleanRoll },
                headers: {
                    'Content-Type': 'application/json'
                },
                timeoutMs: 4000
            });

            lastStatusCode = response.statusCode;

            if (response.statusCode >= 200 && response.statusCode < 300 && response.data) {
                const extracted = extractTokensAndStudent(response.data, cleanRoll);

                if (!extracted.accessToken) {
                    return {
                        success: false,
                        error: 'CMS login response missing access token',
                        statusCode: response.statusCode
                    };
                }

                const loginTimestamp = new Date().toISOString();
                const sessionRecord = {
                    accessToken: extracted.accessToken,
                    refreshToken: extracted.refreshToken,
                    rollNumber: extracted.rollNumber || cleanRoll,
                    studentId: extracted.studentId,
                    userId: extracted.userId,
                    loginTimestamp
                };

                // Store in memory
                currentSession = { ...sessionRecord };
                studentSessions.set(cleanRoll.toUpperCase(), { ...sessionRecord });

                console.log(`[CMS Auth] ✅ Online authentication successful for student '${cleanRoll}' (User ID: ${extracted.userId || 'N/A'})`);

                return {
                    success: true,
                    rollNumber: sessionRecord.rollNumber,
                    studentId: sessionRecord.studentId,
                    userId: sessionRecord.userId,
                    loginTimestamp
                };
            } else if (response.statusCode === 404 && ep !== candidateEndpoints[candidateEndpoints.length - 1]) {
                continue; // Try next candidate endpoint
            } else {
                const errMsg = response.data?.detail || response.data?.error || response.data?.message || `HTTP ${response.statusCode}`;
                lastError = new Error(`CMS login failed: ${errMsg}`);
                break;
            }
        } catch (err) {
            lastError = err;
        }
    }

    console.warn(`[CMS Auth] ⚠️ Online login deferred for '${cleanRoll}': ${lastError ? lastError.message : 'Unavailable'}`);
    return {
        success: false,
        error: lastError ? lastError.message : 'CMS login failed',
        statusCode: lastStatusCode
    };
}

/**
 * Refresh access token using stored refresh token via POST /api/auth/refresh/
 * The refresh token is sent strictly in the Cookie header (refresh_token=<token>), NOT in the body.
 * @param {string} [baseUrl] - CMS base URL
 * @param {string} [rollNumber] - Optional roll number to refresh
 * @returns {Promise<{ success: boolean, rotated?: boolean, error?: string, statusCode?: number }>}
 */
async function refreshAccessToken(baseUrl, rollNumber) {
    const targetRoll = String(rollNumber || currentSession.rollNumber || '').trim().toUpperCase();
    const storedSession = targetRoll ? (studentSessions.get(targetRoll) || currentSession) : currentSession;
    const refreshToken = storedSession.refreshToken;

    if (!refreshToken) {
        return { success: false, error: 'No refresh token available for session' };
    }

    console.log(`[CMS Auth] Refreshing access token via /api/auth/refresh/ for student: ${storedSession.rollNumber || 'current'}`);

    const candidateEndpoints = [
        '/api/auth/refresh/',
        '/api/auth/refresh'
    ];

    let lastError = null;
    let lastStatusCode = null;

    for (const ep of candidateEndpoints) {
        try {
            const response = await rawHttpRequest(ep, {
                method: 'POST',
                baseUrl,
                body: {}, // Refresh token is NOT sent in JSON body
                headers: {
                    'Cookie': `refresh_token=${refreshToken}`,
                    'Content-Type': 'application/json'
                },
                timeoutMs: 4000
            });

            lastStatusCode = response.statusCode;

            if (response.statusCode >= 200 && response.statusCode < 300 && response.data) {
                const newAccessToken = response.data.access || response.data.tokens?.access || response.data.access_token;
                if (!newAccessToken) {
                    return { success: false, error: 'Refresh response missing access token', statusCode: response.statusCode };
                }

                // Check for rotated refresh token in Set-Cookie header
                const rotatedRefreshToken = extractCookieValue(response.headers['set-cookie'], 'refresh_token') || response.data.refresh || response.data.tokens?.refresh;

                storedSession.accessToken = newAccessToken;
                if (rotatedRefreshToken) {
                    storedSession.refreshToken = rotatedRefreshToken;
                }

                currentSession.accessToken = newAccessToken;
                if (rotatedRefreshToken) {
                    currentSession.refreshToken = rotatedRefreshToken;
                }

                if (targetRoll) {
                    studentSessions.set(targetRoll, { ...storedSession });
                }

                console.log(`[CMS Auth] ✅ Access token refreshed successfully${rotatedRefreshToken ? ' (with rotated refresh token)' : ''}`);
                return { success: true, rotated: Boolean(rotatedRefreshToken) };
            } else if (response.statusCode === 404 && ep !== candidateEndpoints[candidateEndpoints.length - 1]) {
                continue;
            } else {
                const errMsg = response.data?.detail || response.data?.error || `HTTP ${response.statusCode}`;
                lastError = new Error(`Token refresh failed: ${errMsg}`);
                break;
            }
        } catch (err) {
            lastError = err;
        }
    }

    console.warn(`[CMS Auth] ⚠️ Token refresh failed: ${lastError ? lastError.message : 'Error'}`);
    return {
        success: false,
        error: lastError ? lastError.message : 'Token refresh failed',
        statusCode: lastStatusCode
    };
}

/**
 * Get active access token, refreshing or logging in if needed
 * @param {string} [baseUrl]
 * @param {string} [rollNumber]
 * @returns {Promise<string|null>}
 */
async function ensureValidAccessToken(baseUrl, rollNumber) {
    const targetRoll = String(rollNumber || currentSession.rollNumber || '').trim();
    const targetRollUpper = targetRoll.toUpperCase();

    // 1. Check existing in-memory active session token
    const stored = targetRollUpper ? (studentSessions.get(targetRollUpper) || currentSession) : currentSession;
    if (stored && stored.accessToken && (!targetRollUpper || stored.rollNumber?.toUpperCase() === targetRollUpper)) {
        return stored.accessToken;
    }

    // 2. If refresh token exists, attempt refresh
    if (stored && stored.refreshToken) {
        const refreshResult = await refreshAccessToken(baseUrl, targetRoll);
        if (refreshResult.success && stored.accessToken) {
            return stored.accessToken;
        }
    }

    // 3. Fallback: attempt re-login using roll number
    if (targetRoll) {
        const loginResult = await loginStudentWithCms(targetRoll, baseUrl);
        if (loginResult.success && currentSession.accessToken) {
            return currentSession.accessToken;
        }
    }

    return null;
}

/**
 * Returns current access token from memory (or null)
 */
function getAccessToken(rollNumber) {
    if (rollNumber) {
        const stored = studentSessions.get(String(rollNumber).trim().toUpperCase());
        return stored?.accessToken || (currentSession.rollNumber?.toUpperCase() === String(rollNumber).trim().toUpperCase() ? currentSession.accessToken : null);
    }
    return currentSession.accessToken;
}

/**
 * Clear in-memory CMS authentication session (on logout or student switch)
 */
function clearCmsSession() {
    currentSession = {
        accessToken: null,
        refreshToken: null,
        rollNumber: null,
        studentId: null,
        userId: null,
        loginTimestamp: null
    };
    studentSessions.clear();
    console.log('[CMS Auth] CMS session credentials cleared from memory.');
}

/**
 * Set or switch the active logged-in student.
 * Discards previous student credentials when a different student logs in.
 */
function setActiveStudent(rollNumber, studentData = {}) {
    const clean = String(rollNumber || '').trim();
    if (!clean) return;

    const cleanUpper = clean.toUpperCase();

    if (currentSession.rollNumber && currentSession.rollNumber.toUpperCase() !== cleanUpper) {
        console.log(`[CMS Auth] Student session switch: '${currentSession.rollNumber}' -> '${clean}'. Discarding previous active tokens.`);
        currentSession = {
            accessToken: null,
            refreshToken: null,
            rollNumber: clean,
            studentId: studentData.id || studentData.student_id || null,
            userId: studentData.user_id || studentData.userId || null,
            loginTimestamp: null
        };

        if (studentSessions.has(cleanUpper)) {
            const cached = studentSessions.get(cleanUpper);
            currentSession = { ...cached };
        }
    } else {
        currentSession.rollNumber = clean;
        if (studentData.id !== undefined) currentSession.studentId = studentData.id;
        if (studentData.user_id !== undefined) currentSession.userId = studentData.user_id;
    }
}

/**
 * Get the currently active student session metadata (never exposes raw token strings)
 */
function getActiveStudentSession() {
    return {
        hasAccessToken: Boolean(currentSession.accessToken),
        hasRefreshToken: Boolean(currentSession.refreshToken),
        rollNumber: currentSession.rollNumber,
        studentId: currentSession.studentId,
        userId: currentSession.userId,
        loginTimestamp: currentSession.loginTimestamp
    };
}

function getActiveRollNumber() {
    return currentSession.rollNumber;
}

/**
 * Execute an authenticated HTTP request using the student's dynamic JWT.
 * Automatically handles 401 Unauthorized responses with token refresh + login fallback and 1 retry.
 *
 * @param {string} reqPath - API path (e.g. /api/progress/sync/ or /api/progress/)
 * @param {Object} options - { method, baseUrl, payload, headers, rollNumber, timeoutMs, _retryCount }
 * @returns {Promise<any>} Parsed JSON response
 */
async function authenticatedRequest(reqPath, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const baseUrl = options.baseUrl;
    const targetRoll = String(options.rollNumber || currentSession.rollNumber || '').trim();
    const retryCount = options._retryCount || 0;

    // 1. Ensure we have an access token for this student
    const token = await ensureValidAccessToken(baseUrl, targetRoll);
    if (!token) {
        throw new Error(`CMS authentication unavailable for student '${targetRoll || 'unknown'}'`);
    }

    const authHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
    };

    // 2. Perform request
    const response = await rawHttpRequest(reqPath, {
        method,
        baseUrl,
        body: options.payload,
        headers: authHeaders,
        timeoutMs: options.timeoutMs || 4000
    });

    // 3. Handle 401 Unauthorized expiration
    if (response.statusCode === 401 && retryCount < 1) {
        console.warn(`[CMS Auth] HTTP 401 for ${reqPath}. Attempting token refresh...`);

        let refreshed = false;

        // Try refresh token first
        const refreshResult = await refreshAccessToken(baseUrl, targetRoll);
        if (refreshResult.success) {
            refreshed = true;
        } else if (targetRoll) {
            console.log(`[CMS Auth] Refresh token expired/failed. Falling back to re-login for roll number '${targetRoll}'...`);
            const loginResult = await loginStudentWithCms(targetRoll, baseUrl);
            if (loginResult.success) {
                refreshed = true;
            }
        }

        if (refreshed) {
            console.log(`[CMS Auth] Re-authentication successful. Retrying original request to ${reqPath} (attempt 1/1)...`);
            return authenticatedRequest(reqPath, {
                ...options,
                _retryCount: retryCount + 1
            });
        }

        throw new Error(`CMS Authentication failed (HTTP 401: Token invalid or expired)`);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data || { success: true, raw: response.body };
    }

    if (response.statusCode === 401 || response.statusCode === 403) {
        throw new Error(`CMS Authentication failed (HTTP ${response.statusCode})`);
    }

    throw new Error(`CMS returned HTTP ${response.statusCode}: ${response.body ? response.body.substring(0, 120) : ''}`);
}

module.exports = {
    loginStudentWithCms,
    getAccessToken,
    refreshAccessToken,
    ensureValidAccessToken,
    clearCmsSession,
    setActiveStudent,
    getActiveStudentSession,
    getActiveRollNumber,
    authenticatedRequest,
    extractCookieValue,
    extractTokensAndStudent,
    rawHttpRequest
};
