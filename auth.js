// ==========================================
// One Tutor - Separate Login Authentication Engine
// ==========================================

const AUTH_STORAGE_KEY = "language_lab_authenticated";
const STUDENT_ID_KEY = "language_lab_student_id_v1";

document.addEventListener("DOMContentLoaded", () => {
    const rollInput = document.getElementById("roll-number-input");
    const submitBtn = document.getElementById("login-submit-btn");
    const authForm = document.getElementById("auth-form");

    // 1. Check existing session (if already authenticated, redirect to dashboard map)
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const existingStudentId = localStorage.getItem(STUDENT_ID_KEY);

    if (isAuthenticated && existingStudentId) {
        window.location.href = "index.html";
        return;
    }

    // 2. Real-time Input Validation: Only enable Continue button when Roll Number is typed
    rollInput.addEventListener("input", () => {
        const val = rollInput.value.trim();
        submitBtn.disabled = val.length === 0;
    });

    // 3. Handle Form Submission & Login Authentication
    function handleAuthentication() {
        const rollNumber = rollInput.value.trim();
        if (!rollNumber) return;

        // Save Authentication State & Student Roll Number
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        localStorage.setItem(STUDENT_ID_KEY, rollNumber);

        // Smooth transition to World Map Dashboard
        window.location.href = "index.html";
    }

    submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleAuthentication();
    });

    authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleAuthentication();
    });
});
