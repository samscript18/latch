# Chainlink confidential policy

LATCH uses a real TypeScript CRE Confidential Workflow in `packages/cre-workflow`. The authorization orchestrator calls it only after fresh ENSv2 authorization succeeds. An unavailable, malformed, or version-mismatched result fails closed, and no capability may execute.

The implementation is pinned to `@chainlink/cre-sdk@1.20.1`, verified against the current official Chainlink Confidential Workflows documentation on 2026-09-10.

## Confidential boundary

`packages/cre-workflow/src/main.ts` registers an HTTP trigger with `handlerInTee`. Inside its `TeeRuntime` callback it:

1. strictly validates the public action proposal;
2. fetches `LATCH_PROCUREMENT_POLICY` with `runtime.getSecret`;
3. validates and evaluates the private policy;
4. returns only a minimal public verdict.

The private secret contains the demo-only maximum autonomous spend and vendor allowlist. Neither value is present in workflow configuration, application logs, MongoDB, audit events, API responses, or browser state. The handler also avoids logging its request and intermediates.

An approved result is:

```json
{
  "approved": true,
  "policyVersion": "procurement-v1",
  "reasonCode": "POLICY_ALLOWED"
}
```

Amount, vendor, version, and any other policy failure all produce the same external denial:

```json
{
  "approved": false,
  "policyVersion": "procurement-v1",
  "reasonCode": "POLICY_DENIED"
}
```

The strict result schema rejects extra fields. This prevents the workflow from exposing the threshold, allowlist, or a detailed cause.

## Local tests

The pure evaluator has deterministic tests for the required allowed, excessive-amount, unapproved-vendor, version-mismatch, and non-disclosure cases:

```bash
npm run test --workspace=@latch/cre-workflow
npm run typecheck --workspace=@latch/cre-workflow
```

These tests validate policy logic but are not CRE execution evidence.

## Official CRE simulation

Install the current CRE CLI using Chainlink's official instructions and verify it:

```bash
cre version
```

Provide the demo policy through your shell or an uncommitted `.env`. The value below is the internal deterministic fixture required by `AGENTS.md`; never show the setup command or secret value in public demo captures, logs, API responses, or UI.

```bash
export LATCH_PROCUREMENT_POLICY_ALL='{"policyVersion":"procurement-v1","maxAutonomousSpendCents":200000,"allowedVendors":["demo-vendor-a","demo-vendor-b"]}'
```

Then simulate from the repository root. The npm command keeps this repository on npm while invoking the official CRE CLI:

```bash
npm run cre:simulate
```

At the HTTP-trigger prompt, use the configured procurement ENS name and one of these public inputs.

Allowed fixture:

```json
{
  "taskId": "verify-approved",
  "agent": "procurement.<configured-parent-name>",
  "capability": "procurement.purchase",
  "vendor": "demo-vendor-a",
  "amountCents": 124000,
  "policyVersion": "procurement-v1"
}
```

Denied fixture:

```json
{
  "taskId": "verify-denied",
  "agent": "procurement.<configured-parent-name>",
  "capability": "procurement.purchase",
  "vendor": "demo-vendor-a",
  "amountCents": 470000,
  "policyVersion": "procurement-v1"
}
```

Expected sanitized outcomes:

```text
$1,240 scenario -> APPROVED
$4,700 scenario -> DENIED
```

For non-interactive capture, use the current CLI form:

```bash
cre workflow simulate packages/cre-workflow \
  --target staging-settings \
  --non-interactive \
  --trigger-index 0 \
  --http-payload '<public-input-json>'
```

## Application adapter

Set `CRE_WORKFLOW_URL` to the official workflow HTTP endpoint and use:

```bash
npm run verify:chainlink
```

`scripts/verify-chainlink.ts` validates both sanitized outcomes against the same strict shared schema used by the NestJS adapter. It never substitutes a local result for CRE evidence.

For a deployed HTTP trigger, add the authorized EVM key to workflow configuration before deployment. The staging config intentionally omits it because official local simulation accepts an empty trigger config. Do not deploy that simulation configuration. Confidential Workflow access is currently private beta and must be enabled for the owner's CRE organization.

## Evidence checklist

Save under `evidence/chainlink/`:

- CLI version output;
- successful workflow build/simulation identification;
- sanitized approved result for $1,240;
- sanitized denied result for $4,700;
- workflow execution/reference identifiers, if available.

Do not capture shell history, `.env`, secret upload contents, the threshold, the vendor allowlist, or enclave-internal values. Do not label unit-test output as Chainlink evidence.
