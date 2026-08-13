<div align="center">

# 🛡️ Nexus Shield Action

**Zero-latency PII & Secret Leak Prevention Gatekeeper for Modern AI & Cloud Workflows**

[![LangChain Integrated](https://img.shields.io/badge/LangChain-Docs%20Integration%20%235246-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://github.com/baturhantasdelen-sudo/nexus-shield-action)
[![GitHub Super-Linter](https://img.shields.io/badge/GitHub%20Actions-Security%20Gatekeeper-blue?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/baturhantasdelen-sudo/nexus-shield-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

### 🌟 Officially featured in the [LangChain Security Documentation](https://github.com/langchain-ai/langchain) (#5246)

*Prevent PII (TCKN, Credit Cards), OpenAI/AWS API Keys, and Secret Leaks in your PRs before they hit main — with 0ms build delay.*

</div>

---

## 🎬 Quick Demo & Action in Action

<!-- Buraya ürettiğin GIF veya ekran görüntüsünü ekleyeceksin -->
![Nexus Shield PR Gatekeeper Demo](docs/assets/demo.gif)

> 💡 **Why Nexus Shield?** Traditional SAST scanners slow down your CI/CD pipeline by 3-5 minutes. Nexus Shield operates at edge-speed directly on the PR diff, blocking leaks in milliseconds without breaking developer velocity.

---

## ⚡ Key Features

- 🇹🇷 **TCKN & Regional PII Detection:** Validates Turkish Identity Numbers (TCKN) with checksum algorithms.
- 💳 **Financial Data Guard:** Detects Credit Card numbers with standard Luhn validation.
- 🔑 **API Keys & Secrets:** Blocks leaked OpenAI, Anthropic, Vercel API keys, AWS credentials, JWTs, and Private Keys.
- 💬 **Rich PR Annotations:** Leaves line-by-line annotations and clear GitHub Action summary tables.
- 🚫 **Zero-False-Positive Filtering:** Automatically ignores `.env.example`, mocks, and test files while flagging actual leaks.
- 📊 **Opt-in Telemetry:** Report anonymous leak stats to your Nexus Shield Dashboard via `nexus-api-key`.

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

### GitHub Marketplace

```yaml
name: Nexus Shield Security Scan

on:
  push:
    branches: [main, master]
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Nexus Shield Security Scan
        uses: baturhantasdelen-sudo/nexus-shield-action@v1
        with:
          api_key: ${{ secrets.NEXUS_SHIELD_API_KEY }}
          profile: 'TR'
          policy_file: '.nexus-shield.yml'
```

> **Marketplace:** [Nexus Shield Security Scan](https://github.com/marketplace/actions/nexus-shield-security-scan) — pin with `@v1` for stable major releases.

---

## ⚙️ Configuration Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `api_key` | Nexus Shield API key for `/api/v1/scan` | Yes | — |
| `profile` | Regional PII profile (`TR`, `US`, `GLOBAL`) | No | `TR` |
| `policy_file` | Policy file path (`.nexus-shield.yml`) | No | `.nexus-shield.yml` |

The action scans changed files in the commit/PR, requests **SARIF 2.1.0** output from the Nexus Shield API, and uploads results to the **GitHub Code Scanning** tab via `github/codeql-action/upload-sarif@v3`.

---

## 🏷️ Release Tags

Maintainers can publish major/minor tags with:

```bash
./scripts/release-v1.sh
```

On Windows:

```powershell
./scripts/release-v1.ps1
```

This creates and pushes `v1.0.0` plus a moving `v1` major pointer.

---

## 📄 License

Distributed under the MIT License. Built with ❤️ by Baturhan Taşdelen.
