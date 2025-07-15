const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const WebSocket = require('ws'); // Importamos el módulo 'ws'

let mainWindow;
let wsClient = null;

// --- GESTIÓN DE DATOS (Sin cambios) ---
const userDataPath = app.getPath('userData');
const tasksFilePath = path.join(userDataPath, 'tasks.json');
const blocklistFilePath = path.join(userDataPath, 'blocklist.json');
const settingsFilePath = path.join(userDataPath, 'settings.json');

function readDataFromFile(filePath, defaultValue = []) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return defaultValue;
    } catch (error) {
        console.error(`Error al leer ${filePath}:`, error);
        return defaultValue;
    }
}

function saveDataToFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error al guardar en ${filePath}:`, error);
    }
}

// --- CONEXIÓN CON EL MOTOR DE PYTHON ---
function connectToPythonEngine() {
    wsClient = new WebSocket('ws://localhost:8765');

    wsClient.on('open', () => {
        console.log('Conectado al motor de Python (WebSocket).');
        if (mainWindow) {
            // Enviamos un mensaje inicial a la UI para que sepa que la conexión fue exitosa
            mainWindow.webContents.send('python-message', JSON.stringify({ status: 'connected' }));
        }
    });

    wsClient.on('message', (data) => {
        // Reenviamos los mensajes del motor de Python a la interfaz
        if (mainWindow) {
            mainWindow.webContents.send('python-message', data.toString());
        }
    });

    wsClient.on('close', () => {
        console.log('Conexión con el motor de Python cerrada. Reintentando en 5 segundos...');
        setTimeout(connectToPythonEngine, 5000); // Intenta reconectar
    });

    wsClient.on('error', (error) => {
        console.error('Error en WebSocket:', error.message);
        // No es necesario reenviar el error aquí, el evento 'close' se encargará de reintentar.
    });
}

// --- VENTANA PRINCIPAL ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    // Corregido para cargar index.html desde la raíz del proyecto
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// --- CICLO DE VIDA DE LA APP ---
app.on('ready', () => {
    if (!fs.existsSync(tasksFilePath)) saveDataToFile(tasksFilePath, []);
    if (!fs.existsSync(blocklistFilePath)) saveDataToFile(blocklistFilePath, []);
    if (!fs.existsSync(settingsFilePath)) saveDataToFile(settingsFilePath, {});
    
    createWindow();
    // Una vez que la ventana está lista, intentamos conectar con el motor de Python
    mainWindow.webContents.on('did-finish-load', () => {
        connectToPythonEngine();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (wsClient) {
        wsClient.close();
    }
});

// --- MANEJADORES IPC (Sin cambios en su lógica interna) ---
ipcMain.on('play-sound', (_, soundName) => {
    const soundPath = path.join(__dirname, 'assets', 'sounds', `${soundName}.mp3`);
    exec(`start "" "${soundPath}"`);
});

ipcMain.handle('get-tasks', () => readDataFromFile(tasksFilePath));
ipcMain.handle('add-task', (_, task) => {
    const tasks = readDataFromFile(tasksFilePath);
    tasks.push(task);
    saveDataToFile(tasksFilePath, tasks);
    return tasks;
});
ipcMain.on('update-task', (_, updatedTask) => {
    const tasks = readDataFromFile(tasksFilePath);
    const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) tasks[taskIndex] = updatedTask;
    saveDataToFile(tasksFilePath, tasks);
});
ipcMain.on('delete-task', (_, taskId) => {
    const tasks = readDataFromFile(tasksFilePath).filter(t => t.id !== taskId);
    saveDataToFile(tasksFilePath, tasks);
});
ipcMain.handle('get-settings', () => readDataFromFile(settingsFilePath, {}));
ipcMain.on('save-settings', (_, newSettings) => saveDataToFile(settingsFilePath, newSettings));
ipcMain.handle('get-blocklist', () => readDataFromFile(blocklistFilePath));
ipcMain.on('save-blocklist', (_, sites) => saveDataToFile(blocklistFilePath, sites));