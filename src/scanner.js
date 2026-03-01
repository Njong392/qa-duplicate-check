const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { extractFunctions, extractVariables } = require('./extractors');
const { compareFunctions, compareVariables } = require('./compare');

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isInRule(file, rule) {
  const absFile = toPosix(path.resolve(file));
  const absRoot = toPosix(path.resolve(rule.path));
  if (!absFile.startsWith(absRoot + '/') && absFile !== absRoot) return false;

  const ext = path.extname(file);
  return rule.include.includes(ext);
}

function getAllFiles(dir, includeExts) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full, includeExts));
    } else if (includeExts.includes(path.extname(full))) {
      files.push(full);
    }
  }

  return files;
}

function getAddedLinesByFile(diffText) {
  const linesByFile = new Map();
  let currentFile = null;
  let currentLine = null;

  for (const rawLine of (diffText || '').split('\n')) {
    const line = rawLine.trimEnd();

    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length);
      if (!linesByFile.has(currentFile)) linesByFile.set(currentFile, []);
      currentLine = null;
      continue;
    }

    if (line.startsWith('@@')) {
      const match = /\+(\d+)/.exec(line);
      if (match) currentLine = parseInt(match[1], 10);
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (currentLine != null) {
        linesByFile.get(currentFile).push(currentLine);
        currentLine += 1;
      }
      continue;
    }

    if (!line.startsWith('-') && !line.startsWith('\\') && currentLine != null) {
      currentLine += 1;
    }
  }

  return linesByFile;
}

function getAddedLines(file, addedLinesByFile) {
  const normalized = toPosix(file);
  if (addedLinesByFile.has(normalized)) return addedLinesByFile.get(normalized);

  for (const [diffFile, lines] of addedLinesByFile.entries()) {
    if (normalized.endsWith(diffFile)) return lines;
  }

  return [];
}

function filterEntitiesByAddedLines(entities, addedLines) {
  if (!addedLines.length) return [];
  return entities.filter((entity) =>
    addedLines.some((line) => line >= entity.startLine && line <= entity.endLine)
  );
}

function extractByRule(file, rule) {
  return rule.kind === 'functions' ? extractFunctions(file) : extractVariables(file);
}

function compareByRule(candidates, references, rule, functionSimilarityThreshold) {
  return rule.kind === 'functions'
    ? compareFunctions(candidates, references, functionSimilarityThreshold)
    : compareVariables(candidates, references);
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((item) => {
    const key = [item.kind, item.newName, item.file, item.existingName, item.existingFile].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scanTargets({ config, targets, mode, addedLinesByFile = new Map() }) {
  const warnings = [];

  for (const rule of config.rules) {
    const allRuleFiles = getAllFiles(rule.path, rule.include);
    const targetFiles = targets.filter((file) => isInRule(file, rule));

    for (const file of targetFiles) {
      if (!fs.existsSync(file)) continue;

      const entitiesInFile = extractByRule(file, rule);
      const candidates =
        mode === 'staged'
          ? filterEntitiesByAddedLines(entitiesInFile, getAddedLines(file, addedLinesByFile))
          : entitiesInFile;

      if (!candidates.length) continue;

      warnings.push(
        ...compareByRule(candidates, entitiesInFile, rule, config.functionSimilarityThreshold)
      );

      if (rule.crossFile) {
        const otherFiles = allRuleFiles.filter((ruleFile) => path.resolve(ruleFile) !== path.resolve(file));
        const references = otherFiles.flatMap((ruleFile) => {
          try {
            return extractByRule(ruleFile, rule);
          } catch {
            return [];
          }
        });

        warnings.push(
          ...compareByRule(candidates, references, rule, config.functionSimilarityThreshold)
        );
      }
    }
  }

  return dedupeWarnings(warnings);
}

function scanStaged(config, stagedFiles, diffText) {
  if (!Array.isArray(stagedFiles)) {
    throw new Error('stagedFiles must be an array.');
  }

  return scanTargets({
    config,
    targets: stagedFiles,
    mode: 'staged',
    addedLinesByFile: getAddedLinesByFile(diffText),
  });
}

function getStagedInputFromGit() {
  const filesResult = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  if (filesResult.error) throw filesResult.error;
  if (filesResult.status !== 0) throw new Error(filesResult.stderr || 'Unable to read staged files.');

  const diffResult = spawnSync('git', ['diff', '--cached', '-U0'], { encoding: 'utf8' });
  if (diffResult.error) throw diffResult.error;
  if (diffResult.status !== 0) throw new Error(diffResult.stderr || 'Unable to read staged diff.');

  return {
    stagedFiles: filesResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    stagedDiffText: diffResult.stdout || '',
  };
}

function scanFiles(config, files) {
  return scanTargets({ config, targets: files, mode: 'file' });
}

module.exports = { scanStaged, scanFiles, isInRule, getStagedInputFromGit };
