# @njong392/qa-duplicate-check

Config-driven duplicate detection for QA codebases.

It supports:
- Function duplicate detection (similarity-based)
- Variable duplicate detection (exact string-content match)
- Commit-time enforcement (`strict` block or `prompt` override)
- Save-time duplicate feedback (`watch`)

## Install

```sh
npm i -D @njong392/qa-duplicate-check
```

## Config

Create `qa-duplicate-check.config.js` in your project root:

```js
module.exports = {
  functionSimilarityThreshold: 0.92,
  commitMode: 'strict', // 'strict' | 'prompt'
  rules: [
    {
      name: 'QA Actions',
      path: 'cypress/e2e/actions',
      kind: 'functions', // 'functions' | 'variables'
      include: ['.js'],
      crossFile: true,
    },
    {
      name: 'QA Pages',
      path: 'cypress/e2e/pages',
      kind: 'variables',
      include: ['.js'],
      crossFile: true,
    },
  ],
};
```

## Commands

```sh
qa-duplicate-check
qa-duplicate-check commit
qa-duplicate-check check
qa-duplicate-check watch
```

- `qa-duplicate-check` (default): starts watch mode
- `commit`: checks staged changes and enforces based on `commitMode`
- `check`: checks staged changes and exits non-zero on duplicates
- `watch`: monitors configured folders and reports duplicates on file save


## Husky integration

`package.json`:

```json
{
  "scripts": {
    "dupcheck:commit": "qa-duplicate-check commit",
    "dupcheck:check": "qa-duplicate-check check",
    "dupcheck:watch": "qa-duplicate-check watch"
  }
}
```

`.husky/pre-commit`:

```sh
#!/bin/sh
npm run dupcheck:commit
```
