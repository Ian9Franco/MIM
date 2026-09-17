const fs = require('fs');
const path = require('path');
const { SECRET_ENV } = require('./secret-store');

const ENV_TO_SECRET_FIELD = {
  MODRINTH_API_KEY: 'modrinthApiKey',
  MODRINTH_TOKEN: 'modrinthApiKey',
  CURSEFORGE_API_KEY: 'curseforgeApiKey',
  VIRUSTOTAL_API_KEY: 'virusTotalApiKey',
  GEMINI_API_KEY: 'geminiApiKey',
  OPENROUTER_API_KEY: 'openrouterApiKey',
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

/**
 * Loads `.env` then `.env.local` from the repo root (local overrides base).
 * Only intended for unpackaged Electron / local standalone runs.
 */
function loadDevEnvFiles(projectRoot) {
  const baseEnv = parseEnvFile(path.join(projectRoot, '.env'));
  const localEnv = parseEnvFile(path.join(projectRoot, '.env.local'));
  return { ...baseEnv, ...localEnv };
}

function mapDevEnvToSecretEnvironment(localEnv) {
  const secretFields = {};

  for (const [envKey, field] of Object.entries(ENV_TO_SECRET_FIELD)) {
    const value = typeof localEnv[envKey] === 'string' ? localEnv[envKey].trim() : '';
    if (!value) continue;
    if (!secretFields[field]) secretFields[field] = value;
  }

  const secretEnvironment = {};
  for (const [field, envName] of Object.entries(SECRET_ENV)) {
    if (secretFields[field]) secretEnvironment[envName] = secretFields[field];
  }

  return secretEnvironment;
}

function listLoadedDevSecretFields(localEnv) {
  const loaded = [];
  for (const [envKey, field] of Object.entries(ENV_TO_SECRET_FIELD)) {
    const value = typeof localEnv[envKey] === 'string' ? localEnv[envKey].trim() : '';
    if (value && !loaded.includes(field)) loaded.push(field);
  }
  return loaded;
}

/**
 * Merges secret-store output with `.env.local` mappings.
 * Persisted safeStorage values win over dev env when both exist.
 */
function mergeSecretEnvironment(storedSecretEnvironment, localEnv) {
  const fromDevEnv = mapDevEnvToSecretEnvironment(localEnv);
  const merged = { ...fromDevEnv };

  for (const [key, value] of Object.entries(storedSecretEnvironment || {})) {
    if (typeof value === 'string' && value.length > 0) {
      merged[key] = value;
    }
  }

  return merged;
}

module.exports = {
  ENV_TO_SECRET_FIELD,
  parseEnvFile,
  loadDevEnvFiles,
  mapDevEnvToSecretEnvironment,
  mergeSecretEnvironment,
  listLoadedDevSecretFields,
};
