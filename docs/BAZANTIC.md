# Bazantic Best Recipe integration

Bazantic is the top-level orchestrator for the bounty path. LATCH does not call
the Recipe. The Recipe combines a real catalog service with the authenticated
LATCH Gateway and continues to execution only after LATCH approves the exact
catalog-derived proposal.

```text
               BAZANTIC RECIPE
                     |
          +----------+----------+
          v                     v
   Product/Catalog API     LATCH Gateway
          |                     |
  product + real price     ENSv2 identity
          |                Chainlink CRE policy
          +----------+----------+
                     v
              APPROVE or DENY
                     |
               if approved
                     v
                  execution
                     |
              receipt to LATCH
```

The final result meaningfully depends on both services: the catalog supplies
the authoritative product and price; LATCH supplies identity and confidential
policy authorization. Neither service can complete the flow alone.

## Security boundary

The Recipe-facing routes require:

```http
Authorization: Bearer <BAZANTIC_API_KEY>
Content-Type: application/json
```

The key is server-only. LATCH compares it in constant time. The Recipe cannot
supply an approval result, ENS role, wallet, policy version, or confidential
policy details. LATCH calculates the total, persists the proposal, hashes its
immutable fields, and permits one authorization decision.

Set `CAPABILITY_PROVIDER=recipe` for this path. In this mode, direct LATCH
catalog search and execution throw an error; this prevents a recursive
`LATCH -> Bazantic -> LATCH` flow and prevents local fixtures from becoming a
hackathon execution path.

## Recipe-facing API

### 1. Create an immutable proposal

```http
POST /bazantic/proposals
```

```json
{
  "recipeInvocationId": "bazantic-run-1042",
  "agentEnsName": "procurement.latchsecurity.eth",
  "prompt": "Buy 20 standard office monitors",
  "capability": "procurement.purchase",
  "product": {
    "id": "catalog-product-id",
    "name": "Standard Office Monitor",
    "vendor": "catalog-vendor-id",
    "unitPriceCents": 6200,
    "currency": "USD"
  },
  "quantity": 20
}
```

LATCH calculates `amountCents`, creates a single-use `authorizationId`, and
returns a `proposalDigest`. Repeating the same Recipe invocation is idempotent.

### 2. Evaluate once

```http
POST /bazantic/proposals/{authorizationId}/evaluate
```

LATCH records `ActionRequested`, resolves fresh ENSv2 records, evaluates the
private Chainlink policy, records `ActionAuthorized` or `ActionBlocked`, and
returns a sanitized verdict. A second evaluation is rejected. Denial is final
for that proposal; the Recipe must not alter amounts or vendors to probe policy.

Approved response fields include the exact proposal and its digest. Denied
responses expose only a public code such as `POLICY_DENIED`.

### 3. Execute and record the receipt

After approval, the Recipe sends the exact approved proposal to its execution
service, then reports the result:

```http
POST /bazantic/proposals/{authorizationId}/executions
```

```json
{
  "proposalDigest": "0x<64 hex characters>",
  "executionReference": "opaque-provider-reference",
  "transactionHash": "0x<optional 64 hex characters>"
}
```

LATCH rejects a mismatched digest or any proposal that is not authorized. The
same execution reference is idempotent; a different second execution conflicts.
A valid receipt creates the sanitized `ActionExecuted` audit event.

## Recipe instructions

Create a Recipe named `LATCH AUTHORIZED PROCUREMENT` with these rules:

1. Search the configured catalog service for real product candidates.
2. Use only catalog-returned product IDs, vendors, currencies, and prices.
3. Calculate quantity times unit price in integer cents.
4. Submit one immutable proposal to LATCH.
5. Evaluate that proposal exactly once.
6. Treat every denial as final and never probe the confidential policy.
7. Execute only the exact approved proposal and digest.
8. Report the opaque execution receipt to LATCH.
9. Never reveal or speculate about policy rules, secrets, or enclave reasoning.

## Configuration

```dotenv
CAPABILITY_PROVIDER=recipe
BAZANTIC_GATEWAY_URL=https://<recipe-or-gateway-reference-url>
BAZANTIC_RECIPE_ID=<generated-recipe-id>
BAZANTIC_API_KEY=<strong-server-only-upstream-key>
```

`BAZANTIC_GATEWAY_URL` is retained as the dashboard/reference URL shown in
integration readiness; LATCH does not invoke it in Recipe mode. The Recipe
must be able to reach the LATCH API through public HTTPS. Do not put secrets in
the browser deployment or commit them.

Enable `HACKATHON_MODE=true` only after Chainlink CRE is live and all Recipe
configuration is present. Hackathon mode requires `CAPABILITY_PROVIDER=recipe`.

## Validation and evidence

Verify these cases in the live Recipe:

1. Allowed catalog proposal succeeds and produces an execution reference.
2. Policy-denied proposal never reaches execution.
3. Wrong-role agent is denied before CRE and execution.
4. Revoked agent is denied before CRE and execution.
5. Re-evaluation and conflicting execution receipts are rejected.

Save sanitized Recipe configuration, catalog mapping, invocation references,
authorization activity, and execution evidence under `evidence/bazantic/`.
Never capture the API key, wallet keys, CRE policy, MongoDB URI, bearer header,
or signed raw transaction.
