# @rootly/backstage-plugin-entity-processor

## 1.4.0

- Upgrade to Backstage 1.55.3 (`@backstage/plugin-catalog-node` 2.x, `@backstage/backend-plugin-api` 1.10)
- Import `catalogProcessingExtensionPoint` from the stable `@backstage/plugin-catalog-node` entry point instead of the deprecated `/alpha` export
- The module now targets Backstage instances on the new backend system running `@backstage/plugin-catalog-node` 2.x (Backstage 1.48+); no installation changes are required
- Remove unused `winston`, `yn`, and `@backstage/config` dependencies and the dead legacy `PluginEnvironment` type
- Toolchain: Node 24, Yarn 4.13.0, `@types/node` 24
- Add a CI workflow (typecheck, lint, test, build) for pull requests and pushes to `master`

## 1.3.2

- Retain compatibility with the `@rootly/backstage-plugin-common` 1.4 release line
- Remove unused RJSF, node-fetch, Zod, MSW, and Supertest dependencies
- Refresh vulnerable transitive dependencies and development tooling
- Retain Backstage catalog-node v1, TypeScript 5, and Node 20 compatibility

## 1.3.1

- Add entity kind guards to prevent wrong-kind annotations from corrupting Rootly resources
- `rootly.com/team-id` and `rootly.com/team-slug` annotations are now only processed for `kind: Group` entities
- `rootly.com/service-id` and `rootly.com/service-slug` annotations are now only processed for `kind: Component` entities
- Pre-existing wrong-kind annotations (e.g. a Component carrying `rootly.com/team-slug`) become silent no-ops after upgrading

## 1.3.0

- Add catalog entity processing support
- Detect `rootly.com/catalog-entity-id` and `rootly.com/catalog-entity-slug` annotations
- Auto-import catalog entities with `findOrCreateCatalog` (creates catalog if needed)
- Handle 422 duplicate entity gracefully (log info instead of error)
- Write back `rootly.com/catalog-entity-id` annotation on successful import
- Pass `rootly.com/catalog-description` to catalog creation


## 1.2.2

- Add missing await on import entity calls
- Upgrade import error logging from debug to error

## 1.2.1

- Fix missing module.cjs.js and processor files in published package

## 1.2.0

- Upgrade dependencies
- Update cipher base (#4)
- Remove unused dependencies (#3)
- Upgrade to yarn 4.9.2

## 1.1.0

- Fix entity processor error handling to prevent catalog processing failures

## 1.0.0

- Initial release
