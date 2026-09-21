const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { stringify } = require('yaml');
const { verifyReleaseAssets } = require('../verify-release-assets');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mim-release-assets-'));
  const bytes = Buffer.from('test installer');
  const file = { url: 'MIM-Setup-11.7.0.exe', size: bytes.length, sha512: createHash('sha512').update(bytes).digest('base64') };
  const metadata = { version: '11.7.0', files: [file], path: file.url, sha512: file.sha512 };
  const save = () => fs.writeFileSync(path.join(directory, 'latest.yml'), stringify(metadata));
  const installer = path.join(directory, file.url);
  try {
    save();
    // Reproduce the published 11.7.0: dots in the asset, hyphens in latest.yml.
    fs.writeFileSync(path.join(directory, 'MIM.Setup.11.7.0.exe'), bytes);
    await assert.rejects(verifyReleaseAssets(directory, '11.7.0'), /Missing update asset/);
    fs.writeFileSync(installer, bytes);
    fs.writeFileSync(`${installer}.blockmap`, 'test blockmap');
    await verifyReleaseAssets(directory, '11.7.0');
    await assert.rejects(verifyReleaseAssets(directory, '11.6.0'), /version/);
    fs.writeFileSync(installer, Buffer.from('bad! installer'));
    await assert.rejects(verifyReleaseAssets(directory, '11.7.0'), /SHA-512/);
    file.url = '../escape.exe'; save();
    await assert.rejects(verifyReleaseAssets(directory, '11.7.0'), /Unsafe/);
    console.log('✓ Release asset names, version, integrity and unsafe path regressions passed');
  } finally {
    for (const fileName of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, fileName));
    fs.rmdirSync(directory);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
