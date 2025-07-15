const { app, BrowserWindow, ipcMain, globalShortcut, Notification } = require('electron');
const path = require('node:path');
const fs = require('fs');
const sudo = require('sudo-prompt');

const userDataPath = app.getPath('userData');
const tasksFilePath = path.join(userDataPath, 'tasks.json');
const blocklistFilePath = path.join(userDataPath, 'blocklist.json');
const hostsPath = process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';
const hostsBackupPath = path.join(userDataPath, 'hosts.backup');

let mainWindow;
let quitTimer = null;

// --- FUNCIÓN PARA ENVIAR ORDEN DE SONIDO ---
function playSound(soundName) {
    if (mainWindow) {
        mainWindow.webContents.send('play-sound', soundName);
    }
}

// --- LÓGICA DE GESTIÓN DE ARCHIVOS ---
function readDataFromFile(filePath) { try { if (fs.existsSync(filePath)) { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } return []; } catch (error) { console.error(`Error leyendo archivo ${filePath}:`, error); return []; } }
function saveDataToFile(filePath, data) { try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (error) { console.error(`Error guardando archivo ${filePath}:`, error); } }
function executeSudoCommand(command) { return new Promise((resolve, reject) => { sudo.exec(command, { name: 'FOCUSAIDE' }, (error, stdout, stderr) => { if (error) { console.error('Error de Sudo:', error); showNotification('Error de Permisos', 'No se pudieron aplicar los cambios de bloqueo.'); reject(error); } else { resolve(); } }); }); }
async function applyBlocklist() { const sitesToBlock = readDataFromFile(blocklistFilePath); if (sitesToBlock.length === 0) return; try { const originalHosts = fs.readFileSync(hostsPath, 'utf8'); if (!fs.existsSync(hostsBackupPath)) { fs.writeFileSync(hostsBackupPath, originalHosts); } const blockLines = sitesToBlock.map(site => `127.0.0.1 ${site}`).join('\n'); const newHostsContent = originalHosts.replace(/# FOCUSAIDE Block Start[\s\S]*# FOCUSAIDE Block End\n?/g, '').trim() + `\n\n# FOCUSAIDE Block Start\n${blockLines}\n# FOCUSAIDE Block End\n`; const command = process.platform === 'win32' ? `(echo ${newHostsContent.replace(/\r\n|\n|\r/g, "& echo ")} ) > "${hostsPath}"` : `echo "${newHostsContent}" > "${hostsPath}"`; await executeSudoCommand(command); console.log('Sitios bloqueados.'); } catch (e) { console.error("Error en applyBlocklist:", e); showNotification('Error', 'No se pudo modificar el archivo hosts.'); } }
async function removeBlocklist() { if (fs.existsSync(hostsBackupPath)) { try { const originalHosts = fs.readFileSync(hostsBackupPath, 'utf8'); const command = process.platform === 'win32' ? `(echo ${originalHosts.replace(/\r\n|\n|\r/g, "& echo ")} ) > "${hostsPath}"` : `echo "${originalHosts}" > "${hostsPath}"`; await executeSudoCommand(command); fs.unlinkSync(hostsBackupPath); console.log('Sitios desbloqueados.'); } catch(e) { console.error("Error en removeBlocklist:", e); } } }

// --- LÓGICA DEL TEMPORIZADOR AVANZADO ---
const studyMethods = { pomodoro: { work: 25 * 60, rest: 5 * 60, longRest: 15 * 60 }, rule5217: { work: 52 * 60, rest: 17 * 60 }, method9030: { work: 90 * 60, rest: 30 * 60 }, method4515: { work: 45 * 60, rest: 15 * 60 }, deepWork: { work: 120 * 60, rest: 30 * 60 } };
let timerId = null, currentMethod = studyMethods.pomodoro, currentPhase = 'work', timeLeft = currentMethod.work, totalTimeInPhase = currentMethod.work, isRunning = false, pomodoroCount = 0;

function showNotification(title, body) { if (Notification.isSupported()) { new Notification({ title, body, silent: false }).show(); } }
function updateFrontend() { if (mainWindow) { mainWindow.webContents.send('state-update', { timer: { timeLeft, totalTimeInPhase, isRunning, currentPhase, pomodoroCount } }); } }
function stopTimer(unblock = true) { if (!isRunning) return; isRunning = false; clearInterval(timerId); if (unblock) removeBlocklist(); updateFrontend(); }

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    if (currentPhase === 'work') {
        applyBlocklist();
        playSound('start-work'); // Sonido de inicio de trabajo
    } else {
        playSound('start-rest'); // Sonido de inicio de descanso
    }
    showNotification(`¡A enfocarse!`, `Iniciando sesión de ${currentPhase === 'work' ? 'trabajo' : 'descanso'}.`);
    updateFrontend();
    timerId = setInterval(() => {
        timeLeft--;
        updateFrontend();
        if (timeLeft < 0) {
            nextPhase();
        }
    }, 1000);
}

function resetTimer() { stopTimer(); currentPhase = 'work'; pomodoroCount = 0; timeLeft = currentMethod.work; totalTimeInPhase = currentMethod.work; updateFrontend(); }

function nextPhase() {
    stopTimer();
    let title = "", body = "";
    if (currentPhase === 'work') {
        pomodoroCount++;
        if (currentMethod.longRest && pomodoroCount > 0 && pomodoroCount % 4 === 0) {
            currentPhase = 'longRest';
            timeLeft = currentMethod.longRest;
            title = "¡Descanso Largo!"; body = "Has completado 4 pomodoros. ¡Excelente trabajo!";
        } else {
            currentPhase = 'rest';
            timeLeft = currentMethod.rest;
            title = "¡Tiempo de Descanso!"; body = "Tómate una pausa.";
        }
    } else {
        currentPhase = 'work';
        timeLeft = currentMethod.work;
        title = "De vuelta al Enfoque"; body = "Es hora de continuar.";
    }
    totalTimeInPhase = timeLeft;
    showNotification(title, body);
    startTimer();
}

function createWindow() {
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
    mainWindow.on('close', removeBlocklist);
}

app.whenReady().then(() => {
    createWindow();
    ipcMain.handle('get-tasks', () => readDataFromFile(tasksFilePath));
    ipcMain.handle('add-task', (event, task) => { const tasks = readDataFromFile(tasksFilePath); tasks.push(task); saveDataToFile(tasksFilePath, tasks); return task; });
    ipcMain.on('update-task', (event, taskToUpdate) => {
        let tasks = readDataFromFile(tasksFilePath);
        tasks = tasks.map(t => t.id === taskToUpdate.id ? taskToUpdate : t);
        saveDataToFile(tasksFilePath, tasks);
        if (taskToUpdate.completed) {
            playSound('task-complete'); // Sonido de tarea completada
        }
    });
    ipcMain.on('delete-task', (event, taskId) => { let tasks = readDataFromFile(tasksFilePath); tasks = tasks.filter(t => t.id !== taskId); saveDataToFile(tasksFilePath, tasks); });
    ipcMain.handle('get-blocklist', () => readDataFromFile(blocklistFilePath));
    ipcMain.on('save-blocklist', (event, sites) => { saveDataToFile(blocklistFilePath, sites); });
    ipcMain.on('timer-command', (event, command) => {
        switch (command) {
            case 'start': startTimer(); break;
            case 'stop': stopTimer(); break;
            case 'reset': resetTimer(); break;
            case 'request-update': updateFrontend(); break;
        }
    });
    ipcMain.on('set-method', (event, { method, customTimes }) => {
        stopTimer();
        pomodoroCount = 0;
        currentPhase = 'work';
        if (method === 'custom' && customTimes.work && customTimes.rest) {
            currentMethod = { work: customTimes.work * 60, rest: customTimes.rest * 60 };
        } else {
            currentMethod = studyMethods[method] || studyMethods.pomodoro;
        }
        timeLeft = currentMethod.work;
        totalTimeInPhase = currentMethod.work;
        updateFrontend();
    });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { unblockSites(); });