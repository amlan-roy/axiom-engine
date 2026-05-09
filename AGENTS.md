# AGENTS.md

Game-agnostic, config-driven state machine for strategy/life-simulation games. Pure TypeScript library — no UI, no game content, no framework dependencies.

## Commands

| Task       | Command                 |
| ---------- | ----------------------- |
| Install    | `npm install`           |
| Dev server | `npm run dev`           |
| Test       | `npm run test`          |
| Coverage   | `npm run test:coverage` |
| Lint TS    | `npm run lint:scripts`  |
| Format all | `npm run format`        |

## Stack

- **Language:** TypeScript (strict mode, ESNext target)
- **Bundler:** Vite — outputs ES module + IIFE to `build/dist/`
- **Types:** `dts-bundle-generator` → `build/dist/index.d.ts`
- **Tests:** Vitest + `@vitest/coverage-v8`
- **Linting:** ESLint + typescript-eslint + prettier (errors on format violations)
- **Pre-commit:** Husky → lint-staged (formats `.ts/.html/.json` and `.css/.scss`)
- **Commits:** commitlint with `@commitlint/config-conventional` (required for semantic-release)
- **Releases:** semantic-release

## Path Aliases

```
@  → ./src/
@@ → ./  (repo root)
```

## Code Standards

- Named exports only (no default exports)
- Conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
- Every PR must include Vitest unit tests
- No unused locals/parameters (enforced by `tsconfig.json`)
