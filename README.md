# @njong392/qa-duplicate-check

Config-driven duplicate detection for QA codebases.

It supports:
- Function duplicate detection (similarity-based)
- Variable duplicate detection (exact string-content match)
- Commit-time enforcement (`strict` block or `prompt` override)

## Install

```sh
npm i -D @njong392/qa-duplicate-check
```

## Config

Create `qa-duplicate-check.config.js` in your project root:

```js
module.exports = {
    functionSimilarityThreshold: 0.92,
    // UI Git clients are usually non-interactive; avoid hanging on prompts there.
    commitMode: process.stdin.isTTY ? 'prompt' : 'strict', // 'strict' | 'prompt'
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
qa-duplicate-check commit
qa-duplicate-check check
```

- `commit`: checks staged changes and enforces based on `commitMode`
- `check`: checks staged changes and exits non-zero on duplicates


## Husky integration

`package.json`:

```json
{
  "scripts": {
    "dupcheck:commit": "qa-duplicate-check commit",
    "dupcheck:check": "qa-duplicate-check check"
  }
}
```

`.husky/pre-commit`:

```sh
#!/bin/sh
npm run dupcheck:commit
```
