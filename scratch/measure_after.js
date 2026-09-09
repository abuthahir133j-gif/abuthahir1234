const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    const rootDir = path.join(__dirname, '..');
    const { initDatabase } = require(path.join(rootDir, 'src', 'main', 'db', 'sqlite'));
    const { initIpcHandlers } = require(path.join(rootDir, 'src', 'main', 'ipcHandlers'));
    initDatabase();
    initIpcHandlers();

    // Register get-cms-packages if not already present
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
        ipcMain.handle('load-student-session', async () => null);
        ipcMain.handle('list-local-experiences', async () => []);
    } catch (e) {}

    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
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

    console.log('\n================ TEST: LOAD DASHBOARD (INITIAL COLD LOAD) ================');
    const t0 = Date.now();
    await win.loadFile(path.join(rootDir, 'index.html'));
    await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const check = () => {
                if (document.readyState === 'complete' && window.travelBuddy && window.travelBuddy.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 20);
                }
            };
            check();
        })
    `);
    const tDashboardReady = Date.now() - t0;
    console.log(`[MEASURE] Initial Dashboard fully ready: ${tDashboardReady}ms`);

    // Verify initial avatar
    const initialAvatar = await win.webContents.executeJavaScript(`
        document.querySelector('.profile-avatar-img')?.src || 'none'
    `);
    console.log(`[MEASURE] Initial Dashboard avatar: ${initialAvatar}`);

    console.log('\n================ TEST 1: DASHBOARD -> PROFILE (DESKTOP SHELL) ================');
    const tProfileOpen = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const start = performance.now();
            window.openSubpage('profile.html');
            const frame = document.getElementById('subpage-view-frame');
            const checkLoaded = () => {
                try {
                    const frameDoc = frame.contentDocument || frame.contentWindow.document;
                    if (frameDoc && frameDoc.readyState === 'complete' && frameDoc.querySelector('#profile-avatar-img')) {
                        resolve(performance.now() - start);
                    } else {
                        setTimeout(checkLoaded, 10);
                    }
                } catch(e) {
                    setTimeout(checkLoaded, 10);
                }
            };
            checkLoaded();
        })
    `);
    console.log(`[MEASURE] Profile opened and ready in: ${tProfileOpen.toFixed(1)}ms`);

    console.log('\n================ TEST 2: CHANGE AVATAR IN PROFILE ================');
    const avatarUpdated = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const frame = document.getElementById('subpage-view-frame');
            const frameWin = frame.contentWindow;
            const frameDoc = frameWin.document;

            // Trigger avatar change
            const newAvatar = 'avatars/boy3.png';
            frameWin.localStorage.setItem('language_lab_selected_avatar_v1', newAvatar);

            // Trigger save button click or direct update
            if (typeof frameWin.parent?.updateDashboardAvatar === 'function') {
                frameWin.parent.updateDashboardAvatar(newAvatar);
            }

            const checkDashboard = document.querySelector('.profile-avatar-img');
            resolve({
                dashboardAvatarSrc: checkDashboard ? checkDashboard.src : null,
                isMatch: checkDashboard && checkDashboard.src.includes('boy3.png')
            });
        })
    `);
    console.log(`[MEASURE] Avatar change result:`, JSON.stringify(avatarUpdated));

    console.log('\n================ TEST 3: PROFILE -> BACK TO DASHBOARD ================');
    const tReturnTime = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const frame = document.getElementById('subpage-view-frame');
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            const backBtn = frameDoc.querySelector('.btn-back-map');

            const start = performance.now();
            if (backBtn) {
                backBtn.click();
            } else {
                window.closeSubpage();
            }

            // Measure how fast dashboard is visible and ready
            requestAnimationFrame(() => {
                const elapsed = performance.now() - start;
                const container = document.getElementById('subpage-view-container');
                const isHidden = container.classList.contains('hidden');
                const buddyAlive = Boolean(window.travelBuddy && window.travelBuddy.isInitialized);
                const mapBg = document.getElementById('map-bg');
                const mapLoaded = Boolean(mapBg && mapBg.complete && mapBg.naturalWidth > 0);
                const avatar = document.querySelector('.profile-avatar-img');

                resolve({
                    elapsedMs: elapsed,
                    isContainerHidden: isHidden,
                    isBuddyAlive: buddyAlive,
                    isMapLoaded: mapLoaded,
                    dashboardAvatar: avatar ? avatar.src : null
                });
            });
        })
    `);
    console.log(`[MEASURE] Dashboard RETURN RESULT:`, JSON.stringify(tReturnTime));
    console.log(`[MEASURE] Dashboard return time: ${tReturnTime.elapsedMs.toFixed(2)}ms (TARGET: < 5ms)!`);

    console.log('\n================ TEST 4: SECOND OPEN/CLOSE PROFILE (CACHED) ================');
    const tSecondCycle = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            const startOpen = performance.now();
            window.openSubpage('profile.html');
            const openElapsed = performance.now() - startOpen;

            const startClose = performance.now();
            window.closeSubpage();
            const closeElapsed = performance.now() - startClose;

            resolve({
                openElapsedMs: openElapsed,
                closeElapsedMs: closeElapsed
            });
        })
    `);
    console.log(`[MEASURE] Second open: ${tSecondCycle.openElapsedMs.toFixed(2)}ms | Second close/return: ${tSecondCycle.closeElapsedMs.toFixed(2)}ms`);

    console.log('\n================ TEST 5: DASHBOARD -> EVOLUTION -> DASHBOARD ================');
    const tEvoCycle = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            window.openSubpage('evolution.html');
            const frame = document.getElementById('subpage-view-frame');
            const check = () => {
                try {
                    const frameDoc = frame.contentDocument || frame.contentWindow.document;
                    if (frameDoc && frameDoc.readyState === 'complete') {
                        const startReturn = performance.now();
                        window.closeSubpage();
                        resolve({
                            returnMs: performance.now() - startReturn
                        });
                    } else {
                        setTimeout(check, 10);
                    }
                } catch(e) {
                    setTimeout(check, 10);
                }
            };
            check();
        })
    `);
    console.log(`[MEASURE] Evolution Chamber return time: ${tEvoCycle.returnMs.toFixed(2)}ms`);

    console.log('\n================ TEST 6: DASHBOARD -> NOTIFICATIONS -> DASHBOARD ================');
    const tNotifCycle = await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            window.openSubpage('notifications.html');
            const frame = document.getElementById('subpage-view-frame');
            const check = () => {
                try {
                    const frameDoc = frame.contentDocument || frame.contentWindow.document;
                    if (frameDoc && frameDoc.readyState === 'complete') {
                        const startReturn = performance.now();
                        window.closeSubpage();
                        resolve({
                            returnMs: performance.now() - startReturn
                        });
                    } else {
                        setTimeout(check, 10);
                    }
                } catch(e) {
                    setTimeout(check, 10);
                }
            };
            check();
        })
    `);
    console.log(`[MEASURE] Notifications return time: ${tNotifCycle.returnMs.toFixed(2)}ms`);

    console.log('\n================ ALL BENCHMARKS COMPLETE ================');
    app.quit();
});
