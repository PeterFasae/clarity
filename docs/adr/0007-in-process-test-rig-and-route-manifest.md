# 0007: An in-process test rig, a local HTTP adapter and one route manifest

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D3 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md)
- **Supersedes:** `docs/decisions.md` 1.7 (tests run on `serverless offline`) and 1.11 (`dev:local` reuses that rig), in the part that depends on `serverless offline` and `serverless.yml`. Their reasoning for using the real DynamoDB engine and for one shared rig stands. It also removes the cause of 0.15 (the `serverless@3` audit noise).
- **Evidence** (checked on 3 October 2026):
  - `services/api/tests/setup/global.js` reads table definitions out of `serverless.yml` with `js-yaml`, starts DynamoDB Local as a Java process, and starts `serverless offline`. `tests/helpers.js` calls Lambdas by name (`clarity-api-test-<name>`) through the emulator's invocation API on port 3998.
  - `docs/decisions.md` 1.8: `serverless offline` decodes a Cognito token without verifying it, so the tests already do not prove signature checking.
  - A throwaway spike on 3 October 2026 (kept outside the repository) found DynamoDB Local accepts an item of exactly 409,600 bytes and rejects 409,601, matching AWS's [documented sizing rules](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html). That supports keeping the real engine rather than a fake. Local is not AWS, so the same check is repeated on staging.
  - [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html): 6 MB request and response payload for synchronous invocation.

## Problem
The rig is built from `serverless.yml`, which D2 removes, and from `serverless-offline`, which belongs to the Serverless v3 plugin API that is no longer maintained. Table definitions need a new single home, and the local API needs a replacement that keeps `apps/web` working.

## Proposed approach
1. **Table definitions in one TypeScript module**, imported by the CDK Data stack and by the test rig. A schema change cannot pass tests and fail on deploy (the guarantee of decisions.md 1.7).
2. **DynamoDB Local stays.** It is the real engine, and Java is already a prerequisite.
3. **Handlers run in-process** with API Gateway-shaped proxy events, built by a small helper that includes `requestContext.authorizer.claims`. No HTTP server is needed for most tests.
4. **A thin local HTTP adapter** (Node's `http`) that turns a request into a proxy event, calls the handler and writes the response, for `npm run dev:local` and for tests that need real HTTP behaviour (CORS headers as emitted, routing).
   - It **binds only to 127.0.0.1**.
   - It **never enters a Lambda deployment package**: it lives outside any `NodejsFunction` entry's import graph, and a test checks the synthesised bundle does not contain it.
5. **One route manifest** (method, path, handler, auth mode) used by the CDK Api stack, the adapter and the tests.
6. **A synth-versus-routes consistency test.** It reads the synthesised CloudFormation template and fails if any route in the manifest is missing there, or any route in the template is missing from the manifest.
7. **Staging smoke tests are the proof of real API Gateway and Cognito behaviour**: refusing a missing or invalid token, CORS from the real integration, and signature verification.

## Alternatives considered
- **Keep `serverless-offline`.** Ties the repository to an unmaintained plugin API and to `serverless.yml`.
- **AWS SAM local or LocalStack.** Both need Docker and are slower, with more setup for a one-person project.
- **Test only against a deployed dev stage.** No offline work, a cost per run, and a slower loop.

## Trade-offs
- **What the rig no longer gives for free:** routing and the authorizer emulation that came from `serverless.yml`. The route manifest and the consistency test replace the routing guarantee.
- **What it cannot prove:** that API Gateway's Cognito authorizer refuses a bad token. The adapter will refuse requests with no token, so the existing `auth.test.js` cases keep their meaning for the handlers and the adapter. The real proof is the staging smoke test. `serverless offline` had the same limit (decisions.md 1.8).
- Test bodies are expected to stay the same. Setup and helpers change.

## Cost
No running cost. Java is already required. Effort is roughly one to two days (an estimate).

## Privacy and security
- The adapter's unsigned local test tokens are accepted only on the loopback interface, never in a deployed bundle.
- No new data is stored. Test credentials remain fake, local and in-memory.

## Migration risk
- The existing 121 tests must all pass on the new rig before anything is removed, and the test count never goes down.
- `serverless.yml` and the current rig stay in place until the replacement passes at least all 121 existing tests. They are removed only in the same change that installs the working CDK Api stack and the replacement rig.
- Until then the old rig is untouched, so rolling back means simply not switching over.

## Recommendation
As proposed.

---

## Decision
Peter's words, 3 October 2026:
> D3 — Accepted
>
> Approve:
> - DynamoDB Local;
> - handlers invoked in-process with API Gateway-shaped events;
> - a loopback-only local HTTP adapter;
> - one shared route manifest used by CDK, the adapter and tests;
> - a synth-versus-routes consistency test;
> - staging smoke tests as the proof of real API Gateway and Cognito behaviour.
>
> The adapter must bind only to 127.0.0.1 and must never enter a Lambda deployment package. Keep serverless.yml and the current rig until the replacement passes at least all 121 existing tests. Remove them only in the same change that installs the working CDK API stack and replacement rig.

## Consequences
- New modules: shared table definitions, the route manifest, the event helper and the adapter. All strict TypeScript.
- The roadmap's week 2 item 5 becomes this, with Gate 4 including the staging smoke test list.
- `docs/decisions.md` 1.7 and 1.11 carry a note pointing here.

## How to explain this
To be filled in when this lands.

## Questions a reviewer will ask
To be filled in when this lands.
