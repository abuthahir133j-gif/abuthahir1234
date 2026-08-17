// ==========================================
// One Tutor - Single-Code Authentication Engine
// ==========================================

const AUTH_STORAGE_KEY = "language_lab_authenticated";
const STUDENT_ID_KEY = "language_lab_student_id_v1";
const LAST_LOGIN_DATE_KEY = "language_lab_last_login_date_v1";
const APP_SESSION_KEY = "language_lab_app_session_v1";

function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initConnectionStatusIndicator() {
    let container = document.getElementById("connection-status-badge");
    if (!container) {
        container = document.createElement("div");
        container.id = "connection-status-badge";
        container.className = "connection-status-badge";
        document.body.appendChild(container);
    }

    function updateStatus() {
        const isOnline = navigator.onLine;
        if (isOnline) {
            container.className = "connection-status-badge online";
            container.innerHTML = `<span class="connection-status-dot"></span><span>Online</span>`;
        } else {
            container.className = "connection-status-badge offline";
            container.innerHTML = `<span class="connection-status-dot"></span><span>Offline</span>`;
        }
    }

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    setInterval(updateStatus, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
    initConnectionStatusIndicator();
    const lmsInput = document.getElementById("roll-number-input");
    const submitBtn = document.getElementById("login-submit-btn");
    const authForm = document.getElementById("auth-form");

    // Clear input field by default when login page loads
    if (lmsInput) {
        lmsInput.value = "";
        if (submitBtn) submitBtn.disabled = true;
    }

    // 1. Check existing active session
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const existingStudentId = localStorage.getItem(STUDENT_ID_KEY);
    const lastLoginDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);
    const isAppSessionActive = sessionStorage.getItem(APP_SESSION_KEY) === "active";
    const today = getTodayDateString();

    if (isAuthenticated && existingStudentId && isAppSessionActive && lastLoginDate === today) {
        window.location.href = "index.html";
        return;
    }

    const errorBanner = document.getElementById("auth-error-banner");
    const errorMsgEl = document.getElementById("auth-error-msg");

    function showError(msg) {
        const errorBanner = document.getElementById("auth-error-banner");
        const errorMsgEl = document.getElementById("auth-error-msg");
        if (errorBanner && errorMsgEl) {
            errorMsgEl.innerText = msg || "Invalid LMS Code. Please check with your teacher.";
            errorBanner.classList.remove("hidden");
            errorBanner.style.display = "flex";
        }
        const errorBox = document.querySelector('.error-box') || document.querySelector('[role="alert"]') || document.getElementById('error-message');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
        } else if (!errorBanner && !errorMsgEl) {
            alert(msg);
        }
    }

    function hideError() {
        const errorBanner = document.getElementById("auth-error-banner");
        if (errorBanner) {
            errorBanner.classList.add("hidden");
            errorBanner.style.display = "none";
        }
        const errorBox = document.querySelector('.error-box') || document.querySelector('[role="alert"]') || document.getElementById('error-message');
        if (errorBox) {
            errorBox.style.display = 'none';
        }
    }

    // 2. Real-time Input Validation: Enable button when LMS Code is typed & clear error on edit/focus
    if (lmsInput && submitBtn) {
        lmsInput.addEventListener("input", () => {
            const val = lmsInput.value.trim();
            submitBtn.disabled = val.length === 0;
            hideError();
        });

        lmsInput.addEventListener("focus", () => {
            hideError();
        });
    }

    // 3. Single-Code Authentication Handler (Electron IPC)
    async function handleAuthentication(code) {
        hideError();

        // If code argument is missing or an Event object, read from roll-number-input
        if (code === undefined || code === null || typeof code !== 'string') {
            const input = document.getElementById("roll-number-input");
            code = input ? input.value : '';
        }

        const cleanCode = String(code || '').trim().toUpperCase();
        console.log('[Single-Code Auth] Attempting login with code:', cleanCode);

        if (!cleanCode) {
            showError('Please enter your LMS Login Code.');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Authenticating...";
        }

        try {
            // Delegate sync & auth entirely to Electron Main Process IPC.
            // Main process auto-loads CMS host from data/config.json with 2.5s fast timeout
            let loginPromise;
            if (window.api && typeof window.api.login === 'function') {
                loginPromise = window.api.login({ code: cleanCode });
            } else if (window.electron && window.electron.ipcRenderer) {
                loginPromise = window.electron.ipcRenderer.invoke('login-user', { code: cleanCode });
            } else {
                throw new Error('Electron IPC bridge is unavailable.');
            }

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 3500)
            );

            const result = await Promise.race([loginPromise, timeoutPromise]);

            console.log('[Single-Code Auth] Login response:', result);

            if (result && result.success) {
                const currentToday = getTodayDateString();
                const studentUser = result.user || { roll_number: cleanCode, code: cleanCode, name: cleanCode };

                // Save user session in localStorage
                localStorage.setItem('currentUser', JSON.stringify(studentUser));
                localStorage.setItem(AUTH_STORAGE_KEY, "true");
                localStorage.setItem(STUDENT_ID_KEY, cleanCode);
                localStorage.setItem(LAST_LOGIN_DATE_KEY, currentToday);

                const activeSession = {
                    roll_number: cleanCode,
                    lms_code: cleanCode,
                    student: studentUser,
                    token: "session_token_active",
                    lastLoginDate: currentToday
                };
                localStorage.setItem("language_lab_student_session_v1", JSON.stringify(activeSession));
                sessionStorage.setItem(APP_SESSION_KEY, "active");
                sessionStorage.setItem("language_lab_just_logged_in", "true");

                if (window.electronAPI && typeof window.electronAPI.saveStudentSession === "function") {
                    await window.electronAPI.saveStudentSession(activeSession);
                }

                // Redirect to Student Dashboard / Lessons view
                window.location.href = 'index.html';
            } else {
                showError(result.error || `Invalid LMS Code '${cleanCode}'. Please check with your teacher.`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Start Learning";
                }
            }
        } catch (err) {
            console.error('[Single-Code Auth] Login error:', err);
            showError('Failed to authenticate: ' + err.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Start Learning";
            }
        }
    }


    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const input = document.getElementById("roll-number-input");
            handleAuthentication(input ? input.value : '');
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("roll-number-input");
            handleAuthentication(input ? input.value : '');
        });
    }
});
