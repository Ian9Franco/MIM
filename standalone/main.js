const { app, BrowserWindow, safeStorage } = require('electron');
const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SERVER_READY_ATTEMPTS = 80;
const SERVER_READY_DELAY_MS = 250;
const { runCurseForgeScraper } = require('./scraper');
const { createSecretStore } = require('./secret-store');
const { resolveTrustedPath } = require('./trusted-path');

let mainWindow = null;
let serverProcess = null;
let pendingProtocolUrl = null;
const PORT = process.env.PORT || 3000;
let secretStore = null;
let resolvedPortableDir = null;

function getPortableDirectory() {
  if (process.env.MIM_PORTABLE_DIR) return path.resolve(process.env.MIM_PORTABLE_DIR);
  // D: dev path only for unpackaged dev runs — packaged installs always use homedir
  if (!app.isPackaged) {
    const developerSource = path.join('D:', '.MIM', 'source');
    if (fs.existsSync(developerSource)) return path.join(developerSource, '.mim-index');
  }
  return path.join(app.getPath('home'), '.mim-index');
}

function buildLegacyTrustedRoots() {
  const homeIndex = path.join(app.getPath('home'), '.mim-index');
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const devSourceIndex = path.join('D:', '.MIM', 'source', '.mim-index');
  return [homeIndex, standaloneDir, devSourceIndex];
}

function listLegacySettingsCandidates(portableSettings, trustedRoots) {
  const homeIndex = path.join(app.getPath('home'), '.mim-index');
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const devSourceIndex = path.join('D:', '.MIM', 'source', '.mim-index');
  const candidates = [
    path.join(standaloneDir, 'mim-settings.json'),
    path.join(homeIndex, 'mim-settings.json'),
    path.join(devSourceIndex, 'mim-settings.json'),
  ];
  const resolvedPortable = path.resolve(portableSettings);
  return [...new Set(candidates)]
    .map((candidate) => resolveTrustedPath(candidate, trustedRoots))
    .filter((candidate) => candidate !== resolvedPortable && fs.existsSync(candidate));
}

function listLegacySecretsCandidates(portableSecretsPath, portableDir, trustedRoots) {
  const homeIndex = path.join(app.getPath('home'), '.mim-index');
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const devSourceIndex = path.join('D:', '.MIM', 'source', '.mim-index');
  const dirs = [homeIndex, devSourceIndex, standaloneDir];
  const resolvedPortableDir = path.resolve(portableDir);
  const resolvedPortableSecrets = path.resolve(portableSecretsPath);
  return [...new Set(dirs)]
    .map((dir) => resolveTrustedPath(dir, trustedRoots))
    .filter((dir) => dir !== resolvedPortableDir)
    .map((dir) => resolveTrustedPath(path.join(dir, 'mim-secrets.enc.json'), trustedRoots))
    .filter((candidate) => candidate !== resolvedPortableSecrets && fs.existsSync(candidate));
}

function recoverPortableSettings(portableSettings, trustedRoots) {
  const resolvedTarget = resolveTrustedPath(portableSettings, trustedRoots);
  if (fs.existsSync(resolvedTarget)) return;
  const legacySettings = listLegacySettingsCandidates(resolvedTarget, trustedRoots);
  if (legacySettings.length === 0) return;
  fs.copyFileSync(legacySettings[0], resolvedTarget);
  console.log('[MIM] Recovered settings from', legacySettings[0]);
}

function recoverEncryptedSecrets(portableSecretsPath, portableDir, trustedRoots) {
  const resolvedTarget = resolveTrustedPath(portableSecretsPath, trustedRoots);
  if (fs.existsSync(resolvedTarget)) return;
  const legacySecrets = listLegacySecretsCandidates(resolvedTarget, portableDir, trustedRoots);
  if (legacySecrets.length === 0) return;
  fs.copyFileSync(legacySecrets[0], resolvedTarget);
  console.log('[MIM] Recovered encrypted credentials from', legacySecrets[0]);
}

function initializeSecretStore() {
  const portableDir = getPortableDirectory();
  resolvedPortableDir = portableDir;
  fs.mkdirSync(portableDir, { recursive: true });
  const portableSettings = path.join(portableDir, 'mim-settings.json');
  const portableSecrets = path.join(portableDir, 'mim-secrets.enc.json');

  const trustedRoots = buildLegacyTrustedRoots();
  trustedRoots.push(portableDir);

  recoverPortableSettings(portableSettings, trustedRoots);
  recoverEncryptedSecrets(portableSecrets, portableDir, trustedRoots);

  secretStore = createSecretStore({
    safeStorage,
    settingsPath: portableSettings,
    secretsPath: portableSecrets,
    trustedRoots,
  });

  secretStore.migratePlaintextSettings();
  secretStore.migratePlaintextFromPaths(listLegacySettingsCandidates(portableSettings, trustedRoots));

  console.log('[MIM] Portable data directory:', portableDir);
  return secretStore.toEnvironment();
}

function handleDeepLink(url) {
  try {
    const parsed = new URL(url);
    let targetPath = parsed.pathname;
    if (targetPath === '/' && parsed.hostname) {
      targetPath = `/${parsed.hostname}`;
    }
    const localUrl = `http://127.0.0.1:${PORT}${targetPath}${parsed.search}`;
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.loadURL(localUrl);
    } else {
      pendingProtocolUrl = localUrl;
    }
  } catch (err) {
    console.error('Failed to handle deep link:', err);
  }
}

function resolveServerExecPath() {
  if (!app.isPackaged) {
    const fromNpm = process.env.npm_node_execpath;
    if (fromNpm && fs.existsSync(fromNpm)) return { execPath: fromNpm, runAsNode: false };
    return { execPath: 'node', runAsNode: false };
  }
  return { execPath: process.execPath, runAsNode: true };
}

function startNextServer(secretEnvironment = {}) {
  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  const serverDir = path.join(__dirname, '..', '.next', 'standalone');

  if (!fs.existsSync(serverPath)) {
    console.error('[MIM] No existe .next/standalone/server.js.');
    console.error('      Compilá Desktop primero: npm run build:standalone');
    return false;
  }

  const { execPath, runAsNode } = resolveServerExecPath();
  console.log(`🚀 Spawning Next.js server from: ${serverPath}`);
  console.log(`Working directory (cwd): ${serverDir}`);
  console.log(`Runtime: ${execPath}${runAsNode ? ' (ELECTRON_RUN_AS_NODE)' : ''}`);

  serverProcess = fork(serverPath, [], {
    cwd: serverDir,
    execPath,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      MIM_DESKTOP_RUNTIME: '1',
      ...(runAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      ...(resolvedPortableDir ? { MIM_PORTABLE_DIR: resolvedPortableDir } : {}),
      ...secretEnvironment
    },
    silent: false
  });

  // Escuchar peticiones del proceso Next.js (Scraping On-Demand)
  serverProcess.on('message', async (msg) => {
    if (msg.type === 'scrape_mods') {
      const { slug } = msg;
      const { scrapeCollectionMods } = require('./scraper');
      const mods = await scrapeCollectionMods(slug);
      serverProcess.send({ type: 'scrape_mods_response', slug, mods });
    }

    if (msg.type === 'mim:secrets:update' && typeof msg.requestId === 'string') {
      try {
        if (!secretStore) throw new Error('Secret store is not initialized');
        secretStore.update(msg.secrets || {});
        serverProcess.send({ type: 'mim:secrets:updated', requestId: msg.requestId, ok: true });
      } catch (error) {
        serverProcess.send({
          type: 'mim:secrets:updated',
          requestId: msg.requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js standalone server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Next.js standalone server exited with code ${code}`);
  });

  return true;
}

function waitForServer(callback, attempt = 0) {
  if (serverProcess && (serverProcess.killed || serverProcess.exitCode != null)) {
    console.error('[MIM] El servidor Next.js se cerró antes de quedar listo.');
    app.quit();
    return;
  }

  if (attempt >= SERVER_READY_ATTEMPTS) {
    console.error(`[MIM] El servidor no respondió en http://127.0.0.1:${PORT} tras ${SERVER_READY_ATTEMPTS} intentos.`);
    app.quit();
    return;
  }

  const req = http.get(`http://127.0.0.1:${PORT}/`, () => {
    callback();
  });

  req.on('error', () => {
    if (attempt === 0 || attempt % 8 === 0) {
      console.log(`⏳ Waiting for local Next.js server to be ready... (${attempt + 1}/${SERVER_READY_ATTEMPTS})`);
    }
    setTimeout(() => waitForServer(callback, attempt + 1), SERVER_READY_DELAY_MS);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    minWidth: 1000,
    minHeight: 600,
    title: 'MIM - Minecraft Instance Manager',
    backgroundColor: '#141416',
    icon: path.join(__dirname, '..', 'app', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load local server URL
  if (pendingProtocolUrl) {
    mainWindow.loadURL(pendingProtocolUrl);
    pendingProtocolUrl = null;
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize application
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', (event, argv) => {
  const protocolUrl = argv.find((arg) => typeof arg === 'string' && arg.startsWith('mim://'));
  if (protocolUrl) {
    handleDeepLink(protocolUrl);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('mim');
  } else {
    app.setAsDefaultProtocolClient('mim', process.execPath, [path.resolve(process.argv[1] || '')]);
  }

  const initialProtocolUrl = process.argv.find((arg) => typeof arg === 'string' && arg.startsWith('mim://'));
  if (initialProtocolUrl) {
    pendingProtocolUrl = initialProtocolUrl;
  }

  let secretEnvironment = {};
  try {
    secretEnvironment = initializeSecretStore();
  } catch (error) {
    console.error('Failed to initialize encrypted credential storage:', error);
  }

  if (!startNextServer(secretEnvironment)) {
    app.quit();
    return;
  }

  waitForServer(() => {
    console.log('✅ Server is ready! Launching window.');
    createWindow();
    
    // Lanzar scraper en segundo plano después de que la app esté lista
    // para no retrasar el inicio pero asegurar que la data esté fresca
    setTimeout(() => {
      runCurseForgeScraper().catch(console.error);
    }, 5000);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Clean up background processes on exit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    console.log('Stopping Next.js standalone server...');
    serverProcess.kill('SIGINT');
  }
});
