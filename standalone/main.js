const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const { runCurseForgeScraper } = require('./scraper');
const { toLocalUrl } = require('./deep-link');

let mainWindow = null;
let serverProcess = null;
let pendingProtocolUrl = null;
const PORT = process.env.PORT || 3000;

function handleDeepLink(url) {
  try {
    const localUrl = toLocalUrl(url, PORT);
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

// Start the Next.js standalone server as a background subprocess
function startNextServer() {
  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  const serverDir = path.join(__dirname, '..', '.next', 'standalone');
  
  console.log(`🚀 Spawning Next.js server from: ${serverPath}`);
  console.log(`Working directory (cwd): ${serverDir}`);
  
  serverProcess = fork(serverPath, [], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production'
    },
    silent: false // Lets us see server logs in the terminal
  });

  // Escuchar peticiones del proceso Next.js (Scraping On-Demand)
  serverProcess.on('message', async (msg) => {
    if (msg.type === 'scrape_mods') {
      const { slug } = msg;
      const { scrapeCollectionMods } = require('./scraper');
      const mods = await scrapeCollectionMods(slug);
      serverProcess.send({ type: 'scrape_mods_response', slug, mods });
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js standalone server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Next.js standalone server exited with code ${code}`);
  });
}

// Check if Next.js server is fully booted and ready before loading the URL
function waitForServer(callback) {
  // We make a lightweight request to the offline root to confirm the server is responsive
  const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
    // If we get any response, the server is ready!
    callback();
  });

  req.on('error', () => {
    console.log('⏳ Waiting for local Next.js server to be ready...');
    setTimeout(() => waitForServer(callback), 150);
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
    handleDeepLink(initialProtocolUrl);
  }

  startNextServer();
  
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
