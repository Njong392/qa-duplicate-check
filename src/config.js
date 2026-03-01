const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  functionSimilarityThreshold: 0.92,
  commitMode: 'prompt',
  rules: [],
};

function resolveConfigPath(configArg) {
  if (configArg) return path.resolve(process.cwd(), configArg);

  const candidates = [
    'qa-duplicate-check.config.js',
    'duplicate-check.config.js',
    '.qa-duplicate-checkrc.js',
  ];

  for (const file of candidates) {
    const full = path.resolve(process.cwd(), file);
    if (fs.existsSync(full)) return full;
  }

  return null;
}

function normalizeRule(rule) {
  return {
    name: rule.name || `${rule.kind}:${rule.path}`,
    path: rule.path,
    kind: rule.kind,
    include: rule.include || ['.js', '.jsx', '.ts', '.tsx'],
    crossFile: rule.crossFile !== false,
  };
}

function assertValid(config) {
  if (!config.rules || !Array.isArray(config.rules) || config.rules.length === 0) {
    throw new Error('Config must include a non-empty rules array.');
  }

  for (const rule of config.rules) {
    if (!rule.path) throw new Error('Each rule must define a path.');
    if (!['functions', 'variables'].includes(rule.kind)) {
      throw new Error(`Invalid rule kind "${rule.kind}" for path "${rule.path}".`);
    }
  }

  if (!['prompt', 'strict'].includes(config.commitMode)) {
    throw new Error('commitMode must be either "prompt" or "strict".');
  }
}

function loadConfig(configArg) {
  const configPath = resolveConfigPath(configArg);
  if (!configPath) {
    throw new Error(
      'No config found. Add qa-duplicate-check.config.js (or pass --config <path>).'
    );
  }

  delete require.cache[require.resolve(configPath)];
  const userConfig = require(configPath);

  const merged = {
    ...DEFAULTS,
    ...userConfig,
    rules: (userConfig.rules || []).map(normalizeRule),
  };

  // Backward compatibility for older boolean config.
  if (typeof userConfig.promptOnCommit === 'boolean' && !userConfig.commitMode) {
    merged.commitMode = userConfig.promptOnCommit ? 'prompt' : 'strict';
  }

  assertValid(merged);

  return {
    configPath,
    config: merged,
  };
}

module.exports = { loadConfig };
