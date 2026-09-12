# Testing and verification

LATCH separates deterministic software tests from live integration verification. A passing unit test proves application behavior; it does not prove that an external identity, confidential workflow, Recipe, provider, or contract deployment is connected.

## Required repository gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run contracts:test
npm audit --audit-level=high
```

Run all gates from the repository root with Node.js 22.x and npm 11.x.

## Coverage map

| Boundary           | Verified behavior                                                              |
| ------------------ | ------------------------------------------------------------------------------ |
| Shared schemas     | Valid domain objects, strict rejection, denial-code stability                  |
| ENS parsing        | Normalization, text-record parsing, malformed values, unresolved names         |
| ENS authorization  | Wallet, organization, status, role, capability, and version checks             |
| ENS administration | Protected writes, safe profile delegation, permission removal, revocation      |
| CRE evaluator      | Allowed/denied outcomes, version mismatch, non-disclosure                      |
| CRE adapter        | Timeout, malformed result, extra-field rejection, unavailable endpoint         |
| Planning           | Capability-specific structured output and untrusted JSON rejection             |
| Procurement        | Provider price integrity, integer totals, single-use authorization             |
| Research           | Immutable query proposal, policy gating, Tavily response validation            |
| Bazantic Recipe    | Authentication, idempotency, digest binding, one evaluation, receipt conflict  |
| Wallet auth        | Nonce expiry, signature verification, replay resistance, session scoping       |
| Task orchestration | Valid state transitions and no execution after denial                          |
| Audit contract     | Recorder authorization, duplicate protection, zero identifiers, event emission |

## Live ENS verification

Configure the organization namespace, worker names, expected wallets, universal resolver, and Sepolia RPC. Then run:

```bash
npm run verify:ens
```

To include the opt-in network test in the API suite:

```bash
RUN_LIVE_ENS_TESTS=true npm run test --workspace=@latch/api
```

The test is skipped without explicit opt-in because it depends on user-controlled names and network availability.

Verify record-level permissions separately:

```bash
npm run ens:verify-permissions
npm run ens:verify-permissions -- --execute
```

The expected result is an allowed `latch.profile` write and a rejected protected-role write.

## Chainlink CRE verification

Run the official CLI simulation and endpoint verification described in [Chainlink](CHAINLINK.md):

```bash
npm run cre:simulate
npm run verify:chainlink
```

Capture only the sanitized approved/denied verdict and workflow reference. Never capture the injected policy.

## Bazantic verification

Against the published Recipe, verify:

1. a catalog-derived product and price create one immutable proposal;
2. authorization runs once;
3. a denial never reaches execution;
4. an approved proposal executes without modification;
5. the reported receipt matches the authorized digest;
6. a duplicate identical receipt is idempotent;
7. a conflicting receipt is rejected.

See [Bazantic](BAZANTIC.md) for payloads and required evidence.

## Audit verification

```bash
npm run verify:audit
npm run verify:audit -- --execute
```

The read-only command validates bytecode and recorder configuration. The explicit execution form writes sanitized smoke events and returns transaction references.

## End-to-end authorization matrix

```bash
npm run verify:e2e
```

| Scenario                                       | Expected result             | Forbidden downstream call |
| ---------------------------------------------- | --------------------------- | ------------------------- |
| Active procurement worker + compliant purchase | Success with product output | None                      |
| Active procurement worker + rejected purchase  | `POLICY_DENIED`             | Capability execution      |
| Research worker + procurement capability       | `ROLE_MISMATCH`             | CRE and execution         |
| Revoked worker + otherwise valid action        | `AGENT_REVOKED`             | CRE and execution         |
| Active research worker + compliant query       | Success with linked sources | None                      |

## HTTP smoke checks

```bash
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/docs-json
curl --fail http://localhost:4000/integrations/status
```

For `POST /tasks/:id/run`, send `{}` if `Content-Type: application/json` is present.

## Browser verification

At minimum, verify these viewport classes:

- desktop at 1440px;
- compact laptop at 1100px;
- tablet at 820px;
- mobile at 390px.

Check wallet authentication, onboarding prefill, worker creation, sidebar/drawer navigation, Try Now execution, procurement output links, research output links, task deletion, settings, and revocation confirmation. Confirm keyboard focus, Escape-to-close behavior, readable overflow, loading skeletons, and disabled states.

## Evidence standard

A qualifying integration artifact must show a real external response, transaction, workflow invocation, or Recipe receipt. Configuration presence and unit-test output are supporting evidence only. Sanitize all credentials and private policy before capture.
