const { app, ipcMain } = require('electron');

function getAutoUpdater() {
  return require('electron-updater').autoUpdater;
}

const STARTUP_CHECK_DELAY_MS = 12_000;

let pendingUpdateInfo = null;
let lastStatus = null;
let updateDownloaded = false;

function isPortableRuntime() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
}

function isUpdaterSupported() {
  return app.isPackaged && !isPortableRuntime();
}

function resolveMainWindow(getMainWindowFn) {
  const win = typeof getMainWindowFn === 'function' ? getMainWindowFn() : null;
  if (!win || win.isDestroyed()) return null;
  return win;
}

function sendStatus(getMainWindowFn, payload) {
  lastStatus = payload;
  const win = resolveMainWindow(getMainWindowFn);
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

function registerUpdaterHandlers(getMainWindowFn) {
  ipcMain.handle('mim:updater:get-version', async () => ({
    current: app.getVersion(),
    supported: true,
    latest: pendingUpdateInfo?.version || null,
    state: lastStatus,
  }));

  ipcMain.handle('mim:updater:check', async () => {
    if (updateDownloaded || lastStatus?.status === 'downloading') {
      if (updateDownloaded) sendStatus(getMainWindowFn, { status: 'downloaded', current: app.getVersion(), latest: pendingUpdateInfo?.version });
      return { supported: true, current: app.getVersion(), latest: pendingUpdateInfo?.version, updateAvailable: true, state: lastStatus };
    }
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
      sendStatus(getMainWindowFn, { status: 'error', message });
      throw error;
    }
  });

  ipcMain.handle('mim:updater:download', async () => {
    try {
      if (updateDownloaded) {
        sendStatus(getMainWindowFn, { status: 'downloaded', current: app.getVersion(), latest: pendingUpdateInfo?.version });
        return { ok: true };
      }
      if (lastStatus?.status === 'downloading') return { ok: true };
      sendStatus(getMainWindowFn, { status: 'downloading', current: app.getVersion(), latest: pendingUpdateInfo?.version, percent: 0 });
      await getAutoUpdater().downloadUpdate();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendStatus(getMainWindowFn, { status: 'error', message });
      throw error;
    }
  });

  ipcMain.handle('mim:updater:install', async () => {
    if (!updateDownloaded) throw new Error('La actualización todavía no está descargada.');
    // Complete the IPC response before closing its renderer.
    setImmediate(() => getAutoUpdater().quitAndInstall(false, true));
    return { ok: true };
  });
}

function bindUpdaterEvents(getMainWindowFn) {
  const autoUpdater = getAutoUpdater();

  autoUpdater.on('checking-for-update', () => {
    sendStatus(getMainWindowFn, {
      status: 'checking',
      current: app.getVersion(),
    });
  });

  autoUpdater.on('update-available', (info) => {
    pendingUpdateInfo = info;
    sendStatus(getMainWindowFn, {
      status: 'update-available',
      current: app.getVersion(),
      latest: info.version,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    pendingUpdateInfo = null;
    sendStatus(getMainWindowFn, {
      status: 'update-not-available',
      current: app.getVersion(),
      latest: info?.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus(getMainWindowFn, {
      status: 'downloading',
      current: app.getVersion(),
      latest: pendingUpdateInfo?.version || null,
      percent: Math.round(progress.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    pendingUpdateInfo = info;
    sendStatus(getMainWindowFn, {
      status: 'downloaded',
      current: app.getVersion(),
      latest: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[MIM] Auto-update error:', message);
    sendStatus(getMainWindowFn, {
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
