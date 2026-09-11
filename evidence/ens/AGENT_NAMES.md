# ENSv2 organization-controlled agent names

Network: Ethereum Sepolia (`11155111`)

Parent: `latchsecurity.eth`

Owner/admin: `0x20639744BeB517b1AF16C8f67CA42016Ef0c4B7c`

Shared Permissioned Resolver: `0xbDbAd83f9Ecc883B948aE45A2dA58837a032C88d`

Organization User Registry: `0xc9875482d9cEEbDe53d5b642197729F9c8e4d37f`

## Registrations

- `procurement.latchsecurity.eth`: `0xcb9674d2d716ce6eb5c4dcfc4175d66988f8bc8e46e4a039f2dbb9e639e60d51`
- `travel.latchsecurity.eth`: `0x670377ccc5650dfb24c8659f95a70fa10d716986dc42c1fd6d8fbf7c9dec6010`

Both receipts succeeded. Fresh registry reads returned `REGISTERED`, the
organization admin as owner, and the expected nonzero resolver. The names were
not transferred to the agent wallets; their address records are set separately
so the organization retains authority over protected LATCH metadata.
