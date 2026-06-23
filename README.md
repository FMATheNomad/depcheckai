<div align="center">

# 🔍 depcheckai

### *"Stop shipping broken dependencies. One command tells you what's deprecated, risky, or needs replacing."*

[![GitHub Packages](https://img.shields.io/github/v/release/FMATheNomad/depcheckai?style=for-the-badge&logo=github&label=GitHub%20Packages)](https://github.com/FMATheNomad/depcheckai/pkgs/npm/depcheckai)
[![GitHub Release](https://img.shields.io/github/v/release/FMATheNomad/depcheckai?style=for-the-badge&logo=github)](https://github.com/FMATheNomad/depcheckai/releases)
[![GitHub Stars](https://img.shields.io/github/stars/FMATheNomad/depcheckai?style=for-the-badge&logo=github&color=yellow)](https://github.com/FMATheNomad/depcheckai/stargazers)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge&logo=opensourceinitiative)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/FMATheNomad/depcheckai/ci.yml?style=for-the-badge&logo=githubactions&label=CI)](https://github.com/FMATheNomad/depcheckai/actions)
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4%EF%B8%8F_Sponsor-Support_the_project-30363D?style=for-the-badge&logo=githubsponsors)](https://github.com/sponsors/FMATheNomad)
[![GitHub Downloads](https://img.shields.io/github/downloads/FMATheNomad/depcheckai/total?style=for-the-badge&logo=github&color=success)](https://github.com/FMATheNomad/depcheckai/pkgs/npm/depcheckai)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

# ⭐️ Support This Project ⭐️

**This is a free, open-source tool built by a solo founder. If it saves you from even one dependency-related outage or security incident, please:**

[![Star](https://img.shields.io/badge/%E2%AD%90_Star_this_repo-Support_the_project-yellow?style=for-the-badge)](https://github.com/FMATheNomad/depcheckai/stargazers)
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4%EF%B8%8F_Sponsor_on_GitHub-Support_the_creator-30363D?style=for-the-badge&logo=githubsponsors)](https://github.com/sponsors/FMATheNomad)

**Every star & sponsor helps a solo founder keep building free tools for everyone.** 🙏

---

> **Stop manually checking npm pages, scrolling through GitHub repos, and running five different CLI tools just to understand your dependency health. depcheckai scans your project's dependencies across npm, PyPI, and crates.io — then tells you what's broken, deprecated, or risky with actionable recommendations and alternatives. All in under 3 seconds.**

---

</div>

## 🚨 The Problem

Your project depends on 50+ packages. You have no idea which ones are:

- 🔴 **Deprecated** — still running in production but the maintainer said "please stop using this"
- 🟡 **Abandoned** — no commits in 2+ years, unanswered issues piling up
- ⚠️ **Risky** — major version behind, breaking changes coming, or security concerns
- ✅ **Healthy** — actually fine (but you're wasting time checking them manually)

**What do you do?**

| Approach | Time Spent | Misses Issues | Gives Alternatives |
|----------|-----------|---------------|-------------------|
| 🙋 Manual — check each package on npm/GitHub | 20-40 min per project | ✅ Many | ❌ |
| 🔧 npm audit — CVE check only | Instant | ❌ Deprecation, health, popularity | ❌ |
| 🤖 Dependabot — auto PRs | Automated | ❌ Health analysis | ❌ |
| 🔍 **depcheckai** | **< 3 seconds** | **✅ Comprehensive** | **✅ AI-powered suggestions** |

**Bottom line:** Existing tools tell you *about* security issues. **depcheckai tells you what to *do* about them** — replace, update, or ignore — with specific alternatives.

---

## 🎯 What depcheckai Does

```bash
# Scan your entire project — auto-detects package.json, requirements.txt, Cargo.toml
depcheckai

# Check any package from your terminal
depcheckai check lodash
depcheckai check request
depcheckai check react@18.2.0

# Full health audit with recommendations
depcheckai audit

# See update recommendations for all deps
depcheckai update

# Get JSON for CI/CD
depcheckai --json
```

### Real Output

```
$ depcheckai

✔ Scanned package.json — 10 dependencies found

depcheckai — Dependency Health Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Package              Ver       Health   Score  Action
─────────────────────────────────────────────────────────────
express             4.18.2    good      92      ✓ ok
lodash              4.17.21   good      88      ✓ ok
moment              2.29.4    risky     34    🔴 REPLACE → dayjs
request-deprecated  2.88.2    critical   8    🔴 REPLACE → axios
─────────────────────────────────────────────────────────────
4 dependencies | 1 critical | 1 risky | 2 good
```

---

## 📊 Why depcheckai? (vs Alternatives)

| Feature | You (Manual) | npm audit | Dependabot | Safety CLI | **depcheckai** |
|---------|-------------|-----------|------------|------------|-----------------|
| 🔍 CVE detection | ❌ | ✅ | ✅ | ✅ | ✅ |
| 📦 Deprecation detection | ❌ (manual check) | ❌ | ❌ | ❌ | ✅ |
| 🏥 Health score (maintenance + popularity) | ❌ | ❌ | ❌ | ❌ | ✅ |
| 🔄 Breaking change detection | ❌ | ❌ | ❌ | ❌ | ✅ |
| 💡 Actionable alternatives | ❌ | ❌ | ❌ | ❌ | ✅ |
| 🐍 Python (PyPI) support | ❌ | ❌ | ❌ | ✅ | ✅ |
| 🦀 Rust (crates.io) support | ❌ | ❌ | ❌ | ❌ | ✅ |
| 📊 Multiple output formats | ❌ | ❌ | ❌ | ❌ | ✅ (table, JSON, markdown) |
| 🤖 GitHub Action | ❌ | ❌ | ✅ | ❌ | ✅ |
| 💵 Price | ⏱ Your time | Free | Free (public) | Free | **Free & open source** |
| 📜 License | — | MIT | Proprietary | MIT | **MIT** |

**Bottom line:** Every other tool only solves *one* piece of the puzzle. **depcheckai is the first tool that gives you a complete health picture across ecosystems — and tells you exactly what to do.**

---

## ⚡ Quick Start

> **Package hosted on GitHub Packages.** Requires `.npmrc` with GitHub auth:
> ```
> //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
> @fmathenomad:registry=https://npm.pkg.github.com/
> ```

```bash
# Install globally
npm install -g @fmathenomad/depcheckai

# Or run instantly
npx @fmathenomad/depcheckai

# Scan your project
cd your-project
depcheckai

# Check a specific package with alternatives
depcheckai check request

# JSON output for CI/CD pipelines
depcheckai --json
```

### Supported Ecosystems

| Ecosystem | Manifest | Registry |
|-----------|----------|----------|
| 📦 npm | `package.json` | registry.npmjs.org |
| 🐍 PyPI | `requirements.txt` | pypi.org |
| 🦀 crates.io | `Cargo.toml` | crates.io |

---

## 🔧 Features

| Feature | Description |
|---------|-------------|
| 🔍 **Multi-Ecosystem Scan** | Auto-detect npm, PyPI, and crates.io manifests |
| 🏥 **Health Score** | Weighted 0-100 score: maintenance (35%), popularity (25%), compatibility (20%), security (20%) |
| 💡 **Smart Recommendations** | Not just "it's bad" — suggests specific alternatives (e.g., "Replace moment with dayjs") |
| 📊 **Multiple Formats** | Terminal table, JSON (CI/CD), Markdown (GitHub issues/PRs) |
| 🚦 **CI/CD Ready** | `--fail-on` flag + exit codes for pipeline integration |
| 🚀 **GitHub Action** | Drop-in action for PR comments and build failure |
| 💾 **Smart Caching** | 1-hour API response cache, aggressive GitHub rate-limit handling |
| ⚙️ **Configurable** | `.depcheckai.json` for teams and org-wide policies |

---

## 🔄 CI/CD Integration

### GitHub Action

```yaml
- name: Dependency Health Check
  uses: FMATheNomad/depcheckai@v1
  with:
    manifest-path: '.'
    format: 'markdown'
    fail-on: 'medium'
```

### JSON Output (any CI)

```bash
depcheckai --json --fail-on medium
echo $?  # 0 = pass, 1 = fail
```

### Pre-commit Hook

```bash
#!/bin/sh
depcheckai --json --fail-on low || exit 1
```

Save as `.git/hooks/pre-commit` and `chmod +x`.

---

## 🗺 Roadmap

- [x] npm ecosystem support
- [x] PyPI ecosystem support
- [x] crates.io ecosystem support
- [x] Health scoring (maintenance, popularity, compatibility, security)
- [x] Recommendation engine with alternatives
- [x] Table, JSON, Markdown output
- [x] GitHub Action
- [x] Config file (.depcheckai.json)
- [ ] **Interactive update mode** (`--interactive`) — v0.2
- [ ] **Pre-commit hook integration** — v0.2
- [ ] **VS Code extension** — v0.3
- [ ] **AI-powered changelog summarization** — v0.4

---

## 🧑‍💻 Development

```bash
git clone https://github.com/FMATheNomad/depcheckai.git
cd depcheckai
npm install
npm run build
npm test

# Test CLI locally
node dist/index.js --version
node dist/index.js check lodash
```

---

## 📜 License

MIT © [FMA Software Labs](https://fmasoftwarelabs.up.railway.app)

---

<div align="center">

## ⭐️ Support the Project ⭐️

**Built by a solo founder who got tired of deploying with outdated, deprecated, and risky dependencies.**

If depcheckai saves you even one dependency-related outage or security audit headache, please support it — every bit counts:

[![Star](https://img.shields.io/badge/%E2%AD%90_Star_on_GitHub-yellow?style=for-the-badge&logo=github)](https://github.com/FMATheNomad/depcheckai/stargazers)
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4%EF%B8%8F_Sponsor-30363D?style=for-the-badge&logo=githubsponsors)](https://github.com/sponsors/FMATheNomad)
[![Share on X](https://img.shields.io/badge/Share_on_X-black?style=for-the-badge&logo=x)](https://x.com/intent/tweet?text=Stop%20shipping%20broken%20dependencies.%20depcheckai%20scans%20your%20npm%2C%20PyPI%2C%20and%20crates.io%20dependencies%20and%20tells%20you%20what%27s%20deprecated%2C%20risky%2C%20or%20needs%20replacing.%20%F0%9F%94%8D%20Free%20%26%20open%20source.&url=https://github.com/FMATheNomad/depcheckai)
[![Share on Reddit](https://img.shields.io/badge/Share_on_Reddit-FF4500?style=for-the-badge&logo=reddit)](https://reddit.com/r/javascript/submit?title=depcheckai%3A%20AI-powered%20dependency%20health%20checker&url=https://github.com/FMATheNomad/depcheckai)

---

*Ship smarter. Stop shipping broken deps. Free for everyone. MIT licensed.*

[![FMA Software Labs](https://img.shields.io/badge/FMA_Software_Labs-000?style=for-the-badge&logo=github)](https://fmasoftwarelabs.up.railway.app)
[![@fmathenomad](https://img.shields.io/badge/@fmathenomad-000?style=for-the-badge&logo=x)](https://x.com/fmathenomad)
[![GitHub](https://img.shields.io/badge/FMATheNomad-000?style=for-the-badge&logo=github)](https://github.com/FMATheNomad)

</div>
