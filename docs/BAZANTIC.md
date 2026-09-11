# Bazantic integration

LATCH isolates Bazantic behind `CapabilityProvider`. `BazanticCapabilityProvider` supports two recipe operations:

```text
search_products -> provider-sourced ProductCandidate[]
execute_purchase -> executionReference and optional transactionHash
```

The configured `BAZANTIC_GATEWAY_URL` receives a server-side authenticated POST containing `recipeId`, `operation`, and `input`. Map these operation names to the actual Gateway contract in the current Bazantic dashboard before enabling hackathon mode; Bazantic's public API contract was not independently discoverable during implementation, so this repository does not falsely claim a verified live recipe.

`HACKATHON_MODE=true` now rejects startup unless the Gateway URL, Recipe ID, and API key are all present. Presence means configured, not connected: the integration status records a successful invocation only after a schema-valid Gateway response.

## Gateway authentication and envelope

LATCH calls the Gateway only from the backend with:

```http
Authorization: Bearer <BAZANTIC_API_KEY>
Content-Type: application/json
```

```json
{
  "recipeId": "<BAZANTIC_RECIPE_ID>",
  "operation": "search_products | execute_purchase",
  "input": {}
}
```

The API key is never exposed to the browser. Requests time out and fail closed; a failed or malformed Gateway response cannot produce execution success.

## Operation schemas

`search_products` input:

```json
{ "query": "office monitor" }
```

Response:

```json
{
  "products": [
    {
      "id": "provider-product-id",
      "name": "Standard Office Monitor",
      "vendor": "provider-vendor-id",
      "unitPriceCents": 6200,
      "currency": "USD"
    }
  ]
}
```

`execute_purchase` receives the exact server-authorized task ID, single-use authorization ID, capability, provider-returned product, quantity, and calculated total. LATCH rejects a product not sourced from Bazantic or a total that differs from `unitPriceCents × quantity` before invoking the Gateway.

Response:

```json
{
  "executionReference": "opaque-provider-reference",
  "transactionHash": "0x<optional-64-hex-characters>"
}
```

All response schemas are strict. Currency is fixed to USD for this MVP, and the LLM never supplies product price.

## LATCH project API

- `GET /agents/:ensName` returns the identity freshly resolved from ENS.
- `POST /authorization/evaluate` accepts only `{ "authorizationId": "<persisted-id>" }`. LATCH atomically claims the persisted proposal and derives wallet, capability, vendor, and amount from server-owned records.
- `GET /tasks/:taskId` returns public task and sanitized authorization state.

There is no public capability-execution endpoint. Normal task execution and Recipe integrations reach the same `TaskExecutionService`/`AuthorizationOrchestrator` path; only an approved, unconsumed action can be sent to `execute_purchase`.

## Target recipe: LATCH AUTHORIZED PROCUREMENT

The recipe must:

1. Search an approved catalog service and use its returned price.
2. Submit the exact proposal to LATCH authorization.
3. Stop immediately on any denial.
4. Never retry modified amounts to infer private policy.
5. Execute only the exact authorized product, quantity, vendor, and amount.
6. Return an opaque execution reference.

One task action version has one unique authorization ID. A second run is rejected, preventing automated threshold probing. A materially changed proposal requires a new user-created task.

`POST /authorization/evaluate` accepts only that opaque persisted authorization ID. Agent names, wallets, capabilities, vendors, and amounts are loaded from server-owned records; a caller cannot alter them in the evaluation request. The ID is atomically claimed once.

The local adapter is deterministic development infrastructure only. The API and dashboard label it `local-demo`; `HACKATHON_MODE` cannot start with it selected.

## Dashboard setup and evidence

1. Add the LATCH API using the routes and schemas above.
2. Create a Gateway requiring the server credential configured as `BAZANTIC_API_KEY`.
3. Create the `LATCH AUTHORIZED PROCUREMENT` Recipe with the anti-probing rules above.
4. Connect the approved catalog/product service as the first service.
5. Connect LATCH authorization as the second service.
6. Configure execution so it can receive only the exact approved proposal.
7. Set `BAZANTIC_GATEWAY_URL`, `BAZANTIC_RECIPE_ID`, and `BAZANTIC_API_KEY` in the server environment.
8. Run the success and policy-denial scenarios and save sanitized Gateway/Recipe references under `evidence/bazantic/`.

The final result depends on both services: catalog data supplies the real product and price, while LATCH supplies the authorization verdict. Do not claim a third-party API qualifies for a sponsor category until the current Bazantic dashboard or hackathon rules confirm it. Do not present local fixture references as Bazantic evidence.

## Detailed dashboard runbook

Bazantic setup is account-owned and must be completed in the live dashboard.
The public ETHOnline rules require a real x402/MPP Gateway and Recipe. Dashboard
labels can change, so preserve the generated invocation example instead of
guessing an undocumented URL shape.

### 1. Make the LATCH API reachable

Bazantic cannot call `localhost`. Before configuring the Gateway, the project
owner must provide a public HTTPS URL for the API through the separately
managed backend deployment or a temporary development tunnel. This repository
does not deploy hosting automatically.

Verify these URLs from a network outside the development machine:

```text
GET  https://<api-host>/health
GET  https://<api-host>/docs
GET  https://<api-host>/docs-json
```

The API must remain server-side configured. Do not put the Bazantic key,
Chainlink secret, signer key, or MongoDB URI into a browser deployment.

### 2. Create the LATCH Gateway

1. Sign in at <https://bazantic.com> using the account that will be named in
   the hackathon submission.
2. Create a new **x402/MPP Gateway**.
3. Name it `LATCH Authorization API`.
4. Use the public API base URL from step 1.
5. Import the OpenAPI document from `https://<api-host>/docs-json` if the
   dashboard supports import. Otherwise create the routes manually.
6. Configure HTTPS-only upstream access and the narrowest server credential
   Bazantic supports.
7. Do not expose an operation that directly executes a capability without a
   persisted LATCH authorization.

Minimum LATCH routes to expose:

| Operation | Route | Purpose |
| --- | --- | --- |
| Resolve agent | `GET /agents/{ensName}` | Return fresh ENS-derived identity |
| Create task | `POST /tasks` | Persist user intent for an existing agent |
| Run task | `POST /tasks/{id}/run` | Run the single authorization/execution pipeline |
| Read task | `GET /tasks/{id}` | Return sanitized task state |
| Read activity | `GET /tasks/{id}/activity` | Prove which stages ran or were skipped |
| Evaluate persisted proposal | `POST /authorization/evaluate` | Accept only an existing opaque authorization ID |

Never define a public route that accepts caller-supplied wallet, role, policy
result, price, or an arbitrary approved flag.

### 3. Add the product/catalog service

Add one real catalog or product-data service already available in Bazantic, or
an eligible service allowed by the current hackathon rules. Its product output
must contain stable equivalents of:

```json
{
  "id": "provider-product-id",
  "name": "Standard Office Monitor",
  "vendor": "provider-vendor-id",
  "unitPriceCents": 6200,
  "currency": "USD"
}
```

Do not allow the model to invent or overwrite `unitPriceCents`. Record the
exact provider field mapping in the Recipe. If the provider returns decimal
dollars, convert to integer cents deterministically before authorization.

### 4. Create the Recipe

Create a Recipe named:

```text
LATCH AUTHORIZED PROCUREMENT
```

Use instructions equivalent to the following:

```text
You coordinate procurement through LATCH.

1. Accept one user procurement request and one selected ENS agent.
2. Search the configured catalog service for real product candidates.
3. Use only provider-returned product IDs, vendors, currencies, and prices.
4. Calculate quantity × unit price exactly in integer cents.
5. Create one LATCH task containing the original request and agent ENS name.
6. Run that task exactly once through LATCH.
7. Treat every ENS or confidential-policy denial as final for that task version.
8. Never retry different prices, quantities, vendors, products, agents, or
   amounts to infer confidential policy.
9. Execute only the exact action approved by LATCH.
10. Return the task ID, public verdict, and opaque execution reference.
11. Never reveal or speculate about policy thresholds, vendor rules, secrets,
    credentials, or enclave reasoning.
```

The Recipe should connect the catalog result to the LATCH task input. The
meaningful dependency is: the catalog supplies authoritative product/price
data, and LATCH supplies ENS plus confidential-policy authorization. Neither
service can complete the workflow alone.

### 5. Align the generated Gateway contract

After saving the Gateway and Recipe, copy these non-secret items:

1. Gateway invocation URL;
2. Recipe identifier;
3. generated `curl` example or request/response schema;
4. exact authentication header format;
5. operation/tool names generated by Bazantic.

Do not paste the secret API key into chat or documentation. Put it directly in
the local `.env`. The current adapter expects this envelope:

```json
{
  "recipeId": "<recipe-id>",
  "operation": "search_products | execute_purchase",
  "input": {}
}
```

If Bazantic generates a different envelope, update
`BazanticCapabilityProvider` to the generated contract before enabling
hackathon mode. Do not attempt to make the dashboard conform to guessed field
names.

### 6. Complete configuration

Set:

```dotenv
BAZANTIC_GATEWAY_URL=https://<generated-gateway-url>
BAZANTIC_RECIPE_ID=<generated-recipe-id>
BAZANTIC_API_KEY=<server-only-key>
CAPABILITY_PROVIDER=bazantic
```

Restart the API after changing these values. The integration page should say
configured first and connected only after a schema-valid invocation succeeds.

### 7. Validate in this order

1. Invoke `search_products` and confirm products are marked with source
   `bazantic`.
2. Run the standard $1,240 task with the active procurement agent.
3. Confirm ENS and CRE approve before `execute_purchase` is invoked.
4. Confirm the returned execution reference is real and opaque.
5. Run the policy-denied scenario and prove `execute_purchase` was not called.
6. Run the wrong-role scenario and prove neither CRE nor execution was called.
7. Repeat the identical task version and confirm replay protection rejects it.

### 8. Capture qualifying evidence

Save sanitized material under `evidence/bazantic/`:

- account username/handle for attribution;
- Gateway overview and service definitions;
- Recipe name, version, and complete non-secret instructions;
- catalog-to-LATCH field mapping;
- one successful end-to-end execution/reference;
- one denial showing execution stopped;
- raw-API versus Recipe comparison using the same prompt, model, settings, and
  API access when entering the Recipe prize category;
- screen recording showing why both services are required.

Never capture the API key, bearer header, private policy fixture, wallet key,
MongoDB URI, or signed raw transaction.
