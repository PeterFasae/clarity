# 0006: AWS CDK v2 in TypeScript, Node.js 24 on arm64

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D2 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md)
- **Supersedes:** the infrastructure and runtime part of CONTEXT.md §4.4 (Serverless Framework v3, `nodejs20.x`) and BUILD.md Phase 0, step 7.
- **Evidence** (checked on 3 October 2026):
  - [AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html), as the page read when fetched:

    | Runtime | Deprecated | Function creation blocked | Function updates blocked |
    |---|---|---|---|
    | `nodejs20.x` | 30 April 2026 | 29 July 2027 | 31 August 2027 |
    | `nodejs22.x` | 30 April 2027 | 1 June 2027 | 1 July 2027 |
    | `nodejs24.x` | 30 April 2028 | 1 June 2028 | 1 July 2028 |
    | `nodejs26.x` | not scheduled | not scheduled | not scheduled |

    The same page says Node.js 26 is in **public preview**, "not covered by the Lambda SLA or Technical Support" and "should not be used for production workloads", with general availability targeted for November 2026.
  - **A date to reconcile.** Peter's decision text says AWS lists Node.js 20 updates as blocked from 3 March 2027. The public page did not show that date on 3 October 2026; it shows 31 August 2027. The Node.js 22 dates in his text match the page. This ADR records the page. If 3 March 2027 came from an AWS Health Dashboard notice or an email, that source should be added here. It changes nothing in the decision: Node.js 20 is already deprecated.
  - [Lambda handlers in Node.js](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html): "Callback-based function handlers are only supported up to Node.js 22. Starting from Node.js 24, asynchronous tasks should be implemented using async function handlers."
  - [AWS CDK v2 Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html): CDK supports TypeScript, JavaScript, Python, Java, C#/.NET and Go, and deploys through CloudFormation.
  - Serverless Inc., [Serverless Framework V4: a new model](https://www.serverless.com/blog/serverless-framework-v4-a-new-model): V.3 "will continue to be maintained via critical security and bug fixes through 2024". V.4 introduces fees for organisations with annual revenue above $2M; smaller organisations are exempt.

## Problem
- `services/api/serverless.yml` pins `nodejs20.x`, which AWS deprecated on 30 April 2026. Existing functions can still be updated until the block date, but a new project should not start on a deprecated runtime.
- Serverless Framework v3 has had no fixes since the end of 2024. Its replacement (v4) needs an account and a licence arrangement, which Clarity would not otherwise need.
- The local machine runs Node.js 23.1.0, an odd-numbered release that never becomes LTS, and `package.json` allows `>=20`. Local, CI and Lambda are not on the same version.

## Proposed approach
- **AWS CDK v2 in TypeScript**, in a new `infra/` workspace: Data, Auth, Api, Events (later) and Observability stacks. cdk-nag runs on every synth, and each suppression carries a written reason.
- **Node.js 24 on arm64** through `NodejsFunction`. Node.js 24 is chosen because it gives the longest supported runway (deprecation 30 April 2028) and avoids another runtime migration soon. It is not chosen because Node.js 22 would expire during the pilot: Node.js 22 is deprecated on 30 April 2027 and updates are blocked from 1 July 2027, which is after the 12-week pilot window.
- **Node.js 26 is preview and is not used in production.**
- **Strict TypeScript for new or touched backend handlers.** The remaining handlers migrate incrementally. `packages/core` is already TypeScript.
- **One Node version everywhere.** `.nvmrc` and `engines` pin the same major version used by Lambda (24), CI uses the same file, and the local machine moves off 23.1.0 before the CDK work starts.

## Alternatives considered
- **Serverless Framework v4.** Smallest change, but it needs a Serverless account and sits under a licence that is free for Clarity today only because of its revenue.
- **AWS SAM.** Official and simple, but YAML-first, with fewer ways to share definitions with tests.
- **Terraform or OpenTofu.** Capable, but a second language and state backend for no benefit here.
- **Stay on Serverless v3 and Node.js 20.** Nothing to build, but unmaintained and deprecated.
- **Node.js 22.** Supported until 30 April 2027, which is fine for the pilot but leaves a migration soon after.

## Trade-offs
CDK costs more up front (several days of infrastructure code) and gives typed definitions shared with the test rig (see ADR 0007), cdk-nag, and no vendor licence. TypeScript handlers add a build step through `NodejsFunction`'s esbuild.

## Cost
Tooling is free. CDK bootstrap creates a small asset bucket and IAM roles in the account. Effort is roughly two to three days for the first four stacks (an estimate, not a measurement).

## Privacy and security
- Each function keeps its own least-privilege role, as `serverless-iam-roles-per-function` provides today.
- A Cognito user pool's schema attributes cannot be changed after creation, so the Auth stack must be right before the first deploy.
- The GitHub-to-AWS trust (OIDC, no long-lived keys) is D5, week 2.

## Migration risk
- Nothing is deployed, so there is no live migration.
- **Callback handlers: none.** All 13 handlers in `services/api/functions/` are `async` functions, and the shared `withAuth` wrapper in `services/api/lib/handler.js` returns an `async` function. No `callback` appears in `functions/` or `lib/`. This was checked on 3 October 2026 and the check repeats when handlers are converted to TypeScript.
- Test function names (`clarity-api-test-<name>`, `tests/helpers.js`) are tied to `serverless offline`. ADR 0007 replaces them.

## Recommendation
CDK, TypeScript and Node.js 24.

---

## Decision
Peter's words, 3 October 2026:
> D2 — Accepted with factual corrections
>
> Use AWS CDK v2 in TypeScript, Node.js 24 on arm64, and strict TypeScript for new or touched backend handlers. Migrate the remaining handlers incrementally.
>
> Correct the runtime explanation before recording the ADR:
> - AWS currently lists Node.js 20 function updates as blocked from 3 March 2027, not 31 August 2027.
> - Node.js 22 is deprecated on 30 April 2027 and updates are blocked from 1 July 2027.
> - Therefore Node.js 22 does not reach end of support inside this 12-week pilot window.
> - Choose Node.js 24 because it gives the longest production-supported runway and avoids another near-term migration, not because Node.js 22 expires during the pilot.
> - Node.js 26 is preview and must not be used for production.
>
> Also verify that no handler uses the callback-style Lambda signature removed from Node.js 24, and pin the local and CI Node version consistently.

## Consequences
- `infra/` is scaffolded next (roadmap week 1, item 4), with `engines` and `.nvmrc` set to Node.js 24 in the same change.
- The local Node version moves to 24 before that work.
- The Node.js 20 block date stays open in the evidence above until the source of 3 March 2027 is identified.

## How to explain this
To be filled in when this lands.

## Questions a reviewer will ask
To be filled in when this lands.
