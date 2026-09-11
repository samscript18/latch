# Chainlink CRE simulation evidence

Captured 2026-09-11 with:

- CRE CLI `v1.33.0`
- `@chainlink/cre-sdk@1.20.1`
- workflow binary hash `3780e5d33e47547a6c6cb40fbb50e36237c2f5b73e7eab474c8dbf522c12bcda`
- configuration hash `265667525f9f25d08b127e97c81fde60fe9ec25aa544bddc2ae45d8d53e78d80`

This file contains sanitized local simulation evidence, not proof of deployment or execution in a production TEE.

## Authoritative CLI output

All three runs compiled the same workflow and printed:

```text
Workflow compiled
Handler requested TEE Execution
Binary hash: 3780e5d33e47547a6c6cb40fbb50e36237c2f5b73e7eab474c8dbf522c12bcda
Config hash: 265667525f9f25d08b127e97c81fde60fe9ec25aa544bddc2ae45d8d53e78d80
```

The CLI explicitly states that local simulation is not a production TEE. No production execution claim is made here.

### Allowed — $1,240

```json
{
  "approved": true,
  "policyVersion": "procurement-v1",
  "reasonCode": "POLICY_ALLOWED"
}
```

### Denied — $4,700

```json
{
  "approved": false,
  "policyVersion": "procurement-v1",
  "reasonCode": "POLICY_DENIED"
}
```

### Denied — unapproved vendor

```json
{
  "approved": false,
  "policyVersion": "procurement-v1",
  "reasonCode": "POLICY_DENIED"
}
```

The two policy failures are intentionally indistinguishable outside confidential execution. The policy secret, threshold, allowlist, and detailed causes are omitted.
