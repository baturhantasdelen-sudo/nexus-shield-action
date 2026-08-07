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
          nexus-api-key: ${{ secrets.NEXUS_API_KEY }}
          fail-on-detection: "true"
```

---

## ⚙️ Configuration Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `github-token` | GitHub token for reading diffs & posting PR comments | Yes | `${{ github.token }}` |
| `nexus-api-key` | Optional API key for anonymous leak stats telemetry | No | `""` |
| `fail-on-detection` | Fail the workflow step if any leak is detected (`true`/`false`) | No | `"true"` |

---

## 📄 License

Distributed under the MIT License. Built with ❤️ by Baturhan Taşdelen.
