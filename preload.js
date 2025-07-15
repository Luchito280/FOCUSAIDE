const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Canales del Temporizador
  sendCommand: (command) => ipcRenderer.send('timer-command', command),
  setMethod: (method, customTimes) => ipcRenderer.send('set-method', { method, customTimes }),
  onUpdateTime: (callback) => ipcRenderer.on('update-time', (_event, value) => callback(value)),
  
  // Canales de Notificaciones y Salida
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  onShowQuitMessage: (callback) => ipcRenderer.on('show-quit-message', callback),
  onHideQuitMessage: (callback) => ipcRenderer.on('hide-quit-message', callback),

  // Canales para Tareas y Bloqueo
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (taskText) => ipcRenderer.invoke('add-task', taskText),
  updateTask: (taskId, isCompleted) => ipcRenderer.send('update-task', { taskId, isCompleted }),
  deleteTask: (taskId) => ipcRenderer.send('delete-task', taskId),
  getBlocklist: () => ipcRenderer.invoke('get-blocklist'),
  saveBlocklist: (sites) => ipcRenderer.send('save-blocklist', sites),

  // --- NUEVO CANAL PARA SONIDOS ---
  onPlaySound: (callback) => ipcRenderer.on('play-sound', (_event, soundName) => callback(soundName))
});