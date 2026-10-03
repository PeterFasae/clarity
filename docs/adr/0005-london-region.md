# 0005: Europe (London), eu-west-2, as the primary region

- **Status:** Accepted on 3 October 2026.
- **Date:** 2026-10-03
- **Decision owner:** Peter Fasae
- **Roadmap item:** D1 in [`docs/plan/backend-roadmap.md`](../plan/backend-roadmap.md)
- **Supersedes:** the region choice (`eu-north-1`, Stockholm) in BUILD.md Phase 0, step 7, and the region part of CONTEXT.md §4.4. The rest of §4.4 (Lambda, DynamoDB, Cognito) stands.
- **Evidence** (all checked on 3 October 2026):
  - AWS General Reference, service endpoints, each listing **Europe (London), `eu-west-2`**:
    - [Amazon Cognito](https://docs.aws.amazon.com/general/latest/gr/cognito_identity.html): user pools endpoint `cognito-idp.eu-west-2.amazonaws.com`.
    - [Amazon DynamoDB](https://docs.aws.amazon.com/general/latest/gr/ddb.html): `dynamodb.eu-west-2.amazonaws.com`.
    - [AWS Lambda](https://docs.aws.amazon.com/general/latest/gr/lambda-service.html): `lambda.eu-west-2.amazonaws.com`.
    - [AWS KMS](https://docs.aws.amazon.com/general/latest/gr/kms.html): `kms.eu-west-2.amazonaws.com`.
    - [Amazon EventBridge Scheduler](https://docs.aws.amazon.com/general/latest/gr/eventbridgescheduler.html): `scheduler.eu-west-2.amazonaws.com`.
    - [Amazon SES](https://docs.aws.amazon.com/general/latest/gr/ses.html): sending (`email.eu-west-2.amazonaws.com`, `email-smtp.eu-west-2.amazonaws.com`) and **email receiving** (`inbound-smtp.eu-west-2.amazonaws.com`).
    - [Amazon API Gateway](https://docs.aws.amazon.com/general/latest/gr/apigateway.html): `apigateway.eu-west-2.amazonaws.com` and `execute-api.eu-west-2.amazonaws.com`.
  - [AWS Data Privacy FAQ](https://aws.amazon.com/compliance/data-privacy-faq/): "As a customer, you choose the AWS Region(s) in which your customer content is stored." AWS "will not move or replicate your content outside of your chosen AWS Region(s), except as necessary to provide the services you initiated, or as necessary to comply with the law or a binding order of a governmental body."
  - [AWS service endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html), "Global endpoints": a few services have one global endpoint that spans Regions (IAM, CloudFront, Route 53, AWS Organizations, Global Accelerator, among others). Data handled by those is outside any one Region's boundary.
  - European Commission, [press release IP/25/3059](https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_25_3059/IP_25_3059_EN.pdf), 19 December 2025: the Commission renewed the two 2021 adequacy decisions for the United Kingdom, with a sunset clause running until 27 December 2031 and a review after four years. This covers personal data flowing from the EEA to the UK, so it is supporting context for any EU users, not the reason for this choice.
  - Information Commissioner's Office, [International transfers: a guide](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-transfers-a-guide/): a transfer of personal data out of the UK needs adequacy regulations or an appropriate safeguard.
  - **Not confirmed from a static AWS page:** that Lambda's `arm64` architecture is available in `eu-west-2`. AWS says arm64 is "available in most AWS Regions" and shows the list in a drop-down that does not render as text. The first `cdk synth` and deploy to London settles it in week 2; if it fails, the fix is `x86_64`, a one-line change.
  - **Not retrieved:** DynamoDB, Lambda and KMS prices for London against Stockholm. AWS's pricing pages did not render as text. Check in the AWS Pricing Calculator before claiming any difference.

## Problem
The API was scaffolded for `eu-north-1` (Stockholm) in Phase 0 (`services/api/serverless.yml:34`, `services/api/tests/setup/global.js:41,42,102`). The intended pilot is UK-based. Nothing is deployed, so a move costs a few lines now. After the first deploy it would mean a new Cognito user pool (users cannot be moved between pools) and a data migration.

## Proposed approach
Use `eu-west-2` (London) as the primary region for every stack: Data, Auth, Api, Events and Observability.

## Alternatives considered
- **Stay in `eu-north-1` (Stockholm).** Nothing to change, but the data would sit outside the UK for a UK pilot, and moving later is a migration.
- **`eu-west-1` (Ireland).** Not checked for this decision. It is a larger region, but it is not the UK.

## Trade-offs
- London keeps the primary storage of a UK pilot's content in the UK. It does not make Clarity "UK-only": see the next section.
- **No claim is made that London is faster or cheaper.** Neither was measured. The latency harness in `services/api/scripts/latency.js` can compare them from a UK client once there is a deployed stage.

## Cost
Not compared (see the evidence note above). At pilot scale the roadmap's guardrail is about £20 a month for everything, and table cost is pennies in either region. One-off effort: a few lines of configuration and documentation.

## Privacy and security
- **What the ADR may say, and what it may not.** Regional customer content stays in the selected AWS Region, subject to AWS's documented exceptions: global services, operational data, and the behaviour of individual services. Public copy must not say "your notes never leave the UK". The accurate statement is the one above, and the list of exceptions is built during the week 10 security and privacy review.
- **Not settled by this ADR:** where an AI provider processes text (D19), where email arrives from (SES receiving is available in London, D16), and what AWS or other sub-processors may access for support or operations.
- No new data is stored.

## Migration risk
- Four lines of code to change when `infra/` and the new test rig land (`serverless.yml:34` and `tests/setup/global.js:41,42,102`), plus the sentence in `.claude/CLAUDE.md` that names the region. BUILD.md keeps its history.
- Local tests use fake credentials against DynamoDB Local, so they do not depend on the region.
- Rollback is the same few lines.

## Recommendation
London, because the pilot is UK-based and this is the last cheap moment to choose.

---

## Decision
Peter's words, 3 October 2026:
> D1 — Accepted: Europe (London), eu-west-2
>
> Choose eu-west-2 as Clarity’s primary AWS region. The intended pilot is UK-based, and choosing London before the first deployment avoids a later Cognito and data migration.
>
> Describe this accurately: regional customer content stays in the selected AWS region subject to AWS’s documented global-service, operational-data and service-specific exceptions. Do not claim London is faster or cheaper without measurements.
>
> Use official AWS sources in the ADR. Cognito, DynamoDB, Lambda, KMS, EventBridge Scheduler, SES sending and SES email receiving are all available in London. The renewed EU adequacy decision may be supporting context, but use the ICO or European Commission rather than a secondary legal source.

## Consequences
- Every stack targets `eu-west-2`. The change to code and configuration is made with the CDK scaffold (D2), not before.
- No copy anywhere may claim London is faster or cheaper until measured.
- Residency wording follows the accurate statement above and is reviewed in week 10.
- Week 2 checks `arm64` in London on the first synth and deploy.

## How to explain this
To be filled in when this lands.

## Questions a reviewer will ask
To be filled in when this lands.
