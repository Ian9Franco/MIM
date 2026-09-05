const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
require('ts-node').register({ project: path.join(repo, 'tsconfig.scripts.json'), transpileOnly: true });
require('tsconfig-paths').register({ baseUrl: repo, paths: { '@/*': ['./*'] } });
fs.mkdirSync(path.join(repo, 'scratch'), { recursive: true });
const fixture = fs.mkdtempSync(path.join(repo, 'scratch/review-regression-'));
process.env.MIM_SOURCE_BASE = fixture;
const { NextRequest } = require('next/server');
const { resolveWithin } = require('../../lib/security/safePaths');
const settings = require('../../lib/core/settings');
// Isolate API tests from portable settings and the developer's Minecraft data.
settings.getSettings = () => ({ sourceBase: fixture, minecraftPath: path.join(fixture, 'minecraft') });
const config = require('../../app/api/config/files/route');
const deletion = require('../../app/api/project/delete/route');
const { savePlayerNBT } = require('../../lib/modding/savePlayerNBT');
const { readNBT, writeNBT, TagType } = require('../../lib/modding/nbt');
const { runDastAudit } = require('../security/dast-scan');
const jsonRequest = (body) => new NextRequest('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body) });
let passed = 0;
async function check(name, fn) { await fn(); console.log(`PASS ${name}`); passed++; }

async function main() {
  await check('project deletion rejects roots and malformed names, deletes only selected fixture', async () => {
    fs.mkdirSync(path.join(fixture, '_projects/keep'), { recursive: true });
    for (const projectName of ['.', '..', '../keep', 'keep/..', 'keep.', 'CON', 1, {}]) {
      assert.equal((await deletion.POST(jsonRequest({ projectName }))).status, 400);
      assert.ok(fs.existsSync(path.join(fixture, '_projects/keep')));
    }
    fs.mkdirSync(path.join(fixture, '_projects/remove'));
    assert.equal((await deletion.POST(jsonRequest({ projectName: 'remove' }))).status, 200);
    assert.ok(!fs.existsSync(path.join(fixture, '_projects/remove')));
    assert.ok(fs.existsSync(path.join(fixture, '_projects/keep')));
  });
  await check('config blocks traversal in project, file, folder, version and history', async () => {
    const attacks = [
      { project: '..', file: 'x' }, { project: 'keep', file: '../config-other/x' },
      { project: 'keep', folder: '../config-other' }, { project: 'keep', file: '../x', history: 'true' },
      { project: 'keep', file: 'x', version: '../x' }, { project: 'keep', file: 'C:\\outside.txt' },
    ];
    for (const query of attacks) {
      const response = await config.GET(new NextRequest(`http://localhost/api/config/files?${new URLSearchParams(query)}`));
      assert.equal(response.status, 403, JSON.stringify(query));
    }
    assert.equal((await config.POST(jsonRequest({ project: 'keep', file: '../config-other/x', content: 'no' }))).status, 403);
    assert.equal((await config.POST(jsonRequest({ project: 'keep', file: 'nested/test.txt', content: 'first' }))).status, 200);
    assert.equal((await config.POST(jsonRequest({ project: 'keep', file: 'nested/test.txt', content: 'second' }))).status, 200);
    const get = async (extra) => (await config.GET(new NextRequest(`http://localhost/api/config/files?${new URLSearchParams({ project: 'keep', file: 'nested/test.txt', ...extra })}`))).json();
    assert.equal((await get({})).content, 'second');
    const { history } = await get({ history: 'true' });
    assert.equal(history.length, 1);
    assert.equal((await get({ version: history[0] })).content, 'first');
  });
  await check('junction/symlink paths cannot escape configured roots', async () => {
    const destination = path.join(fixture, 'outside');
    fs.mkdirSync(destination);
    fs.symlinkSync(destination, path.join(fixture, '_projects/linked'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => resolveWithin(fixture, '_projects/linked/new.txt'));
    assert.equal((await deletion.POST(jsonRequest({ projectName: 'linked' }))).status, 400);
    assert.equal((await config.POST(jsonRequest({ project: 'linked', file: 'x', content: 'no' }))).status, 403);
    assert.deepEqual(fs.readdirSync(destination), []);
  });
  await check('desktop and web sanitize hostile HTML but retain rich descriptions', () => {
    for (const module of ['../../utils/markdown', '../../web/lib/markdown']) {
      const { markdownToHtml, formatCurseForgeHtml } = require(module);
      for (const format of [markdownToHtml, formatCurseForgeHtml]) {
        for (const input of [
          '<img src="https://example.invalid/missing" onerror="alert(1)">',
          '<img src=x oNeRrOr=alert(1)>', '<svg onload=alert(1)></svg>',
          '<a href="jav&#x61;script:alert(1)">click</a>',
          '<iframe src="https://evil.invalid/" srcdoc="bad"></iframe>',
          '<div style="position:fixed;inset:0" onclick="alert(1)">text</div>',
        ]) {
          const output = format(input);
          const tags = (output.match(/<[^>]*>/g) || []).join('');
          assert.doesNotMatch(tags, /\son\w+=|href="javascript:|<svg|srcdoc=|position:|src="https:\/\/evil/i, `${module}: ${output}`);
        }
        const safe = format('<details open><summary>More</summary><b>text</b><a href="https://modrinth.com/mod/test">mod</a><img src="https://cdn.modrinth.com/image.png"></details>');
        assert.match(safe, /<details/); assert.match(safe, /<summary/); assert.match(safe, /<b>text<\/b>/);
        assert.match(safe, /https:\/\/cdn.modrinth.com\/image.png/);
        assert.match(safe, /rel="noopener noreferrer"/);
      }
    }
  });
  const old = { type: TagType.Compound, name: '', value: { Health: { type: TagType.Float, name: 'Health', value: 5 } } };
  const repaired = { ...old, value: { Health: { type: TagType.Float, name: 'Health', value: 20 } } };
  await check('NBT saves verified data and retains exact original backup', async () => {
    const target = path.join(fixture, 'player.dat');
    const original = await writeNBT(old, true);
    fs.writeFileSync(target, original);
    await savePlayerNBT(target, repaired, true);
    assert.deepEqual(fs.readFileSync(`${target}.mim_bak`), original);
    assert.deepEqual(await readNBT(fs.readFileSync(target)), repaired);
  });
  await check('NBT original survives backup, temporary-write and rename failures', async () => {
    for (const operation of ['copyFileSync', 'writeFileSync', 'renameSync']) {
      const target = path.join(fixture, `${operation}.dat`);
      const original = await writeNBT(old, true);
      fs.writeFileSync(target, original);
      const real = fs[operation];
      fs[operation] = () => { throw new Error(`injected ${operation} failure`); };
      try { await assert.rejects(savePlayerNBT(target, repaired, true), /injected/); }
      finally { fs[operation] = real; }
      assert.deepEqual(fs.readFileSync(target), original);
      assert.ok(!fs.readdirSync(fixture).some(name => name.endsWith('.tmp')));
    }
  });
  await check('API quotas are independent and dynamic URLs cannot reset a handler quota', async () => {
    for (const module of ['../../lib/apiGuard', '../../web/lib/apiGuard']) {
      const { withApiGuard } = require(module);
      const browse = withApiGuard({ rateLimit: { maxRequests: 3 } }, () => Response.json({ ok: true }));
      const explain = withApiGuard({ rateLimit: { maxRequests: 1 } }, () => Response.json({ ok: true }));
      for (let i = 0; i < 3; i++) assert.equal((await browse(new Request(`http://localhost/api/projects/${i}`))).status, 200);
      assert.equal((await browse(new Request('http://localhost/api/projects/another?q=1'))).status, 429);
      assert.equal((await explain(new Request('http://localhost/api/explain'))).status, 200);
      assert.equal((await explain(new Request('http://localhost/api/explain?q=2'))).status, 429);
    }
  });
  await check('MIM deep links preserve routes, queries and recovery fragments', () => {
    const { toLocalUrl } = require('../../standalone/deep-link');
    assert.equal(toLocalUrl('mim://reset-password?code=abc#token', 3000), 'http://127.0.0.1:3000/reset-password?code=abc#token');
    assert.equal(toLocalUrl('mim:///reset-password', 3000), 'http://127.0.0.1:3000/reset-password');
    assert.equal(toLocalUrl('mim://fomo/details?id=1', 3000), 'http://127.0.0.1:3000/fomo/details?id=1');
    assert.throws(() => toLocalUrl('https://evil.invalid/', 3000));
  });
  await check('Electron cold start and second-instance dispatch load the same local URL', async () => {
    const vm = require('node:vm');
    const loaded = [], events = {};
    class Window {
      constructor() { this.setMenuBarVisibility = this.on = this.show = this.focus = () => {}; }
      loadURL(url) { loaded.push(url); }
      isMinimized() { return false; }
    }
    const link = 'mim://reset-password?code=abc#token';
    const fakeApp = {
      requestSingleInstanceLock: () => true, isPackaged: true,
      on: (name, fn) => { events[name] = fn; }, whenReady: () => Promise.resolve(),
      setAsDefaultProtocolClient: () => {},
    };
    vm.runInNewContext(fs.readFileSync(path.join(repo, 'standalone/main.js'), 'utf8'), {
      require: name => name === 'electron' ? { app: fakeApp, BrowserWindow: Window }
        : name === 'child_process' ? { fork: () => ({ on: () => {} }) }
        : name === 'http' ? { get: (_url, ready) => { ready({}); return { on: () => {} }; } }
        : name === './scraper' ? {} : name === './deep-link' ? require('../../standalone/deep-link') : require(name),
      __dirname: path.join(repo, 'standalone'), process: { env: {}, argv: ['electron', link], platform: 'win32' },
      console: { log() {}, error() {} }, setTimeout() {}, URL,
    });
    await Promise.resolve();
    events['second-instance']({}, ['electron', link]);
    assert.deepEqual(loaded, ['http://127.0.0.1:3000/reset-password?code=abc#token', 'http://127.0.0.1:3000/reset-password?code=abc#token']);
  });
  await check('pack validator distinguishes patch numbers and explicit ranges', () => {
    const { matchesMinecraftVersion: match } = require('../../lib/modding/minecraftVersionRange');
    assert.equal(match('1.21.1', '1.21.10'), false);
    assert.equal(match('1.21.10', '1.21.1'), false);
    for (const range of ['1.21.1', '1.21', '1.21.x', '1.21.*', '>=1.20.1 <1.22', '1.20.1 - 1.21.10', '[1.20.1,1.22)', '1.21.1+']) assert.equal(match(range, '1.21.1'), true, range);
    assert.equal(match('1.21.x', '1.210.1'), false);
    assert.equal(match('>=1.22', '1.21.1'), false);
    assert.equal(match('nonsense', '1.21.1'), false);
    const { validatePack } = require('../../lib/modding/packValidator');
    const report = validatePack({ version: '1.21.1', loader: 'fabric', buildTarget: 'alluser', mods: [{ fileName: 'test.jar', modName: 'test', modId: 'test', loader: 'fabric', gameVersion: '1.21.10', projectType: 'mod', category: '.essential', sub: 'qol' }] });
    assert.ok(JSON.stringify(report).includes('version_mismatch'));
  });
  await check('DAST returns failure/inconclusive instead of false success', async () => {
    let broken = false, posts = 0;
    const server = http.createServer((req, res) => {
      if (!broken) {
        res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'no-referrer');
      }
      if (req.method === 'OPTIONS') { res.statusCode = 204; if (broken) res.setHeader('Access-Control-Allow-Origin', 'https://attacker-domain.evil'); }
      if (req.method === 'POST') { res.statusCode = ++posts > 20 ? 429 : 400; if (res.statusCode === 429) res.setHeader('Retry-After', '60'); }
      res.end('');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    try {
      assert.equal((await runDastAudit(url)).exitCode, 0);
      broken = true; posts = 0;
      assert.equal((await runDastAudit(url)).exitCode, 1);
    } finally { await new Promise(resolve => server.close(resolve)); }
    assert.equal((await runDastAudit(url)).exitCode, 2);
    assert.throws(() => execFileSync(process.execPath, [path.join(repo, 'scripts/security/dast-scan.js'), url], { stdio: 'pipe' }), error => error.status === 2);
  });
  console.log(`${passed} review regression groups passed`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  // This directory was created by this process, strictly inside the test workspace.
  if (path.dirname(path.resolve(fixture)) !== path.join(repo, 'scratch')) throw new Error('Unsafe fixture cleanup');
  fs.rmSync(fixture, { recursive: true, force: true });
});
