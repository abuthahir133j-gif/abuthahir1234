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



    const errorBanner = document.getElementById("auth-error-banner");
    const errorMsgEl = document.getElementById("auth-error-msg");
    const enterSection = document.getElementById("authenticated-enter-section");
    const enterWorldBtn = document.getElementById("enter-world-btn");
    const switchAccountBtn = document.getElementById("switch-account-btn");
    const studentWelcomeName = document.getElementById("student-welcome-name");
    const studentWelcomeCode = document.getElementById("student-welcome-code");
    const cardTitle = document.querySelector(".card-title");
    const cardSubtitle = document.querySelector(".card-subtitle");

    function showError(msg) {
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
        if (errorBanner) {
            errorBanner.classList.add("hidden");
            errorBanner.style.display = "none";
        }
        const errorBox = document.querySelector('.error-box') || document.querySelector('[role="alert"]') || document.getElementById('error-message');
        if (errorBox) {
            errorBox.style.display = 'none';
        }
    }

    // =========================================================================
    // DYNAMIC ENTRY STORY VIDEO SELECTION BASED ON STUDENT PROGRESS
    // Zone 1 (Levels 1 to 5 + Boss 1):   AI/video/Entry.mp4
    // Zone 2 (Levels 6 to 10 + Boss 2):  AI/video/Entry 1.mp4
    // Zone 3 (Levels 11 to 15 + Boss 3): AI/video/Entry 2.mp4
    // Zone 4 (Levels 16 to 20 + Boss 4): AI/video/Entry 3.mp4
    // Zone 5 (Levels 21 to 25 + Boss 5): AI/video/Entry 4.mp4
    // Zone 6 (Levels 26 to 30 + Boss 6): AI/video/Entry 5.mp4
    // =========================================================================
    const PROGRESS_STORAGE_KEY = "language_lab_level_progress_v2";

    function getDynamicEntryVideo() {
        try {
            const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
            if (!raw) return { name: "Entry.mp4", path: "AI/video/Entry.mp4" };
            const progress = JSON.parse(raw);
            const unLvl = Number(progress.unlockedLevel) || 1;
            const stars = progress.stars || {};

            // Zone 6: Level 26 to 30 / Boss 6
            if (unLvl >= 26 || (stars["boss-5"] && stars["boss-5"] > 0)) {
                return { name: "Entry 5.mp4", path: "AI/video/Entry 5.mp4" };
            }
            // Zone 5: Level 21 to 25 / Boss 5
            if (unLvl >= 21 || (stars["boss-4"] && stars["boss-4"] > 0)) {
                return { name: "Entry 4.mp4", path: "AI/video/Entry 4.mp4" };
            }
            // Zone 4: Level 16 to 20 / Boss 4
            if (unLvl >= 16 || (stars["boss-3"] && stars["boss-3"] > 0)) {
                return { name: "Entry 3.mp4", path: "AI/video/Entry 3.mp4" };
            }
            // Zone 3: Level 11 to 15 / Boss 3
            if (unLvl >= 11 || (stars["boss-2"] && stars["boss-2"] > 0)) {
                return { name: "Entry 2.mp4", path: "AI/video/Entry 2.mp4" };
            }
            // Zone 2: Level 6 to 10 / Boss 2
            if (unLvl >= 6 || (stars["boss-1"] && stars["boss-1"] > 0)) {
                return { name: "Entry 1.mp4", path: "AI/video/Entry 1.mp4" };
            }
            // Zone 1: Level 1 to 5 / Boss 1
            return { name: "Entry.mp4", path: "AI/video/Entry.mp4" };
        } catch (e) {
            console.warn("[Story Cinematic] Error reading progress for entry video:", e);
            return { name: "Entry.mp4", path: "AI/video/Entry.mp4" };
        }
    }

    // =========================================================================
    // CINEMATIC STORY INTRO EXPERIENCE (Game Opening Sequence)
    // Flow: ENTER clicked -> Story video plays to REAL ended event -> Cinematic fade -> Dashboard
    // =========================================================================
    function startStoryIntro() {
        const targetVideoInfo = getDynamicEntryVideo();
        console.log(`[Story Cinematic] Initiating story intro with video: ${targetVideoInfo.path} (${targetVideoInfo.name})`);

        const cinematicContainer = document.getElementById("story-cinematic-container");
        const video = document.getElementById("story-video");
        const curtain = document.getElementById("cinematic-curtain");
        const loginPage = document.querySelector(".login-page-container");

        if (enterWorldBtn) {
            enterWorldBtn.disabled = true;
            enterWorldBtn.style.pointerEvents = "none";
        }

        if (!cinematicContainer || !video) {
            console.warn('[Story Cinematic] Video container or element missing. Transitioning directly to dashboard.');
            window.location.href = "index.html";
            return;
        }

        // 1. Prepare video element (no controls, playsinline, restart from beginning)
        video.currentTime = 0;
        video.removeAttribute("controls");
        video.style.pointerEvents = "none";

        // Build prioritized fallback candidate paths for this specific video
        const fallbackCandidates = [
            targetVideoInfo.path,
            `assets/${targetVideoInfo.path}`,
            targetVideoInfo.name,
            `assets/${targetVideoInfo.name}`,
            `AI/video/${targetVideoInfo.name}`,
            `assets/AI/video/${targetVideoInfo.name}`,
            // Universal fallbacks
            "AI/video/Entry.mp4",
            "assets/AI/video/Entry.mp4",
            "Entry.mp4",
            "assets/Entry.mp4"
        ];
        const uniqueCandidates = [...new Set(fallbackCandidates)];
        let fallbackIndex = 0;

        video.src = uniqueCandidates[fallbackIndex++];
        video.load();

        // 2. Hide Login UI and display cinematic full-window container
        if (loginPage) {
            loginPage.style.transition = "opacity 0.45s ease";
            loginPage.style.opacity = "0";
            loginPage.style.pointerEvents = "none";
        }

        cinematicContainer.classList.remove("hidden");
        cinematicContainer.setAttribute("aria-hidden", "false");

        // Start with black curtain active for smooth fade-in
        if (curtain) {
            curtain.classList.add("active-black");
        }

        let transitionInitiated = false;

        // Transition to existing game dashboard ONLY after video finishes or if load error
        function transitionToDashboard(reason) {
            if (transitionInitiated) return;
            transitionInitiated = true;

            console.log(`[Story Cinematic] Transitioning to Game Dashboard (${reason})...`);

            // Cinematic fade-out to black
            if (curtain) {
                curtain.classList.add("fade-out");
            }

            // Smooth transition delay to let black fade settle before loading existing dashboard
            setTimeout(() => {
                window.location.href = "index.html";
            }, 750);
        }

        // 3. LISTEN STRICTLY TO THE REAL 'ended' EVENT (Requirement 4)
        // No fixed setTimeout is used; the dashboard only appears after the video actually ends
        video.addEventListener("ended", () => {
            console.log('[Story Cinematic] Video ended event fired naturally.');
            transitionToDashboard("video_ended_naturally");
        }, { once: true });

        // 4. Robust Error Handling (Requirement 12)
        video.addEventListener("error", (errEvent) => {
            if (fallbackIndex < uniqueCandidates.length) {
                const nextSrc = uniqueCandidates[fallbackIndex++];
                console.log(`[Story Cinematic] Attempting video fallback source (${fallbackIndex}/${uniqueCandidates.length}): ${nextSrc}`);
                video.src = nextSrc;
                video.load();
                video.play().catch((fallbackErr) => {
                    console.warn(`[Story Cinematic] Fallback to ${nextSrc} deferred:`, fallbackErr);
                });
                return;
            }
            const err = video.error;
            console.error('[Story Cinematic] All candidate video sources exhausted:', err ? `Code ${err.code}: ${err.message}` : errEvent);
            transitionToDashboard("video_error_fallback");
        });

        // 5. Start playback after initial transition
        setTimeout(() => {
            if (curtain) {
                curtain.classList.remove("active-black");
            }

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`[Story Cinematic] Story video playing smoothly (${video.currentSrc || video.src}).`);
                }).catch((playErr) => {
                    console.warn('[Story Cinematic] Playback promise rejected (attempting muted fallback):', playErr);
                    // In case of any browser/Electron audio policy restriction, try muted autoplay
                    video.muted = true;
                    video.play().then(() => {
                        console.log('[Story Cinematic] Story video playing in muted fallback mode.');
                    }).catch((fatalErr) => {
                        console.error('[Story Cinematic] Fatal playback failure:', fatalErr);
                        transitionToDashboard("playback_failure");
                    });
                });
            }
        }, 200);
    }

    // =========================================================================
    // SHOW AUTHENTICATED "ENTER" ACTION STATE
    // =========================================================================
    function showAuthenticatedEnterState(studentUser) {
        hideError();

        if (authForm) {
            authForm.classList.add("hidden");
            authForm.style.display = "none";
        }

        if (enterSection) {
            enterSection.classList.remove("hidden");
        }

        if (cardTitle) {
            cardTitle.innerText = "Welcome Adventurer";
        }

        if (cardSubtitle) {
            cardSubtitle.innerText = "Your journey into the Language Lab awaits!";
        }

        const displayName = studentUser ? (studentUser.name || studentUser.roll_number || studentUser.code || 'Adventurer') : 'Adventurer';
        const displayCode = studentUser ? (studentUser.roll_number || studentUser.code || '') : '';

        if (studentWelcomeName) {
            studentWelcomeName.innerText = displayName;
        }

        if (studentWelcomeCode) {
            studentWelcomeCode.innerText = displayCode ? `LMS Code: ${displayCode}` : '';
        }

        // Preload dynamic entry story video for the student's progress
        const video = document.getElementById("story-video");
        if (video) {
            const targetVideoInfo = getDynamicEntryVideo();
            video.src = targetVideoInfo.path;
            video.load();
        }
    }

    // Reset back to code entry form
    function resetToLoginForm() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(STUDENT_ID_KEY);
        localStorage.removeItem("currentUser");
        localStorage.removeItem("language_lab_student_session_v1");
        sessionStorage.removeItem(APP_SESSION_KEY);

        if (enterSection) {
            enterSection.classList.add("hidden");
        }

        if (authForm) {
            authForm.classList.remove("hidden");
            authForm.style.display = "block";
        }

        if (cardTitle) {
            cardTitle.innerText = "Student Login";
        }

        if (cardSubtitle) {
            cardSubtitle.innerText = "Enter your LMS Login Code to begin";
        }

        if (lmsInput) {
            lmsInput.value = "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "Start Learning";
            }
            lmsInput.focus();
        }
    }

    // Wire ENTER WORLD button
    if (enterWorldBtn) {
        enterWorldBtn.addEventListener("click", (e) => {
            e.preventDefault();
            startStoryIntro();
        });
    }

    // Wire Switch Student Account button
    if (switchAccountBtn) {
        switchAccountBtn.addEventListener("click", (e) => {
            e.preventDefault();
            resetToLoginForm();
        });
    }

    // 1. Check existing active session
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const existingStudentId = localStorage.getItem(STUDENT_ID_KEY);
    const lastLoginDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);
    const isAppSessionActive = sessionStorage.getItem(APP_SESSION_KEY) === "active";
    const today = getTodayDateString();

    if (isAuthenticated && existingStudentId && isAppSessionActive && lastLoginDate === today) {
        let savedUser = null;
        try {
            savedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {}
        showAuthenticatedEnterState(savedUser || { roll_number: existingStudentId, name: existingStudentId });
        return;
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
            let loginPromise;
            if (window.api && typeof window.api.login === 'function') {
                loginPromise = window.api.login({ code: cleanCode });
            } else if (window.electron && window.electron.ipcRenderer) {
                loginPromise = window.electron.ipcRenderer.invoke('login-user', { code: cleanCode });
            } else {
                throw new Error('Electron IPC bridge is unavailable.');
            }

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 10000)
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
                sessionStorage.setItem("language_lab_login_event", JSON.stringify({
                    type: "LOGIN_SUCCESS",
                    studentId: cleanCode
                }));

                if (window.buddyEvents && typeof window.buddyEvents.emit === "function") {
                    window.buddyEvents.emit("LOGIN_SUCCESS", {
                        type: "LOGIN_SUCCESS",
                        studentId: cleanCode
                    });
                }

                if (window.electronAPI && typeof window.electronAPI.saveStudentSession === "function") {
                    window.electronAPI.saveStudentSession(activeSession).catch(err => console.warn('[Session] Save error:', err));
                }

                // Show authenticated ENTER action button
                showAuthenticatedEnterState(studentUser);
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
