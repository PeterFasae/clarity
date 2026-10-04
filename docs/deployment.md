# Deploying Clarity

Nothing is deployed yet. Everything below has been prepared and validated as far
as it can be without AWS credentials: `serverless package` runs clean for both
stages, and the generated CloudFormation has been inspected resource by resource
(see the checks at the bottom). What has **not** happened is a real deploy, so
no number in this repository describes production behaviour.

---

## Before the first deploy

You need:

- An AWS account and credentials with permission to create Lambda, API Gateway,
  DynamoDB, Cognito, IAM roles, CloudWatch alarms and SNS topics.
- The AWS CLI (`brew install awscli`), which is **not** currently installed on
  this machine.
- Node.js 24, as pinned in `.nvmrc` (ADR 0006). Lambda runs the same major version.
- Optionally an Anthropic API key. Without one the LLM engine reports itself
  unconfigured and every account is answered by the local engine — which is the
  correct behaviour for a deployment that has not opted in, not a failure.

```bash
aws configure          # or export AWS_PROFILE=clarity
aws sts get-caller-identity   # confirm you are who you think you are
```

---

## Deploy

The service takes two stages. `dev` is disposable; `prod` holds real data and
its tables carry `DeletionPolicy: Retain`, so removing the stack will **not**
delete them.

```bash
npm install
npm test                       # 121 tests; do not deploy from a red tree
npm run build                  # typechecks and builds both frontends
```

```bash
ALLOWED_ORIGINS="https://app.example.com,https://www.example.com" \
ANTHROPIC_API_KEY="sk-ant-..." \
npx serverless deploy --stage prod --verbose
```

`ALLOWED_ORIGINS` matters. It has no sensible default for a real deployment, so
the fallback is localhost — which fails closed: a deployed frontend on any other
origin will be refused by CORS until this is set correctly. That is the safe
direction to fail in, but it will look like a broken app if you forget.

**Watch your shell.** Every `${env:...}` in `serverless.yml` is resolved at
package time from whatever is in the environment of the machine running the
command. `ANTHROPIC_BASE_URL` in particular exists so the test rig can redirect
the SDK at a local recorder — if it is set in your shell when you deploy, that
value is baked into the Lambda. Deploy from a clean shell, or set it explicitly.

### After the first deploy only

Capture the stack outputs and wire the frontends and the alarm topic:

```bash
npx serverless info --stage prod --verbose      # UserPoolId, UserPoolClientId, ServiceEndpoint, AlarmTopicArn
```

```bash
# An alarm nobody receives is decoration.
aws sns subscribe --topic-arn <AlarmTopicArn> \
  --protocol email --notification-endpoint you@example.com
```

Then set the frontend environment variables (Vercel dashboard, or `.env.local`
for a local build against the deployed API):

```
VITE_API_BASE_URL=<ServiceEndpoint>
VITE_COGNITO_USER_POOL_ID=<UserPoolId>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId>
# VITE_LOCAL_AUTH must be absent or false. It is compiled out of production
# builds regardless, but do not rely on that alone.
```

### Frontends

Both are static SPAs with `vercel.json` rewrites already in place.

```bash
npx vercel deploy --prod --cwd apps/site
npx vercel deploy --prod --cwd apps/web
```

---

## Smoke test, in order

Run these against the deployed `ServiceEndpoint`. The first two need no account
and prove the two things most likely to be wrong on a first deploy.

```bash
API=<ServiceEndpoint>
```

**1 — every route refuses an unauthenticated request.** Anything other than 401
here means the authorizer is not attached and you should roll back.

```bash
for path in notes actions me/preferences; do printf '%s ' "$path"; curl -s -o /dev/null -w '%{http_code}\n' "$API/$path"; done
```

**2 — CORS refuses an origin that is not on the allowlist.** The response must
carry no `access-control-allow-origin` header at all.

```bash
curl -s -D - -o /dev/null -X OPTIONS "$API/notes" -H 'Origin: https://not-on-the-list.example' | grep -i access-control
```

**3 — a real round trip.** Create a user in the Cognito console (or via
`aws cognito-idp admin-create-user`), sign in through the deployed app, and from
the browser's network tab confirm: a note saves, `summary` and `actions` come
back populated, and `content` is byte-identical to what you typed.

**4 — the privacy guarantee, in production.** With AI assistance off (the
default), CloudWatch should show no outbound Anthropic calls. The repository
test proves this locally; confirm the deployed behaviour matches by leaving the
flag off and checking the `LlmFallbacks` metric stays at zero and no billing
appears on the Anthropic account.

**5 — the alarms fire.** Temporarily set an alarm's threshold to something that
will trip, confirm the email arrives, and set it back.

---

## Then, and only then, the latency numbers

Report §5.4 publishes 240ms / 275ms / 310ms averages with a 590ms maximum for a
deployed system. **Nothing measured on a laptop is comparable to that**, which
is why the local figures in `docs/decisions.md` are labelled a lower bound and a
regression detector rather than a reproduction.

To take the real measurement:

```bash
npm run latency -w services/api -- \
  --base "$API" \
  --user "<a real Cognito sub>" \
  --corpus 500 \
  --samples 100
```

Two things to record honestly when you do:

- The harness mints its own unsigned token, which the real API Gateway will
  reject. Against a deployed stage it needs a genuine Cognito id token — expect
  to adapt `scripts/latency.js` to take one, and note that in the write-up.
- **Run it with AI assistance off**, because that is the default and the state
  almost every account will be in. A separate run with the flag on measures a
  different system, and the two must not be reported as one number.

Until that run happens, the honest statement is: the handler work itself costs
single-digit milliseconds, and the deployed figure is unknown.

---

## What was verified without credentials

`serverless package` succeeds for `--stage dev` and `--stage prod`. The
generated template was inspected and contains:

- **102 resources**, including 13 Lambda functions, 13 log groups with 30-day
  retention, 2 DynamoDB tables, a Cognito user pool and client, 4 CloudWatch
  alarms and an SNS topic.
- **13 API Gateway methods. 12 require `COGNITO_USER_POOLS`**; the single
  exception is `OPTIONS`, which must be unauthenticated because browsers send no
  credentials on a preflight.
- **13 separate IAM roles, one per function, with no wildcard resources.** The
  only non-DynamoDB permissions granted anywhere are `logs:CreateLogGroup`,
  `logs:CreateLogStream`, `logs:PutLogEvents` and `logs:TagResource`.
  `deleteNote` holds `dynamodb:DeleteItem` and nothing else — ownership is
  enforced by a `ConditionExpression`, not by a prior read.
- **All seven environment variables** on every function: `NOTES_TABLE`,
  `PREFERENCES_TABLE`, `ALLOWED_ORIGINS`, `DYNAMODB_ENDPOINT`,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` and `ANTHROPIC_TIMEOUT_MS`
  (defaulting to `6000`, comfortably inside the 10s function timeout so the
  local fallback always has room to run).
- **Both tables** with `PAY_PER_REQUEST`, SSE enabled, point-in-time recovery
  enabled, and `DeletionPolicy: Retain`.
- Runtime `nodejs20.x` on `arm64`, 512MB, 10s timeout.

Not verified, because it needs an account: that the stack actually creates, that
the Cognito authorizer accepts a real token, that CORS behaves identically at
the API Gateway edge, and every number above under "latency".

---

## Not done yet

- **Provisioned concurrency** on the hot paths, which report §4.6 names as the
  mitigation for cold starts. It costs money per hour whether or not anyone is
  using it, so it is deliberately left until there is a deployment worth warming
  and a measurement showing cold starts actually hurt.
- **A custom domain**, which is blocked on the open domain and trademark
  question in CONTEXT.md §4.1.
- **A real waitlist endpoint.** The form currently validates and says plainly
  that no address was stored.
