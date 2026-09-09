const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    const rootDir = path.join(__dirname, '..');
    const { initDatabase } = require(path.join(rootDir, 'src', 'main', 'db', 'sqlite'));
    const { initIpcHandlers } = require(path.join(rootDir, 'src', 'main', 'ipcHandlers'));
    initDatabase();
    initIpcHandlers();

    // Register get-cms-packages from main.js if not already registered
    try {
        ipcMain.handle('get-cms-packages', async (event, studentGradeOrCode) => {
            const { getLessonsForGrade, findUserByCode, ensureDefaultDataPopulated } = require(path.join(rootDir, 'src', 'main', 'db', 'sqlite'));
            let grade = studentGradeOrCode;
            if (studentGradeOrCode && typeof studentGradeOrCode === 'string') {
                const user = findUserByCode(studentGradeOrCode);
                if (user && user.grade) grade = user.grade;
            }
            let lessons = getLessonsForGrade(grade);
            if (!Array.isArray(lessons) || lessons.length === 0) {
                ensureDefaultDataPopulated();
                lessons = getLessonsForGrade(grade);
            }
            return lessons || [];
        });
    } catch (e) {}

    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(rootDir, 'preload.js')
        }
    });

    win.webContents.on('console-message', (event, level, message) => {
        if (message.includes('[CMS Integration]') || message.includes('[Game]') || message.includes('[PERF]')) {
            console.log(message);
        }
    });

    // Set auth in localStorage first
    await win.loadFile(path.join(rootDir, 'login.html'));
    await win.webContents.executeJavaScript(`
        localStorage.setItem('language_lab_authenticated', 'true');
        localStorage.setItem('language_lab_student_id_v1', 'STU-101');
        localStorage.setItem('language_lab_last_login_date_v1', new Date().toISOString().split('T')[0]);
        localStorage.setItem('currentUser', JSON.stringify({
            id: 'STU-101',
            name: 'Abuthahir',
            code: 'ABU001',
            grade: 'Class 7',
            roll_no: 'STU-101'
        }));
        sessionStorage.setItem('language_lab_app_session_v1', 'active');
    `);

    console.log('\n================ MEASURING INITIAL DASHBOARD LOAD ================');
    const t0 = Date.now();
    await win.loadFile(path.join(rootDir, 'index.html'));
    const tLoadDashboard = Date.now() - t0;
    console.log(`[MEASURE] Initial Dashboard loadFile resolved in: ${tLoadDashboard}ms`);

    // Wait until dashboard is completely ready
    await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const check = () => {
                if (document.readyState === 'complete' && window.travelBuddy && window.travelBuddy.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 30);
                }
            };
            check();
        })
    `);
    const tDashboardReady = Date.now() - t0;
    console.log(`[MEASURE] Initial Dashboard fully ready: ${tDashboardReady}ms`);

    console.log('\n================ NAVIGATING: DASHBOARD -> PROFILE ================');
    const tProfileStart = Date.now();
    await win.loadFile(path.join(rootDir, 'profile.html'));
    const tProfileLoaded = Date.now() - tProfileStart;
    console.log(`[MEASURE] Profile page loadFile in: ${tProfileLoaded}ms`);

    await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve);
        })
    `);
    console.log(`[MEASURE] Profile fully ready in: ${Date.now() - tProfileStart}ms`);

    // Change avatar
    await win.webContents.executeJavaScript(`
        localStorage.setItem('language_lab_selected_avatar_v1', 'avatars/boy3.png');
    `);
    console.log('[MEASURE] Avatar updated to avatars/boy3.png');

    console.log('\n================ NAVIGATING: PROFILE -> DASHBOARD (COLD RELOAD) ================');
    const tBackStart = Date.now();
    await win.loadFile(path.join(rootDir, 'index.html'));
    const tBackLoaded = Date.now() - tBackStart;
    console.log(`[MEASURE] Dashboard loadFile returned in: ${tBackLoaded}ms`);

    // Measure time until DOM is ready, TravelBuddy is initialized, and CMS packages finished
    const metrics = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const check = () => {
                const img = document.getElementById('map-bg');
                const isImgDecoded = img && img.complete && img.naturalWidth > 0;
                const isBuddyReady = window.travelBuddy && window.travelBuddy.isInitialized;
                const isDomReady = document.readyState === 'complete';
                const avatar = document.querySelector('.profile-avatar-img');
                const isAvatarUpdated = avatar && avatar.src.includes('boy3.png');

                if (isDomReady && isBuddyReady && isImgDecoded) {
                    resolve({
                        isBuddyReady,
                        isImgDecoded,
                        isAvatarUpdated,
                        avatarSrc: avatar ? avatar.src : null
                    });
                } else {
                    setTimeout(check, 20);
                }
            };
            check();
        })
    `);
    const tBackReady = Date.now() - tBackStart;
    console.log(`[MEASURE] Dashboard BACK navigation FULLY READY in: ${tBackReady}ms (~${(tBackReady / 1000).toFixed(2)}s)`);
    console.log(`[MEASURE] State metrics:`, JSON.stringify(metrics));

    console.log('\n================ TEST COMPLETE ================');
    app.quit();
});
