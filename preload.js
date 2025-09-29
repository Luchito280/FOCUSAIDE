const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStateUpdate: (callback) => ipcRenderer.on('state-update', (_event, value) => callback(value)),
  sendTimerCommand: (command) => ipcRenderer.send('timer-command', command),
  setMethod: (method, customTimes) => ipcRenderer.send('set-method', { method, customTimes }),
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTask: (task) => ipcRenderer.send('update-task', task),
  deleteTask: (taskId) => ipcRenderer.send('delete-task', taskId),
  getBlocklist: () => ipcRenderer.invoke('get-blocklist'),
  saveBlocklist: (sites) => ipcRenderer.send('save-blocklist', sites),
  calibrateCenter: () => ipcRenderer.send('calibrate-center'),
  onEngineStatus: (callback) => ipcRenderer.on('engine-status', (_event, value) => callback(value)),
  onDistractionUpdate: (callback) => ipcRenderer.on('distraction-update', (_event, value) => callback(value)),
  switchView: (viewName) => ipcRenderer.send('switch-view', viewName),
  onMainWorldReady: (callback) => ipcRenderer.on('main-world-ready', () => callback())
});