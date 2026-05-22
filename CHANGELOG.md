# @rootly/backstage-plugin-entity-processor

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
