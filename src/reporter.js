const readlineSync = require('readline-sync');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function printWarnings(warnings, title = 'QA DUPLICATE WARNING') {
  if (!warnings.length) return;

  console.log(`\n${colors.red}${title}${colors.reset}\n`);
  for (const warning of warnings) {
    const score = warning.similarity != null ? ` [score=${warning.similarity.toFixed(2)}]` : '';
    console.log(
      `${colors.yellow}${warning.newName} (${warning.file})${colors.reset} <-> ${colors.blue}${warning.existingName} (${warning.existingFile})${colors.reset}${score}`
    );
  }
  console.log('');
}

function promptProceed() {
  const answer = readlineSync.question('Proceed with commit? (y/n): ');
  return answer.toLowerCase().startsWith('y');
}

module.exports = { printWarnings, promptProceed };
