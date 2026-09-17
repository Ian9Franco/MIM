const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mimDesktop', {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke('mim:updater:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('mim:updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('mim:updater:download'),
  installUpdate: () => ipcRenderer.invoke('mim:updater:install'),
  onUpdaterStatus: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mim:updater:status', listener);
    return () => ipcRenderer.removeListener('mim:updater:status', listener);
  },
});
