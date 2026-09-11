# ENSv2 integration

LATCH reads agent identity from ENSv2 on Sepolia for every authorization attempt. MongoDB snapshots are display caches only and never authorize an action.

## Resolution path

The API normalizes the requested name and queries the ENSv2 managed universal resolver proxy. It resolves the address, active resolver, and these organization-controlled text records in parallel:

- `latch.organization`
- `latch.role`
- `latch.status`
- `latch.capabilities`
- `latch.policyVersion`

The configured expected wallet and `DEMO_ORG_ENS` are compared against the fresh chain result. Unknown or malformed records fail closed. A role/status/capability failure returns before confidential policy evaluation.

ETHOnline 2026 uses a dedicated ENSv2 deployment that is separate from both
legacy Sepolia ENS and the standard ENSv2 beta deployment. Its hackathon
`UpgradableUniversalResolverProxy` is
`0xd26f2040d083af1cd2962ba303f4bea0c4faf142`. The address is centralized in
`ENSV2_UNIVERSAL_RESOLVER_ADDRESS`, and both API and browser viem chain
configurations explicitly override `ensUniversalResolver`; viem's built-in
Sepolia address resolves against the wrong deployment.

Authoritative hackathon resources:

- [deployment addresses and viem override](https://feature-permres-inode-refact.docs-bao.pages.dev/learn/deployments#sepolia-ensv2-beta)
- [ENSv2 hackathon documentation](https://feature-permres-inode-refact.docs-bao.pages.dev/ensv2/overview)
- [hackathon ENS App](https://hackathon-deployment-manager-app-v4.ens-cf.workers.dev/)
- [hackathon ENS Explorer](https://hackathon-deployment-portal-app.ens-cf.workers.dev/)

## End-to-end Sepolia setup

Perform this setup only on Sepolia and only through the dedicated
[ETHOnline hackathon ENS App](https://hackathon-deployment-manager-app-v4.ens-cf.workers.dev/).
Do not use `app.ens.dev`, `app.ens.domains`, or their displayed deployment
addresses for this project.

### 1. Prepare the organization wallet

Use the address in `ADMIN_WALLET_ADDRESS` as the organization owner and ENS
administrator. The same address currently signs LATCH's Sepolia setup
transactions. Keep `SEPOLIA_DEPLOYER_PRIVATE_KEY` local and never paste it into
documentation, screenshots, issues, or chat.

In a browser wallet:

1. Add or select Ethereum Sepolia (`11155111`).
2. Import the dedicated project account from the local `.env` if it is not
   already available in the wallet.
3. Confirm that the visible address exactly matches `ADMIN_WALLET_ADDRESS`.
4. Keep enough Sepolia ETH for parent registration, resolver/subregistry
   setup, two children, record writes, permission tests, and revocation.

### 2. Register the parent namespace

1. Open the [hackathon ENS App](https://hackathon-deployment-manager-app-v4.ens-cf.workers.dev/)
   and verify that the connected wallet is on Sepolia.
2. Search for a unique parent label. Do not assume `acme.eth` is available.
3. Register the name to the organization/admin wallet.
4. Complete every confirmation and wait for final receipts.
5. Open the registered name and ensure the owner/controller is the admin
   wallet.
6. Deploy or select the ENSv2 Owned/Permissioned Resolver offered by the app.
7. Enable a subregistry for the parent so it can issue ENSv2 child names.

The value written to `DEMO_ORG_ENS` is the complete normalized name, for
example `latch-acme-2026.eth`, without a URL or trailing dot.

### 3. Create organization-controlled agent identities

Create these children in the parent's subregistry:

```text
procurement.<parent>
travel.<parent>
```

The organization/admin must retain ownership and administrative resolver
roles for both children. Do **not** transfer the ENS names to the agent
wallets. The address records will point to the agent wallets, while the
organization keeps authority over role, status, capability, and policy
records.

For each child:

1. Create the child from the parent/subnames screen.
2. Set the child owner/controller to `ADMIN_WALLET_ADDRESS`.
3. Assign an ENSv2 Permissioned Resolver controlled by the admin.
4. Wait for confirmation.
5. Confirm the child appears in the [hackathon ENS Explorer](https://hackathon-deployment-portal-app.ens-cf.workers.dev/)
   and has a nonzero resolver.

Use this mapping:

| Child | Address record | Protected role | Protected capability |
| --- | --- | --- | --- |
| `procurement.<parent>` | `DEMO_PROCUREMENT_AGENT_WALLET` | `procurement` | `procurement.purchase` |
| `travel.<parent>` | `DEMO_TRAVEL_AGENT_WALLET` | `travel` | `travel.booking` |

Do not manually place a spending threshold, vendor allowlist, or other private
policy value in ENS.

### 4. Complete the environment

Set only the names after the parent and children exist:

```dotenv
DEMO_ORG_ENS=<registered-parent>
DEMO_PROCUREMENT_AGENT_ENS=procurement.<registered-parent>
DEMO_TRAVEL_AGENT_ENS=travel.<registered-parent>
```

The admin and two agent wallet addresses are already generated. Do not replace
one address without also updating its corresponding local-only private key and
re-running all identity checks.

### 5. Preview and execute protected records

First run the non-writing preview:

```bash
npm run ens:prepare
```

The preview must show both child names, their actual resolver addresses, the
planned wallet, role, capability, and policy version. Stop if a resolver is
missing or unexpected.

Then execute:

```bash
npm run ens:prepare -- --execute
```

For each child this sends confirmed Permissioned Resolver transactions that:

1. set the address record;
2. set `latch.role`;
3. set `latch.status=active`;
4. set `latch.capabilities`;
5. set `latch.organization`;
6. set `latch.policyVersion`;
7. delegate only the harmless `latch.profile` text permission to the agent;
8. resolve the identity again and fail if read-after-write does not match.

### 6. Verify the live identity

Start the API and run:

```bash
npm run verify:ens
```

Also inspect the endpoints directly:

```bash
curl http://localhost:4000/ens/procurement.<registered-parent>
curl http://localhost:4000/ens/travel.<registered-parent>
```

Evidence must include the resolver, resolved wallet, public LATCH records,
verification block, and transaction hashes. Never capture `.env`.

### 7. Demonstrate the permission boundary

Using the dedicated procurement agent key, update only `latch.profile`; it
must succeed. Using the same signer, attempt to change `latch.role`; simulation
or execution must revert. Then verify that the admin can still update the
protected records. Save both outcomes under `evidence/ens/` without storing
private keys or signed raw transactions.

### 8. Demonstrate revocation last

Run the successful and policy-denied demos before revocation. Revocation is a
real state change and the default flow intentionally preserves the name:

1. authenticate the admin wallet in the LATCH UI;
2. select **Revoke Agent**;
3. confirm the Sepolia transaction;
4. wait for the receipt and fresh ENS resolution;
5. verify `latch.status=revoked`;
6. run that a new task stops at ENS and never invokes CRE or Bazantic.

Do not unregister the child. To repeat the active scenario after the demo,
the admin must deliberately restore `latch.status=active` and, if required,
re-grant the safe profile permission.

### Troubleshooting checkpoints

- **No resolver:** configure an ENSv2 Owned/Permissioned Resolver in the app;
  the repository will not guess a resolver address.
- **No subregistry:** enable the parent's subregistry before creating children.
- **`EACUnauthorizedAccountRoles`:** the connected signer is not the admin or
  the child was created with the wrong owner/role assignment.
- **Address resolves but records are empty:** the child points at a resolver
  that was not initialized for that name.
- **Name works elsewhere but is unresolved in LATCH:** confirm it was created
  in the dedicated hackathon ENS App. Names from another ENS deployment are
  not interchangeable even though they share Sepolia.
- **Stale result:** verify through the hackathon Universal Resolver and wait
  for the transaction receipt; never authorize from the MongoDB snapshot.

## Record ownership

The organization retains control of `latch.organization`, `latch.role`, `latch.status`, `latch.capabilities`, and `latch.policyVersion`. The implemented write path can delegate only the harmless `latch.profile` key through the exact current Permissioned Resolver EAC interface. No write ABI is guessed in the read path.

The implemented admin path uses the current `authorizeTextRoles` interface and delegates only `latch.profile`. Generic resolver role mutation is deliberately not used because the current Permissioned Resolver disables it. Revocation atomically writes `latch.status=revoked`, records `latch.revokedAt`, removes the profile permission, waits for confirmation, and verifies the status through a fresh ENS read.

## Preparing existing ENSv2 child identities

After configuring the parent, agent names, wallets, RPC, admin address, and signer key, preview the operation:

```bash
npm run ens:prepare
```

Execute the verified writes explicitly:

```bash
npm run ens:prepare -- --execute
```

The script aborts if a child has no active resolver or if the signer lacks the necessary Permissioned Resolver roles. Child creation remains a separate official ENSv2 CLI step because the preview CLI is not production-ready and the repository will not guess registry setup or resolver deployment transactions.

## Local verification

Set `SEPOLIA_RPC_URL`, `DEMO_ORG_ENS`, and real configured agent names, then start the API and request:

```bash
curl http://localhost:4000/ens/procurement.your-parent.eth
```

The response includes the block number used for the fresh resolution. An unresolved name or unavailable RPC never grants authority.
