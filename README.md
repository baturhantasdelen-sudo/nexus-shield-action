# Nexus Shield Security Gatekeeper

Edge-speed **PII & secret leak detection** for GitHub Pull Requests.

Nexus Shield scans PR diffs for sensitive data — Turkish Identity Numbers (TCKN), credit cards, emails, API keys, private keys, JWTs, and AWS credentials. When a leak is detected, the workflow fails and an automated Markdown report is posted on the PR.

## Features

- Scans **changed files in pull requests**
- Detects:
  - TCKN (11-digit Turkish ID with checksum validation)
  - Credit card numbers (major brands + Luhn check)
  - Email addresses
  - OpenAI / Anthropic / Vercel API keys
  - AWS access keys (`AKIA...`)
  - Private keys (`-----BEGIN PRIVATE KEY-----`)
  - JWTs
  - Generic hardcoded secrets (`api_key=...`, `password=...`)
- Skips safe templates: `.env.example`, mocks, fixtures, test files
- Always flags real env files: `.env`, `.env.local`, `.env.production`
- Posts or updates a single PR comment with a masked findings table
- Fails the workflow when leaks are found (configurable)

## Usage

Add this workflow to `.github/workflows/nexus-shield.yml`:

```yaml
name: Nexus Shield Security Gatekeeper

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Nexus Shield scan
        uses: baturhantasdelen-sudo/nexus-shield-action@v1
        with:
          github-token: ${{ github.token }}
          fail-on-detection: true
```

## Inputs

| Input | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `github-token` | Yes | `${{ github.token }}` | Token used for PR comments |
| `fail-on-detection` | No | `true` | Fail the job when leaks are detected |

## Example PR Comment

When issues are found, Nexus Shield posts a comment like:

| File | Line | Issue Type | Masked Preview |
| :--- | ---: | :--- | :--- |
| `src/config.ts` | 12 | **OpenAI API Key** | `sk-proj****9f2a` |
| `.env` | 3 | **Generic Secret** | `api_key****1234` |

## Development

```bash
npm install
npm run build
```

The build bundles the action into `dist/index.js` via `@vercel/ncc`.

### Local typecheck

```bash
npm run typecheck
```

## Publishing to GitHub Marketplace

1. Push this repository to GitHub
2. Create a release tagged `v1.0.0`
3. Check **Publish this Action to the GitHub Marketplace**
4. Publish the release

Consumers can then reference:

```yaml
uses: baturhantasdelen-sudo/nexus-shield-action@v1
```

## Security Notes

- This action scans PR content only; it does not upload code to external services
- Detected values are masked in PR comments
- Rotate any credential that was exposed in git history

## License

MIT © Nexus Shield Team
