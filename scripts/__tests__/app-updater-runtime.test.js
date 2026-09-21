const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

async function run() {
  const handlers = new Map();
  const updater = new EventEmitter();
  const deferred = [];
  let installs = 0;
  updater.quitAndInstall = () => { installs++; };
  const context = {
    module: { exports: {} }, process: { env: {} }, console,
    setTimeout: () => {}, setImmediate: fn => deferred.push(fn),
    require: name => name === 'electron' ? {
      app: { isPackaged: true, getVersion: () => '1.0.0' },
      ipcMain: { handle: (name, fn) => handlers.set(name, fn) },
    } : { autoUpdater: updater },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../standalone/app-updater.js'), 'utf8'), context);
  context.module.exports.setupAppUpdater({ getMainWindow: () => null });
  await assert.rejects(handlers.get('mim:updater:install')(), /no está descargada/);
  updater.emit('update-available', { version: '2.0.0' });
  updater.emit('download-progress', { percent: 47 });
  assert.equal((await handlers.get('mim:updater:get-version')()).state.percent, 47);
  updater.emit('update-downloaded', { version: '2.0.0' });
  assert.equal((await handlers.get('mim:updater:get-version')()).state.status, 'downloaded');
  assert.equal((await handlers.get('mim:updater:check')()).state.status, 'downloaded');
  assert.equal((await handlers.get('mim:updater:install')()).ok, true);
  assert.equal(installs, 0, 'IPC must return before quitting');
  deferred.shift()();
  assert.equal(installs, 1);
  console.log('✓ Updater runtime: snapshot recovery, downloaded checks, install guard and IPC ordering');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
