# Demo runbook

Configure real Sepolia ENSv2 names and agent wallets in `.env`, prepare their records, then seed display records:

```bash
npm run ens:prepare
npm run ens:prepare -- --execute
npm run seed:demo
npm run dev
```

With the API running, capture repeatable checks using:

```bash
npm run verify:ens
npm run verify:chainlink
npm run verify:audit
npm run verify:demo
```

`verify:demo` also runs the travel agent against procurement and confirms the task is denied with `ROLE_MISMATCH` without any `POLICY_CHECKING` activity. Revocation remains an explicit admin-wallet demo step because the verifier must not mutate ENS state automatically.

Run these four cases from the authorization console:

1. Procurement agent + standard 20-monitor request: expected success when integrations are live.
2. Procurement agent + premium 20-monitor request: expected confidential policy denial.
3. Travel agent + procurement request: expected ENS role denial before policy.
4. Revoke the procurement agent with the organization admin wallet, then rerun an allowed request in a new task: expected ENS revocation denial before policy.

Use `/demo/activity` to show the sanitized stage-by-stage audit. A dash means the stage was never called. Use `/demo/integrations` to show live MongoDB and ENS readiness alongside honest configured/not-configured states for CRE, Bazantic, and the audit contract. For fresh Sepolia audit evidence, run `npm run verify:audit -- --execute`; this writes only opaque hashes and a zero-value smoke amount.

The dashboard must show real provider names and fresh ENS verification. Do not use a local fixture outcome as Chainlink or Bazantic evidence.
