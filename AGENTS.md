# Repository Guidelines

## Project Structure & Module Organization

This repository contains a mobile-first financial-freedom H5 app built with Vue 3, TypeScript, Vite, and Ant Design Vue.

- `src/pages/` contains page-level Vue components; `src/App.vue` provides the application shell and repository wiring.
- `src/domain/` owns financial types, calculations, display logic, and budget presets.
- `src/repositories/` defines persistence interfaces and the versioned `localStorage` implementation.
- `src/utils/` contains shared formatting helpers; `src/styles.css` holds global styles.
- `tests/` mirrors source concerns with `domain/`, `repositories/`, and `utils/` suites.
- `docs/prd/` and `docs/spec/` contain product requirements and implementation specifications.

Keep business rules in `src/domain/`; pages must not access `localStorage` directly.

## Build, Test, and Development Commands

- `npm install` installs the locked dependency set from `package-lock.json`.
- `npm run dev` starts Vite at `http://127.0.0.1:5173/`; add `-- --port 5174` to change ports.
- `npm test` runs the Vitest suite once in jsdom.
- `npm run test:watch` reruns affected tests during development.
- `npm run build` performs strict Vue/TypeScript checking, then writes the production bundle to `dist/`.

## Coding Style & Naming Conventions

Follow existing TypeScript and Vue SFC style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline structures. Use `PascalCase.vue` for components, `camelCase` for functions and variables, and descriptive domain names such as `calculateBudgetSummary`. Keep TypeScript strict and prefer explicit domain types over untyped objects. No formatter or linter is configured, so match nearby code and rely on `npm run build` for type validation.

## Testing Guidelines

Vitest uses globals, jsdom, and `tests/setup.ts`. Name tests `*.test.ts` and place them in the matching area, for example `tests/domain/calculations.test.ts`. Add focused cases for formula boundaries, migrations, persistence failures, and date/month behavior. Any change to a financial formula or repository rule should include a regression test. There is no numeric coverage threshold; prioritize meaningful branch and edge-case coverage.

## Commit & Pull Request Guidelines

History favors short subject lines such as `支持年终奖, 移除无效target`; write concise, imperative commits describing one logical change. Before opening a PR, run `npm test` and `npm run build`. PRs should explain user-visible behavior, identify affected calculations or data migrations, link the relevant issue/spec, and include mobile screenshots for UI changes. Call out schema or `localStorage` compatibility risks explicitly.
