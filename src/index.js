const { scanStaged } = require('./scanner');
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

module.exports = { runCommitCheck, runStagedCheck };
