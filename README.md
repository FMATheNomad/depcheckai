# depcheck-ai

> AI that reads your dependencies — tells you what's broken, deprecated, or risky.

[![npm version](https://img.shields.io/npm/v/depcheck-ai.svg)](https://www.npmjs.com/package/depcheck-ai)
[![CI](https://github.com/FMATheNomad/depcheck-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/FMATheNomad/depcheck-ai/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/depcheck-ai.svg)](https://www.npmjs.com/package/depcheck-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/FMATheNomad/depcheck-ai)](https://github.com/FMATheNomad/depcheck-ai)

---

## The Problem

Every developer knows the pain:

- **Deprecated packages** still running in production
- **Abandoned dependencies** with no commits in years
- **Breaking changes** lurking in your next `npm update`
- **Security risks** beyond CVEs — bad patterns, unmaintained forks
- **No single tool** that tells you the full health picture

**npm audit** only checks CVEs. **Dependabot** only opens PRs. Neither tells you _should you replace this package?_

---

## What depcheck-ai Does

```bash
# Scan your project
depcheck-ai

# Check any package
depcheck-ai check lodash
depcheck-ai check moment

# Full audit
depcheck-ai audit

# Update recommendations
depcheck-ai update

# JSON for CI/CD
depcheck-ai --json
```

### Output

```
depcheck-ai — Dependency Health Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Package              Ver          Health     Score  Action
─────────────────────────────────────────────────────────────
express             4.18.2       good       92       ✓ ok
lodash              4.17.21      good       88       ✓ ok
moment              2.29.4       risky      34     🔴 REPLACE → dayjs
request-deprecated  2.88.2       critical   8      🔴 REPLACE → axios
─────────────────────────────────────────────────────────────
4 dependencies | 1 critical | 1 risky | 2 good
```

---

## Quick Start

```bash
# Install globally
npm install -g depcheck-ai

# Or run without installing
npx depcheck-ai

# Scan your project
cd your-project
depcheck-ai

# Check a specific package
depcheck-ai check express

# JSON output (CI-friendly)
depcheck-ai --json

# Markdown output (GitHub Issues/PRs)
depcheck-ai --markdown
```

---

## CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `depcheck-ai` | Auto-detect manifest & scan all deps |
| `depcheck-ai scan` | Same as above (explicit) |
| `depcheck-ai check <pkg>` | Check a single package |
| `depcheck-ai check <pkg>@<version>` | Check specific version |
| `depcheck-ai update` | Show update recommendations |
| `depcheck-ai audit` | Full health + security audit |
| `depcheck-ai init` | Generate config file |

### Options

| Flag | Description |
|------|-------------|
| `--manifest <path>` | Path to manifest file |
| `--eco <ecosystem>` | Filter by ecosystem (npm, pypi, crates) |
| `--json` | JSON output |
| `--markdown` | Markdown output |
| `--fail-on <level>` | Fail CI if below threshold (low, medium, high) |
| `--verbose` | Debug-level logging |
| `--silent` | No output (exit code only) |

---

## GitHub Action

```yaml
- uses: FMATheNomad/depcheck-ai@v1
  with:
    manifest-path: '.'           # or package.json, requirements.txt
    format: 'markdown'           # table, json, markdown
    fail-on: 'low'               # low, medium, high
    ecosystem: 'npm'             # optional filter
```

Add as a comment on PRs:
```yaml
- name: Dependency Health Check
  uses: FMATheNomad/depcheck-ai@v1
  with:
    format: markdown
    fail-on: medium
```

---

## Ecosystem Support

| Ecosystem | Manifest | Registry | Health Score | Alternatives |
|-----------|----------|----------|--------------|-------------|
| npm | package.json | registry.npmjs.org | ✅ | ✅ |
| PyPI | requirements.txt | pypi.org | ✅ | ✅ |
| crates.io | Cargo.toml | crates.io | ✅ | Coming soon |

---

## Scoring Methodology

### Overall Health Score (0-100)

| Component | Weight | What it measures |
|-----------|--------|------------------|
| **Maintenance** | 35% | Last commit, release frequency, version recency, changelog |
| **Popularity** | 25% | Downloads, GitHub stars, dependents, contributors |
| **Compatibility** | 20% | Breaking changes, peer deps, ESM/CJS support |
| **Security** | 20% | Known CVEs, deprecation status, license risk |

### Score Levels

| Level | Range | Meaning |
|-------|-------|---------|
| 🟢 good | 80-100 | Healthy — no action needed |
| 🟡 okay | 50-79 | Monitor — minor concerns |
| 🔴 risky | 30-49 | Needs attention — consider alternatives |
| ⛔ critical | 0-29 | Replace immediately |

### Maintenance Score Factors

| Factor | Weight | Scoring Logic |
|--------|--------|---------------|
| Last commit | 30% | ≤60 days = 100, ≤1 year = 50, >2 years = 0 |
| Release frequency | 25% | ≥12/year = 100, ≥2/year = 60, none = 0 |
| Version recency | 25% | On latest = 100, 1 major behind = 60, >2 = 0 |
| Changelog | 20% | GitHub repo with releases = 80, none = 30 |

### Popularity Score Factors

| Factor | Weight | Scoring Logic |
|--------|--------|---------------|
| Downloads/month | 35% | ≥10M = 100, ≥100K = 75, ≥1K = 40 |
| GitHub stars | 25% | ≥10K = 100, ≥1K = 80, ≥100 = 55 |
| Dependents | 25% | ≥1K = 100, ≥100 = 80, ≥10 = 60 |
| Contributors | 15% | ≥100 = 100, ≥20 = 70, ≥5 = 40 |

---

## Config (.depcheck-ai.json)

```json
{
  "ecosystems": ["npm", "pypi", "crates"],
  "failOn": "low",
  "format": "table",
  "cacheTtlMinutes": 60,
  "exclude": []
}
```

Generated via `depcheck-ai init`.

---

## Why depcheck-ai vs Others

| Tool | Security | Maintenance | Popularity | Compatibility | Recommendations | Multi-ecosystem |
|------|----------|-------------|------------|---------------|-----------------|-----------------|
| **npm audit** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **safety** (PyPI) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **cargo audit** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **dependabot** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **depcheck-ai** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Development

```bash
git clone https://github.com/FMATheNomad/depcheck-ai.git
cd depcheck-ai
npm install
npm run build
npm test

# Test CLI locally
node dist/index.js --version
node dist/index.js --manifest package.json
node dist/index.js check lodash
```

---

## Roadmap

- [x] npm ecosystem support
- [x] PyPI ecosystem support
- [x] crates.io ecosystem support
- [x] Health scoring (maintenance, popularity, compatibility, security)
- [x] Recommendation engine with alternatives
- [x] Table, JSON, Markdown output
- [x] GitHub Action
- [ ] `--interactive` update mode
- [ ] AI-powered changelog summarization (v2)
- [ ] VS Code extension
- [ ] Pre-commit hook

---

## License

MIT © FMATheNomad

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/FMATheNomad">FMATheNomad</a><br>
  <sub>If this tool saved you time, <a href="https://github.com/sponsors/FMATheNomad">sponsor me</a> or <a href="https://github.com/FMATheNomad/depcheck-ai">star the repo</a></sub>
</p>
