const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

// Start the Next.js standalone server as a background subprocess
function startNextServer() {
  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  
  console.log(`🚀 Spawning Next.js server from: ${serverPath}`);
  
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: 'localhost',
      NODE_ENV: 'production'
    },
    silent: false // Lets us see server logs in the terminal
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load local server URL
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize application
app.whenReady().then(() => {
  startNextServer();
  
  waitForServer(() => {
    console.log('✅ Server is ready! Launching window.');
    createWindow();
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
