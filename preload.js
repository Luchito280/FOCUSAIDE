const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Temporizador
    sendTimerCommand: (command) => ipcRenderer.send('timer-command', command),
    onTimerUpdate: (callback) => ipcRenderer.on('timer-update', (_, data) => callback(data)),

    // Tareas
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    addTask: (task) => ipcRenderer.invoke('add-task', task),
    updateTask: (task) => ipcRenderer.send('update-task', task),
    deleteTask: (taskId) => ipcRenderer.send('delete-task', taskId),

    // Configuración
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),

    // Cámara
    startPythonProcess: () => ipcRenderer.send('start-python-process'),
    onPythonMessage: (callback) => ipcRenderer.on('python-message', (_, msg) => callback(msg)),
    startCamera: () => ipcRenderer.send('start-camera'),
    stopCamera: () => ipcRenderer.send('stop-camera'),
    onCameraMessage: (callback) => ipcRenderer.on('python-message', (_, msg) => callback(msg)),
    onCameraError: (callback) => ipcRenderer.on('python-error', (_, err) => callback(err)),
    
    // Bloqueador
    getBlocklist: () => ipcRenderer.invoke('get-blocklist'),
    saveBlocklist: (sites) => ipcRenderer.send('save-blocklist', sites),

    // Sonidos
    playSound: (soundName) => ipcRenderer.send('play-sound', soundName)
});
