# MIM — Environment Reproducibility & Verification Guide

> This document details the three standardized reproduction vectors available to engineers, recruiters, and auditors to verify the benchmarks, tests, and compilation integrity of **MIM**.

---

## 🛠️ Reproduction Matrix

| Verification Method | Command | Target Environment | Scope |
|:---|:---|:---:|:---|
| **1. Interactive CLI Tour** | `npm run demo` | Local Node 20+ | Live ~30s execution of SAGE, Aduana, NBT, and FOMO. |
| **2. Unified Test Runner** | `npm test` | Local / Headless CI | Executes 4 test suites (12 NBT, 125 SAGE, RAG, Aduana). |
| **3. Docker Container** | `docker run --rm mim-systems` | Any host with Docker | Isolated Linux container running tests & benchmarks. |
| **4. Cloud CI Workflow** | Push to `main` / `master` | GitHub Actions | Automated lint, test, build, and badge generation. |

---

## 🐳 Containerized Execution (Docker)

To verify the system in a clean, isolated Linux container without installing local dependencies:

```bash
# 1. Build the verification image
docker build -t mim-systems .

# 2. Run the automated systems test suite
docker run --rm mim-systems

# 3. (Optional) Run the live technical showcase tour in container
docker run --rm -it mim-systems npm run demo
```

---

## 💻 Local Execution (Host Machine)

### Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x+
- **Git**

```bash
# 1. Clone the repository
git clone https://github.com/Ian9Franco/MIM.git
cd MIM

# 2. Install dependencies
npm ci

# 3. Run the interactive technical showcase (30 seconds)
npm run demo

# 4. Run the full headless test & evaluation suite
npm test

# 5. Verify Next.js production compilation
npm run build
```

---

## 🤖 GitHub Actions CI Pipeline

The continuous integration pipeline is defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):
- Executes automatically on `push` and `pull_request` to `main` and `master`.
- Validates linting (`npm run lint`), runs headless test suites (`npm test`), and verifies the production bundle (`npm run build`).
- Live pipeline status: [![CI](https://github.com/Ian9Franco/MIM/actions/workflows/ci.yml/badge.svg)](https://github.com/Ian9Franco/MIM/actions).
