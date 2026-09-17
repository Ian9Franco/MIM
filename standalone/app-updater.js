const { app, ipcMain } = require('electron');

function getAutoUpdater() {
  return require('electron-updater').autoUpdater;
}

const STARTUP_CHECK_DELAY_MS = 12_000;

let pendingUpdateInfo = null;

function isPortableRuntime() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
}

function isUpdaterSupported() {
  return app.isPackaged && !isPortableRuntime();
}

function getMainWindow(getMainWindow) {
  const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
  if (!win || win.isDestroyed()) return null;
  return win;
}

function sendStatus(getMainWindow, payload) {
  const win = getMainWindow(getMainWindow);
  if (!win) return;
  win.webContents.send('mim:updater:status', payload);
}

function getUnsupportedReason() {
  if (!app.isPackaged) return 'development';
  if (isPortableRuntime()) return 'portable';
  return 'unsupported';
}

function registerUnsupportedHandlers() {
  ipcMain.handle('mim:updater:get-version', async () => ({
    current: app.getVersion(),
    supported: false,
    reason: getUnsupportedReason(),
  }));

  ipcMain.handle('mim:updater:check', async () => ({
    supported: false,
    reason: getUnsupportedReason(),
  }));

  ipcMain.handle('mim:updater:download', async () => ({
    supported: false,
    reason: getUnsupportedReason(),
  }));

  ipcMain.handle('mim:updater:install', async () => ({
    supported: false,
    reason: getUnsupportedReason(),
  }));
}

function registerUpdaterHandlers(getMainWindow) {
  ipcMain.handle('mim:updater:get-version', async () => ({
    current: app.getVersion(),
    supported: true,
    latest: pendingUpdateInfo?.version || null,
  }));

  ipcMain.handle('mim:updater:check', async () => {
    try {
      const result = await getAutoUpdater().checkForUpdates();
      const latest = result?.updateInfo?.version || null;
      return {
        supported: true,
        current: app.getVersion(),
        latest,
        updateAvailable: Boolean(latest && latest !== app.getVersion()),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendStatus(getMainWindow, { status: 'error', message });
      throw error;
    }
  });

  ipcMain.handle('mim:updater:download', async () => {
    try {
      await getAutoUpdater().downloadUpdate();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendStatus(getMainWindow, { status: 'error', message });
      throw error;
    }
  });

  ipcMain.handle('mim:updater:install', async () => {
    getAutoUpdater().quitAndInstall(false, true);
    return { ok: true };
  });
}

function bindUpdaterEvents(getMainWindow) {
  const autoUpdater = getAutoUpdater();

  autoUpdater.on('checking-for-update', () => {
    sendStatus(getMainWindow, {
      status: 'checking',
      current: app.getVersion(),
    });
  });

  autoUpdater.on('update-available', (info) => {
    pendingUpdateInfo = info;
    sendStatus(getMainWindow, {
      status: 'update-available',
      current: app.getVersion(),
      latest: info.version,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    pendingUpdateInfo = null;
    sendStatus(getMainWindow, {
      status: 'update-not-available',
      current: app.getVersion(),
      latest: info?.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus(getMainWindow, {
      status: 'downloading',
      current: app.getVersion(),
      latest: pendingUpdateInfo?.version || null,
      percent: Math.round(progress.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    pendingUpdateInfo = info;
    sendStatus(getMainWindow, {
      status: 'downloaded',
      current: app.getVersion(),
      latest: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[MIM] Auto-update error:', message);
    sendStatus(getMainWindow, {
      status: 'error',
      current: app.getVersion(),
      latest: pendingUpdateInfo?.version || null,
      message,
    });
  });
}

function scheduleStartupCheck() {
  setTimeout(() => {
    getAutoUpdater().checkForUpdates().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[MIM] Startup update check failed:', message);
    });
  }, STARTUP_CHECK_DELAY_MS);
}

function setupAppUpdater({ getMainWindow }) {
  if (!isUpdaterSupported()) {
    console.log('[MIM] Auto-update disabled:', getUnsupportedReason());
    registerUnsupportedHandlers();
    return;
  }

  const autoUpdater = getAutoUpdater();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  registerUpdaterHandlers(getMainWindow);
  bindUpdaterEvents(getMainWindow);
  scheduleStartupCheck();

  console.log('[MIM] Auto-update enabled (GitHub releases)');
}

module.exports = {
  setupAppUpdater,
  isUpdaterSupported,
  isPortableRuntime,
};
