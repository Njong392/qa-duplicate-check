const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function parseFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['classProperties', 'typescript', 'jsx'],
  });

  return { code, ast };
}

function extractFunctions(file) {
  const { code, ast } = parseFile(file);
  const functions = [];

  traverse(ast, {
    enter(path) {
      if (
        path.isFunctionDeclaration() ||
        path.isClassMethod() ||
        path.isObjectMethod() ||
        (path.isVariableDeclarator() &&
          path.node.init &&
          ['ArrowFunctionExpression', 'FunctionExpression'].includes(path.node.init.type))
      ) {
        const node = path.node;
        const body = node.body || (node.init && node.init.body);
        if (!body || !body.loc) return;

        functions.push({
          type: 'function',
          name: node.id?.name || node.key?.name || path.node.id?.name || '<anonymous>',
          startLine: body.loc.start.line,
          endLine: body.loc.end.line,
          content: code.slice(body.start, body.end),
          file,
        });
      }
    },
  });

  return functions;
}

function extractVariables(file) {
  const { ast } = parseFile(file);
  const variables = [];

  traverse(ast, {
    ClassProperty(path) {
      const node = path.node;
      if (node.value && node.value.type === 'StringLiteral' && node.loc) {
        variables.push({
          type: 'variable',
          name: node.key?.name || '<anonymous>',
          startLine: node.loc.start.line,
          endLine: node.loc.end.line,
          content: node.value.value,
          file,
        });
      }
    },
    VariableDeclarator(path) {
      const node = path.node;
      if (node.init && node.init.type === 'StringLiteral' && node.loc) {
        variables.push({
          type: 'variable',
          name: node.id?.name || '<anonymous>',
          startLine: node.loc.start.line,
          endLine: node.loc.end.line,
          content: node.init.value,
          file,
        });
      }
    },
  });

  return variables;
}

module.exports = { extractFunctions, extractVariables };
