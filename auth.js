// ==========================================
// One Tutor - Separate Login Authentication Engine
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

document.addEventListener("DOMContentLoaded", () => {
    const rollInput = document.getElementById("roll-number-input");
    const submitBtn = document.getElementById("login-submit-btn");
    const authForm = document.getElementById("auth-form");

    // Clear input field by default when login page loads
    if (rollInput) {
        rollInput.value = "";
        if (submitBtn) submitBtn.disabled = true;
    }

    // 1. Check existing session (must be authenticated, active app session, and logged in today)
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const existingStudentId = localStorage.getItem(STUDENT_ID_KEY);
    const lastLoginDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);
    const isAppSessionActive = sessionStorage.getItem(APP_SESSION_KEY) === "active";
    const today = getTodayDateString();

    if (isAuthenticated && existingStudentId && isAppSessionActive && lastLoginDate === today) {
        window.location.href = "index.html";
        return;
    }

    // 2. Real-time Input Validation: Only enable Continue button when Roll Number is typed
    if (rollInput && submitBtn) {
        rollInput.addEventListener("input", () => {
            const val = rollInput.value.trim();
            submitBtn.disabled = val.length === 0;
        });
    }

    // 3. Handle Form Submission & Login Authentication
    function handleAuthentication() {
        if (!rollInput) return;
        const rollNumber = rollInput.value.trim();
        if (!rollNumber) return;

        const currentToday = getTodayDateString();

        // Save Authentication State, Student Roll Number, Daily Login Date & App Launch Session
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        localStorage.setItem(STUDENT_ID_KEY, rollNumber);
        localStorage.setItem(LAST_LOGIN_DATE_KEY, currentToday);
        sessionStorage.setItem(APP_SESSION_KEY, "active");
        sessionStorage.setItem("language_lab_just_logged_in", "true");

        // Smooth transition to World Map Dashboard
        window.location.href = "index.html";
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handleAuthentication();
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleAuthentication();
        });
    }
});

