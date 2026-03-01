const fs = require('fs');
const path = require('path');
const { scanStaged, scanFiles, isInRule } = require('./scanner');
const { printWarnings, promptProceed } = require('./reporter');

function runCommitCheck(config, stagedInput) {
  const warnings = scanStaged(config, stagedInput.stagedFiles, stagedInput.stagedDiffText);
  if (!warnings.length) return 0;

  printWarnings(warnings);

  if (config.commitMode === 'prompt') {
    const proceed = promptProceed();
    if (!proceed) {
      console.log('Commit aborted.');
      return 1;
    }
    console.log('Proceeding with commit despite duplicates.');
    return 0;
  }

  console.log('Commit blocked due to duplicates (strict mode).');
  return 1;
}

function runStagedCheck(config, stagedInput) {
  const warnings = scanStaged(config, stagedInput.stagedFiles, stagedInput.stagedDiffText);
  if (!warnings.length) {
    console.log('No duplicate warnings found in staged changes.');
    return 0;
  }

  printWarnings(warnings, 'QA DUPLICATE CHECK FAILED');
  return 1;
}

function runWatch(config) {
  const watchedDirs = new Map();

  const onFileEvent = (file) => {
    if (!config.rules.some((rule) => isInRule(file, rule))) return;

    try {
      const warnings = scanFiles(config, [file]);
      if (!warnings.length) {
        console.log(`[qa-duplicate-check] ${file}: no duplicates.`);
        return;
      }

      printWarnings(warnings, `DUPLICATES ON SAVE: ${file}`);
    } catch (error) {
      console.error(`[qa-duplicate-check] Failed to analyze ${file}: ${error.message}`);
    }
  };

  function registerDir(dir) {
    const absDir = path.resolve(dir);
    if (watchedDirs.has(absDir) || !fs.existsSync(absDir)) return;

    const stat = fs.statSync(absDir);
    if (!stat.isDirectory()) return;

    const watcher = fs.watch(absDir, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(absDir, filename.toString());

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        registerDir(fullPath);
        return;
      }

      if (eventType === 'change' || eventType === 'rename') onFileEvent(fullPath);
    });

    watchedDirs.set(absDir, watcher);

    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory()) registerDir(path.join(absDir, entry.name));
    }
  }

  for (const root of [...new Set(config.rules.map((rule) => path.resolve(rule.path)))]) {
    registerDir(root);
  }

  console.log('[qa-duplicate-check] Watch mode active. Listening for file saves...');

  return new Promise(() => {});
}

module.exports = { runCommitCheck, runStagedCheck, runWatch };
