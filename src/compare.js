function tokenizeFunction(code) {
  return code
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"`]).*?\1/g, '')
    .replace(/\b\d+\b/g, '')
    .split(/\W+/)
    .filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const overlap = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : overlap / union;
}

function compareFunctions(candidates, references, threshold) {
  const warnings = [];

  for (const candidate of candidates) {
    const candidateTokens = tokenizeFunction(candidate.content || '');

    for (const ref of references) {
      if (candidate.name === ref.name && candidate.file === ref.file && candidate.startLine === ref.startLine) {
        continue;
      }

      if (candidate.name.includes('Not') !== ref.name.includes('Not')) continue;

      const score = jaccardSimilarity(candidateTokens, tokenizeFunction(ref.content || ''));
      if (score >= threshold) {
        warnings.push({
          kind: 'function',
          newName: candidate.name,
          existingName: ref.name,
          file: candidate.file,
          existingFile: ref.file,
          similarity: score,
        });
      }
    }
  }

  return warnings;
}

function compareVariables(candidates, references) {
  const warnings = [];

  for (const candidate of candidates) {
    const normCandidate = String(candidate.content || '').replace(/\s+/g, ' ').trim();

    for (const ref of references) {
      if (candidate.name === ref.name && candidate.file === ref.file && candidate.startLine === ref.startLine) {
        continue;
      }

      const normRef = String(ref.content || '').replace(/\s+/g, ' ').trim();
      if (normCandidate && normCandidate === normRef) {
        warnings.push({
          kind: 'variable',
          newName: candidate.name,
          existingName: ref.name,
          file: candidate.file,
          existingFile: ref.file,
          similarity: 1,
        });
      }
    }
  }

  return warnings;
}

module.exports = { compareFunctions, compareVariables };
