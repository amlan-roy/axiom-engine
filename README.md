# axiom-engine

Axiom Engine is a game-agnostic, config-driven state machine designed to power any strategy or life-simulation game. The engine itself knows nothing about game concepts like health, money, careers, or relationships. Instead, everything domain-specific, what state looks like, what actions exist, what can happen randomly, and what is permanently forbidden, is declared in a Game Config that you hand to the engine.

## Configurations

- ESM modules
- IIFE bundle for direct browser support without bundler
- Typings bundle
- ESLint - scripts linter
- Stylelint - styles linter
- Commitlint - lint the commits
- Prettier - formatter
- Vitest - test framework
- Husky + lint-staged - pre-commit git hook set up for formatting

## Commands

The starter contains the following scripts:

- `dev` - starts dev server
- `build` - generates the following bundles: ESM (`.js`) and IIFE (`.iife.js`). The name of bundle is automatically taken from `package.json` name property
- `test` - starts vitest and runs all tests
- `test:coverage` - starts vitest and run all tests with code coverage report
- `lint:scripts` - lint `.ts` files with eslint
- `lint:styles` - lint `.css` and `.scss` files with stylelint
- `format:scripts` - format `.ts`, `.html` and `.json` files with prettier
- `format:styles` - format `.cs` and `.scss` files with stylelint
- `format` - format all with prettier and stylelint
- `prepare` - script for setting up husky pre-commit hook
- `uninstall-husky` - script for removing husky from repository
