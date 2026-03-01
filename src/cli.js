#!/usr/bin/env node

const fs = require('fs');
const { loadConfig } = require('./config');
const { runCommitCheck, runStagedCheck, runWatch } = require('./index');
const { getStagedInputFromGit } = require('./scanner');

function parseArgs(argv) {
  const args = [...argv];
  let command = 'watch';
  if (args[0] && !args[0].startsWith('--')) {
    command = args.shift();
  } else if (args.includes('--help') || args.includes('-h')) {
    command = 'help';
  }

  let configPath = null;
  let stagedFilesFile = null;
  let stagedDiffFile = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--config') configPath = args[i + 1];
    if (args[i] === '--staged-files-file') stagedFilesFile = args[i + 1];
    if (args[i] === '--staged-diff-file') stagedDiffFile = args[i + 1];
  }

  return { command, configPath, stagedFilesFile, stagedDiffFile };
}

function printHelp() {
  console.log(`
Usage:
  qa-duplicate-check [command] [options]

Commands:
  (default)     watch
  commit        Check staged changes, then prompt/block based on commitMode
  check         Check staged changes and fail on duplicates
  watch         Watch configured folders and report duplicates on save

Options:
  --config <path>             Path to config file
  --staged-files-file <path>  Optional staged-files input file
  --staged-diff-file <path>   Optional staged diff input file
  --help                      Show this help
`);
}

function loadStagedInput(stagedFilesFile, stagedDiffFile) {
  if (!stagedFilesFile && !stagedDiffFile) {
    return getStagedInputFromGit();
  }

  if (!stagedFilesFile || !stagedDiffFile) {
    throw new Error('Pass both --staged-files-file and --staged-diff-file together.');
  }

  const stagedFiles = fs
    .readFileSync(stagedFilesFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const stagedDiffText = fs.readFileSync(stagedDiffFile, 'utf8');

  return { stagedFiles, stagedDiffText };
}

async function main() {
  const { command, configPath, stagedFilesFile, stagedDiffFile } = parseArgs(process.argv.slice(2));
  if (command === 'help') {
    printHelp();
    process.exit(0);
  }

  let loaded;
  try {
    loaded = loadConfig(configPath);
  } catch (error) {
    console.error(`[qa-duplicate-check] ${error.message}`);
    process.exit(1);
  }

  const { configPath: resolvedConfigPath, config } = loaded;
  console.log(`[qa-duplicate-check] Using config: ${resolvedConfigPath}`);

  if (command === 'watch') {
    await runWatch(config);
    return;
  }

  let stagedInput;
  try {
    stagedInput = loadStagedInput(stagedFilesFile, stagedDiffFile);
  } catch (error) {
    console.error(`[qa-duplicate-check] ${error.message}`);
    process.exit(1);
  }

  const exitCode =
    command === 'check' ? runStagedCheck(config, stagedInput) : runCommitCheck(config, stagedInput);
  process.exit(exitCode);
}

main();
