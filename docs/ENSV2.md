# ENSv2 identity and authority

ENSv2 is LATCH’s authoritative identity layer. Every authorization attempt resolves the worker from Sepolia and validates organization-controlled records before confidential policy evaluation begins. MongoDB snapshots support indexing and presentation only.

## Identity record contract

Each worker name resolves an address and these text records:

| Record                | Meaning                                  | Required      |
| --------------------- | ---------------------------------------- | ------------- |
| Address               | Wallet bound to the worker identity      | Yes           |
| `latch.organization`  | Parent organization namespace            | Yes           |
| `latch.role`          | LATCH business role                      | Yes           |
| `latch.status`        | `active` or `revoked`                    | Yes           |
| `latch.capabilities`  | Comma-separated capability allowlist     | Yes           |
| `latch.policyVersion` | Confidential policy version selector     | Yes           |
| `latch.agentVersion`  | Worker metadata version                  | Optional      |
| `latch.profile`       | Harmless worker-managed profile metadata | Optional      |
| `latch.revokedAt`     | Public revocation timestamp              | On revocation |

Procurement identity:

```text
procurement.<organization-parent>
latch.organization=<organization-parent>
latch.role=procurement
latch.status=active
latch.capabilities=procurement.purchase
latch.policyVersion=procurement-v1
```

Research identity:

```text
research.<organization-parent>
latch.organization=<organization-parent>
latch.role=research
latch.status=active
latch.capabilities=research.search
latch.policyVersion=research-v1
```

Business roles are LATCH metadata, not ENS Enhanced Access Control roles. ENS EAC roles govern who may change registry and resolver state.

## Authorization algorithm

For each proposed action, LATCH:

1. normalizes the worker ENS name;
2. resolves the address, active resolver, and LATCH text records;
3. binds the response to the resolution block;
4. requires a nonzero address;
5. compares the resolved address with the indexed worker wallet;
6. compares `latch.organization` with the task organization namespace;
7. requires `latch.status=active`;
8. derives the required role from the capability registry;
9. compares the ENS role with the required role;
10. requires the requested capability in `latch.capabilities`;
11. requires a policy version;
12. passes only the authorized public proposal and ENS-derived policy version to CRE.

Any missing, malformed, mismatched, unavailable, or revoked value stops the request before CRE.

## Dedicated Sepolia deployment

ETHOnline 2026 uses a dedicated ENSv2 Sepolia deployment separate from legacy Sepolia ENS and other ENSv2 environments. The configured `UpgradableUniversalResolverProxy` is:

```text
0xd26f2040d083af1cd2962ba303f4bea0c4faf142
```

LATCH centralizes this address in `ENSV2_UNIVERSAL_RESOLVER_ADDRESS`. Both API and browser viem chain configuration override `ensUniversalResolver`; viem’s built-in Sepolia resolver targets a different deployment.

Authoritative resources:

- [Deployment addresses and viem override](https://feature-permres-inode-refact.docs-bao.pages.dev/learn/deployments#sepolia-ensv2-beta)
- [ENSv2 overview](https://feature-permres-inode-refact.docs-bao.pages.dev/ensv2/overview)
- [ENS registration application](https://hackathon-deployment-manager-app-v4.ens-cf.workers.dev/)
- [ENS Explorer](https://hackathon-deployment-portal-app.ens-cf.workers.dev/)

Do not use `app.ens.dev`, `app.ens.domains`, or an address from another deployment.

## Provisioning sequence

### 1. Prepare the organization controller

Use the configured admin address as the namespace owner, registry administrator, and protected-record controller. The script signer must resolve to the same address.

Before broadcasting:

- select Ethereum Sepolia (`11155111`);
- confirm the wallet address exactly;
- fund registration, resolver, subregistry, worker, record, permission, and revocation transactions;
- keep the signer key outside browser configuration and source control.

### 2. Register the parent namespace

Register a unique `.eth` name in the dedicated registration application, wait for final receipts, and confirm ownership in the Explorer. Configure an organization-controlled Permissioned Resolver and a subregistry capable of issuing worker children.

If the registration relayer cannot complete the commitment flow, use the repository’s direct registrar script:

```bash
# Inspect availability, price, balance, and commitment window
npm run ens:register -- --label=<unique-label>

# Mint test payment token when required, approve the fee, and commit
npm run ens:register -- --label=<unique-label> --execute

# After the reported minimum commitment age, register
npm run ens:register -- --label=<unique-label> --register
```

The script stores the commitment secret in an ignored mode-0600 evidence file and never prints it. Preserve that file between commitment and registration.

### 3. Attach resolver and subregistry infrastructure

```bash
npm run ens:setup
npm run ens:setup -- --execute
```

The preview is read-only. The execution form deploys the verified Permissioned Resolver and User Registry proxies, derives the required version-zero salts, grants the organization administrator root roles and their admin roles, attaches both pointers, waits for receipts, and verifies read-after-write state.

Re-running the command is idempotent once the pointers are configured.

### 4. Create worker identities

```bash
npm run ens:create-agents
npm run ens:create-agents -- --execute
```

The organization retains ownership of worker names. Address records point to worker wallets; protected metadata remains controlled by the organization. The script creates only configured direct children, reuses verified resolver infrastructure, limits child expiry to parent expiry, and verifies final state.

Do not transfer worker names to worker wallets. A worker must not be able to promote itself, reactivate itself, change organization, add capabilities, or select a different policy.

### 5. Write protected identity records

Preview:

```bash
npm run ens:prepare
```

Broadcast and verify:

```bash
npm run ens:prepare -- --execute
```

For each worker, the command:

1. discovers the active resolver;
2. verifies the signer’s required roles;
3. writes the address record;
4. writes organization, role, active status, capabilities, and policy version;
5. delegates only `latch.profile` to the worker;
6. waits for each receipt;
7. resolves through the configured Universal Resolver;
8. aborts if read-after-write state differs.

Never write confidential thresholds, vendor lists, domain rules, secrets, or credentials into ENS.

## Enhanced Access Control boundary

The organization controls:

```text
latch.organization
latch.role
latch.status
latch.capabilities
latch.policyVersion
latch.revokedAt
```

The worker may receive record-specific permission for:

```text
latch.profile
```

LATCH uses the Permissioned Resolver’s current argument-scoped setter-role interface. Workers use isolated resolvers because the relevant permission is scoped across a resolver rather than safely isolated by name. Generic broad grants are not used.

Verify the boundary:

```bash
# Simulate the allowed profile write and forbidden protected write
npm run ens:verify-permissions

# Broadcast only the harmless profile write
npm run ens:verify-permissions -- --execute
```

The protected-role attempt remains simulation-only and must revert. If worker wallets need transaction gas, fund them with:

```bash
npm run ens:fund-agents
```

## Revocation

Revocation preserves historical identity while removing future authority:

1. authenticate the organization wallet;
2. select **Revoke Agent**;
3. confirm the target name and wallet;
4. write `latch.status=revoked`;
5. write `latch.revokedAt` when supported;
6. remove delegated `latch.profile` permission;
7. wait for receipts;
8. invalidate cached identity queries;
9. resolve the identity again;
10. require the UI to display `REVOKED` from fresh ENS state.

Future tasks return `AGENT_REVOKED` before CRE or capability execution. Do not unregister the name: stable historical identity is part of the audit trail.

## Verification

```bash
npm run verify:ens
```

The verifier requires real configured names and an RPC endpoint. Evidence should include:

- normalized worker name;
- resolver address;
- resolved wallet;
- public LATCH records;
- resolution block;
- preparation and permission transaction hashes.

Direct inspection is also available through:

```bash
curl http://localhost:4000/ens/procurement.<organization-parent>
curl http://localhost:4000/ens/research.<organization-parent>
```

## Troubleshooting

| Symptom                                  | Check                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| Resolver is zero                         | Attach the deployment’s Permissioned Resolver                          |
| Parent cannot create children            | Enable and attach its subregistry                                      |
| `EACUnauthorizedAccountRoles`            | Confirm signer, name ownership, and resolver roles                     |
| Address resolves but records are empty   | Confirm the child uses the initialized resolver                        |
| Name resolves elsewhere but not in LATCH | Confirm it exists in the dedicated deployment                          |
| Stale status after a write               | Wait for receipt and resolve through the configured Universal Resolver |
| Wallet mismatch                          | Compare the address record with the indexed worker wallet              |
| CRE is unexpectedly not reached          | Inspect ENS denial code first; this is expected on identity failure    |

Never authorize from a cached snapshot when RPC or resolution is unavailable.
