const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('node:path');
const fs = require('fs');
const sudo = require('sudo-prompt');
const { spawn } = require('child_process');

// --- Rutas de Archivos ---
const userDataPath = app.getPath('userData');
const tasksFilePath = path.join(userDataPath, 'tasks.json');
const blocklistFilePath = path.join(userDataPath, 'blocklist.json');
const hostsPath = process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';
const hostsBackupPath = path.join(userDataPath, 'hosts.backup');

// --- Variables Globales ---
let mainWindow;
let pythonProcess = null;
let is_distracted = false;
let distractionStartTimer = null;
let alertLoopInterval = null;
const distraction_config = {
    time_limit: 4 // segundos
};

const studyMethods = {
    pomodoro: { work: 25 * 60, rest: 5 * 60, longRest: 15 * 60 },
    rule5217: { work: 52 * 60, rest: 17 * 60 },
    method9030: { work: 90 * 60, rest: 30 * 60 },
    method4515: { work: 45 * 60, rest: 15 * 60 },
    deepWork: { work: 120 * 60, rest: 30 * 60 }
};
let timerId = null, currentMethod = studyMethods.pomodoro, currentPhase = 'work', timeLeft = currentMethod.work, totalTimeInPhase = currentMethod.work, isRunning = false, pomodoroCount = 0;

// --- Funciones de Archivos, Permisos y Bloqueador ---
function readDataFromFile(filePath, defaultValue = []) { try { if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8')); return defaultValue; } catch (error) { return defaultValue; } }
function saveDataToFile(filePath, data) { try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (error) { console.error(`Error saving ${filePath}:`, error); } }
function executeSudoCommand(command, name = 'FOCUSAIDE') { return new Promise((resolve, reject) => { sudo.exec(command, { name: name }, (error) => { if (error) { console.error('Sudo Prompt Error:', error); showNotification('Error de Permisos', 'No se pudieron aplicar los cambios de bloqueo.'); reject(error); } else { resolve(); } }); }); }
async function applyBlocklist() { console.log("Intentando aplicar bloqueo..."); const sitesToBlock = readDataFromFile(blocklistFilePath, []); if (sitesToBlock.length === 0) return; try { const originalHosts = fs.readFileSync(hostsPath, 'utf8'); if (!fs.existsSync(hostsBackupPath)) fs.writeFileSync(hostsBackupPath, originalHosts); const blockLines = sitesToBlock.map(site => `127.0.0.1 ${site}\n127.0.0.1 www.${site}`).join('\n'); let newHostsContent = originalHosts.replace(/# FOCUSAIDE Block Start[\s\S]*# FOCUSAIDE Block End\n?/g, '').trim(); newHostsContent += `\n\n# FOCUSAIDE Block Start\n${blockLines}\n# FOCUSAIDE Block End`; const tempFilePath = path.join(userDataPath, 'hosts.temp'); fs.writeFileSync(tempFilePath, newHostsContent); const command = process.platform === 'win32' ? `copy "${tempFilePath}" "${hostsPath}"` : `cp "${tempFilePath}" "${hostsPath}"`; await executeSudoCommand(command); console.log("Bloqueo aplicado."); } catch (e) { console.error("Error aplicando bloqueo:", e); } }
async function removeBlocklist() { console.log("Intentando quitar bloqueo..."); if (!fs.existsSync(hostsBackupPath)) return; try { const backupContent = fs.readFileSync(hostsBackupPath, 'utf8'); const tempFilePath = path.join(userDataPath, 'hosts.temp'); fs.writeFileSync(tempFilePath, backupContent); const command = process.platform === 'win32' ? `copy "${tempFilePath}" "${hostsPath}"` : `cp "${tempFilePath}" "${hostsPath}"`; await executeSudoCommand(command, 'FOCUSAIDE Cleanup'); fs.unlinkSync(hostsBackupPath); console.log("Bloqueo quitado."); } catch (e) { console.error("Error quitando bloqueo:", e); } }

// --- LÓGICA para el Detector de Distracción (vía Stdout) ---

function startPythonEngine() {
    if (pythonProcess) return;

    // Definimos el nuevo nombre del ejecutable
    const engineExecutable = 'fca_tracker_svc.exe';

    const isPackaged = app.isPackaged;
    const enginePath = isPackaged
        ? path.join(process.resourcesPath, 'app', 'engine', engineExecutable)
        : path.join(__dirname, 'engine', engineExecutable);

    console.log(`Iniciando servicio desde: ${enginePath}`);
    
    if (!fs.existsSync(enginePath)) {
        console.error(`Error: El servicio del tracker (${engineExecutable}) no se encuentra.`);
        return;
    }

    pythonProcess = spawn(enginePath);

    pythonProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        const lines = message.split('\n');
        for (const line of lines) {
            if (line.startsWith('{')) {
                try {
                    const jsonData = JSON.parse(line);
                    if (jsonData.error && jsonData.error.includes('HAL_LAYER_VI_FAILURE')) {
                        new Notification({
                            title: "FocusAide Engine",
                            body: "No se pudo inicializar el stream de video. Verifica que la cámara no esté en uso y que los controladores estén actualizados. (HAL_VI_FAIL)"
                        }).show();
                    } else {
                        handleEngineData(jsonData);
                    }
                } catch (e) { console.error('Error parseando JSON de Python:', line); }
            } else {
                 console.log(`[Python Service]: ${line}`);
            }
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Tracker Service Error]: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`El servicio del tracker ha terminado con código ${code}.`);
        pythonProcess = null;
    });
}

function stopPythonEngine() {
    if (pythonProcess) {
        console.log("Deteniendo el motor de Python...");
        pythonProcess.kill();
        pythonProcess = null;
    }
}

function handleEngineData(data) {
    if (!isRunning || currentPhase !== 'work') {
        clearDistraction();
        return;
    }
    if (data.distracted) {
        if (!distractionStartTimer && !is_distracted) {
            distractionStartTimer = setTimeout(startAlertLoop, distraction_config.time_limit * 1000);
        }
    } else {
        clearDistraction();
    }
}

function startAlertLoop() {
    if (is_distracted) return;
    is_distracted = true;
    console.log("¡Distracción detectada! Iniciando alertas.");
    if (mainWindow) mainWindow.webContents.send('distraction-update', { distracted: true });
    new Notification({ title: "FOCUSAIDE", body: "Parece que te has distraído. ¡Vuelve a concentrarte!" }).show();
    alertLoopInterval = setInterval(() => {
        new Notification({ title: "FOCUSAIDE", body: "Mantén el enfoque en tu tarea." }).show();
    }, 15000);
}

function clearDistraction() {
    if (distractionStartTimer) { clearTimeout(distractionStartTimer); distractionStartTimer = null; }
    if (alertLoopInterval) { clearInterval(alertLoopInterval); alertLoopInterval = null; }
    if (is_distracted) {
        is_distracted = false;
        console.log("El usuario ha vuelto a enfocarse.");
        if (mainWindow) mainWindow.webContents.send('distraction-update', { distracted: false });
    }
}

// --- Funciones del Temporizador ---
function showNotification(title, body) { if (Notification.isSupported()) { new Notification({ title, body, silent: false }).show(); } }
function updateFrontend() { if (mainWindow) { mainWindow.webContents.send('state-update', { timer: { timeLeft, totalTimeInPhase, isRunning, currentPhase, pomodoroCount } }); } }
function stopTimer(unblock = true) { if (!isRunning) return; isRunning = false; clearInterval(timerId); if (unblock) removeBlocklist(); clearDistraction(); updateFrontend(); }
function startTimer() { if (isRunning) return; isRunning = true; clearDistraction(); if (currentPhase === 'work') applyBlocklist(); showNotification(`¡A estudiar!`, `Iniciando sesión de trabajo.`); updateFrontend(); timerId = setInterval(() => { timeLeft--; updateFrontend(); if (timeLeft < 0) nextPhase(); }, 1000); }
function resetTimer() { stopTimer(true); currentPhase = 'work'; pomodoroCount = 0; timeLeft = currentMethod.work; totalTimeInPhase = currentMethod.work; updateFrontend(); }
function nextPhase() { const wasWork = currentPhase === 'work'; stopTimer(false); let title = "", body = ""; if (wasWork) { pomodoroCount++; if (currentMethod.longRest && pomodoroCount > 0 && pomodoroCount % 4 === 0) { currentPhase = 'longRest'; timeLeft = currentMethod.longRest; title = "¡Descanso Largo!"; body = "Has completado 4 pomodoros."; } else { currentPhase = 'rest'; timeLeft = currentMethod.rest; title = "¡Tiempo de Descanso!"; body = "Tómate una pausa."; } removeBlocklist(); } else { currentPhase = 'work'; timeLeft = currentMethod.work; title = "De vuelta al Estudio"; body = "Es hora de continuar."; } totalTimeInPhase = timeLeft; showNotification(title, body); startTimer(); }

// --- Creación de la Ventana y Ciclo de Vida de la App ---
function createWindow() {
    if (fs.existsSync(hostsBackupPath)) {
        removeBlocklist();
    }
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 720,
        minWidth: 940,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    mainWindow.loadFile('src/index.html');
    mainWindow.on('close', () => removeBlocklist());
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('main-world-ready');
    });
    startPythonEngine();
}

app.whenReady().then(() => {
    createWindow();

    // IPC para Tareas
    ipcMain.handle('get-tasks', () => readDataFromFile(tasksFilePath));
    ipcMain.handle('add-task', (event, task) => { const tasks = readDataFromFile(tasksFilePath); const newTask = {...task, id: Date.now()}; tasks.push(newTask); saveDataToFile(tasksFilePath, tasks); return newTask; });
    ipcMain.on('update-task', (event, taskToUpdate) => { let tasks = readDataFromFile(tasksFilePath); tasks = tasks.map(t => t.id === taskToUpdate.id ? taskToUpdate : t); saveDataToFile(tasksFilePath, tasks); });
    ipcMain.on('delete-task', (event, taskId) => { let tasks = readDataFromFile(tasksFilePath); tasks = tasks.filter(t => t.id !== taskId); saveDataToFile(tasksFilePath, tasks); });

    // IPC para Bloqueador de Sitios
    ipcMain.handle('get-blocklist', () => readDataFromFile(blocklistFilePath));
    ipcMain.on('save-blocklist', (event, sites) => { saveDataToFile(blocklistFilePath, sites); showNotification("FOCUSAIDE", "Lista de bloqueo guardada."); });

    // IPC para Temporizador
    ipcMain.on('timer-command', (event, command) => { if (command === 'start') startTimer(); if (command === 'stop') stopTimer(true); if (command === 'reset') resetTimer(); });
    ipcMain.on('set-method', (event, { method, customTimes }) => { stopTimer(true); pomodoroCount = 0; currentPhase = 'work'; if (method === 'custom' && customTimes.work && customTimes.rest) { currentMethod = { work: customTimes.work * 60, rest: customTimes.rest * 60 }; } else { currentMethod = studyMethods[method] || studyMethods.pomodoro; } timeLeft = currentMethod.work; totalTimeInPhase = currentMethod.work; updateFrontend(); });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    removeBlocklist();
    stopPythonEngine();
});