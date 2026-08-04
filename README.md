# 🛡️ Nexus Shield Security Gatekeeper

> Edge-Speed PII & Secret Leak Prevention for GitHub Actions & CI/CD Pipelines.

[![GitHub Release](https://img.shields.io/github/v/release/baturhantasdelen-sudo/nexus-shield-action?style=flat-square&color=black)](https://github.com/baturhantasdelen-sudo/nexus-shield-action/releases)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue?style=flat-square&logo=github)](https://github.com/marketplace/actions/nexus-shield-security-gatekeeper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Nexus Shield** prevents sensitive data leaks (PII, API Keys, Passwords, Credit Cards) before they ever hit your main branch. It automatically scans PR diffs at edge speeds, comments with precise locations, and blocks compromised PRs.

---

## ⚡ Key Features

- 🇹🇷 **TCKN & Regional PII Detection:** Validates Turkish Identity Numbers (TCKN) with checksum algorithms.
- 💳 **Financial Data Guard:** Detects Credit Card numbers with standard Luhn validation.
- 🔑 **API Keys & Secrets:** Blocks leaked OpenAI, Anthropic, Vercel API keys, AWS credentials, JWTs, and Private Keys.
- 💬 **Rich PR Annotations:** Leaves line-by-line annotations and clear GitHub Action summary tables.
- 🚫 **Zero-False-Positive Filtering:** Automatically ignores `.env.example`, mocks, and test files while flagging actual leaks.

---

## 📸 Real Detection Preview

When a leak is detected, **Nexus Shield** blocks the workflow and highlights exact line numbers:

```text
❌ [TCKN] 1000000****0146 found in test-leak.txt#L3
❌ [OpenAI API Key] sk-proj-*****************cdef found in test-leak.txt#L2
```

---

## 🚀 Quick Start

Add the following workflow file to your repository at `.github/workflows/nexus-shield.yml`:

```yaml
name: Nexus Shield Security Gatekeeper

on:
  pull_request:
    branches: [main, master]

jobs:
  security-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Nexus Shield Gatekeeper
        uses: baturhantasdelen-sudo/nexus-shield-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-detection: "true"
```

---

## ⚙️ Configuration Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `github-token` | GitHub token for reading diffs & posting PR comments | Yes | `${{ github.token }}` |
| `fail-on-detection` | Fail the workflow step if any leak is detected (`true`/`false`) | No | `"true"` |

---

## 📄 License

Distributed under the MIT License. Built with ❤️ by Baturhan Taşdelen.
