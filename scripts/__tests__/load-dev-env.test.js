const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  parseEnvFile,
  loadDevEnvFiles,
  mapDevEnvToSecretEnvironment,
  mergeSecretEnvironment,
  listLoadedDevSecretFields,
} = require('../../standalone/load-dev-env');

function testParseEnvFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mim-env-'));
  const envPath = path.join(dir, '.env.local');
  fs.writeFileSync(envPath, [
    '# comment',
    'GEMINI_API_KEY=gemini-test',
    'CURSEFORGE_API_KEY=$2a$10$hash',
    'OPENROUTER_API_KEY="sk-or-test"',
    '',
  ].join('\n'));

  const parsed = parseEnvFile(envPath);
  assert.equal(parsed.GEMINI_API_KEY, 'gemini-test');
  assert.equal(parsed.CURSEFORGE_API_KEY, '$2a$10$hash');
  assert.equal(parsed.OPENROUTER_API_KEY, 'sk-or-test');
}

function testLoadDevEnvFilesPrefersLocal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mim-env-'));
  fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=from-env\nMODRINTH_API_KEY=base\n');
  fs.writeFileSync(path.join(dir, '.env.local'), 'GEMINI_API_KEY=from-local\nCURSEFORGE_API_KEY=cf\n');

  const merged = loadDevEnvFiles(dir);
  assert.equal(merged.GEMINI_API_KEY, 'from-local');
  assert.equal(merged.MODRINTH_API_KEY, 'base');
  assert.equal(merged.CURSEFORGE_API_KEY, 'cf');
}

function testMapAndMergeSecrets() {
  const localEnv = {
    GEMINI_API_KEY: 'gemini-dev',
    OPENROUTER_API_KEY: 'or-dev',
  };

  const mapped = mapDevEnvToSecretEnvironment(localEnv);
  assert.equal(mapped.MIM_SECRET_GEMINI, 'gemini-dev');
  assert.equal(mapped.MIM_SECRET_OPENROUTER, 'or-dev');

  const merged = mergeSecretEnvironment({ MIM_SECRET_GEMINI: 'stored-gemini' }, localEnv);
  assert.equal(merged.MIM_SECRET_GEMINI, 'stored-gemini');
  assert.equal(merged.MIM_SECRET_OPENROUTER, 'or-dev');

  const fields = listLoadedDevSecretFields(localEnv);
  assert.deepEqual(fields.sort(), ['geminiApiKey', 'openrouterApiKey'].sort());
}

function run() {
  testParseEnvFile();
  testLoadDevEnvFilesPrefersLocal();
  testMapAndMergeSecrets();
  console.log('✓ load-dev-env standalone bootstrap tests passed');
}

run();
