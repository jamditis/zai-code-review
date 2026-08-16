# Contributing

Thank you for your interest in contributing!

## Issues and pull requests

If you have suggestions for improvements, you can contribute by opening an issue. If you'd like to introduce changes to the project, see the instructions below.

## Project structure

```
src/index.mjs     # Action entry point
src/review.mjs    # Review and API functions
test/             # Unit tests
dist/index.mjs    # Compiled bundle used by the runner
action.yml        # Action metadata and input definitions
```

The action runs from `dist/index.mjs`. The bundle includes the source and its dependencies. [`@vercel/ncc`](https://github.com/vercel/ncc) creates the bundle.

## Development setup

**Prerequisites:** Node.js 24+

```bash
git clone https://github.com/tarmojussila/zai-code-review.git
cd zai-code-review
npm ci
```

## Making changes

Edit the source files. Then run the tests and rebuild the bundle:

```bash
npm test
npm run build
```

Commit the `dist/` directory. The GitHub Actions runner executes `dist/index.mjs` directly. It does not run `npm install` or build steps.

## Submitting a pull request

1. Fork the repository and create a branch from `main`
2. Make your changes in `src/` and `test/`
3. Run `npm test` and `npm run build`
4. Commit changes to `src/`, `test/`, and `dist/`
5. Open a pull request against `main`

Please keep PRs focused — one fix or feature per PR.

## Releases

Releases are tagged using semantic versioning (e.g. `v0.1.1`). After a PR is merged to `main`, a maintainer will tag the release.

Users reference the action by tag in their workflows. The tagged `dist/index.mjs` and `action.yml` files are what GitHub executes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
