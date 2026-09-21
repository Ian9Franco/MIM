const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parse } = require('yaml');

async function verifyReleaseAssets(directory, expectedVersion) {
  const metadata = parse(fs.readFileSync(path.join(directory, 'latest.yml'), 'utf8'));
  if (metadata.version !== expectedVersion) throw new Error(`Release version ${metadata.version} does not match ${expectedVersion}`);
  if (!metadata.files?.length) throw new Error('latest.yml contains no installer files');
  for (const file of metadata.files) {
    // GitHub normalizes spaces on upload. Require the actual, already-safe filename.
    if (!/^[A-Za-z0-9._-]+\.exe$/.test(file.url) || !file.url.includes('-Setup-')) {
      throw new Error(`Unsafe or non-installer update filename: ${file.url}`);
    }
    const installer = path.join(directory, file.url);
    if (!fs.existsSync(installer)) throw new Error(`Missing update asset: ${file.url}`);
    if (fs.statSync(installer).size !== file.size) throw new Error(`Installer size mismatch: ${file.url}`);
    const hash = createHash('sha512');
    for await (const chunk of fs.createReadStream(installer)) hash.update(chunk);
    if (hash.digest('base64') !== file.sha512) throw new Error(`Installer SHA-512 mismatch: ${file.url}`);
    if (!fs.existsSync(`${installer}.blockmap`)) throw new Error(`Missing installer blockmap: ${file.url}`);
  }
  const mainFile = metadata.files.find(file => file.url === metadata.path);
  if (!mainFile || mainFile.sha512 !== metadata.sha512) throw new Error('Legacy update path/hash differs from files entry');
  return metadata;
}

if (require.main === module) {
  const expected = (process.argv[3] || require('../package.json').version).replace(/^v/, '');
  verifyReleaseAssets(process.argv[2] || 'dist', expected)
    .then(() => console.log(`✓ Release ${expected}: installer names, size, SHA-512 and blockmap verified`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { verifyReleaseAssets };
