# ENSv2 organization-controlled agent names

Network: Ethereum Sepolia (`11155111`)

Parent: `latchsecurity.eth`

Owner/admin: `0x20639744BeB517b1AF16C8f67CA42016Ef0c4B7c`

Parent Permissioned Resolver: `0xbDbAd83f9Ecc883B948aE45A2dA58837a032C88d`

Organization User Registry: `0xc9875482d9cEEbDe53d5b642197729F9c8e4d37f`

## Registrations

- `procurement.latchsecurity.eth`: `0xcb9674d2d716ce6eb5c4dcfc4175d66988f8bc8e46e4a039f2dbb9e639e60d51`
- `travel.latchsecurity.eth`: `0x670377ccc5650dfb24c8659f95a70fa10d716986dc42c1fd6d8fbf7c9dec6010`

Both receipts succeeded. Fresh registry reads returned `REGISTERED`, the
organization admin as owner, and the expected nonzero resolver. The names were
not transferred to the agent wallets; their address records are set separately
so the organization retains authority over protected LATCH metadata.

## Isolated child resolvers

The hackathon Permissioned Resolver scopes delegated setter roles by record
argument, not by ENS name. Each child therefore uses a separate resolver so an
agent's harmless `latch.profile` permission cannot affect the other agent.

### Procurement

- Resolver: `0x67387ad9adBb2608a355c6ad53407DB8706e6170`
- Deploy resolver: `0x6e1f5ca4e4ab82d71ace379b2645b123769c31582ec3ca51d8a0b892ef0ade8f`
- Attach resolver: `0x24158c6132d50d2e6ce3d7b9976e7676b0d4cedee6e008cdb2ca8cc207d10d1f`
- Write protected records: `0x514a4085ac36119fae05faddbd906e708f86ff6b8f107da78d84aef652c1653c`
- Grant `latch.profile`: `0xba97279ddce032355a9a04127f049cef095b179dc74d840cbdb3bdc148b91aa0`
- Verified at block `11680875`

### Travel

- Resolver: `0x09201d4868c59cc26242E786962D4905daA1C675`
- Deploy resolver: `0xd2f66bc909c767fa0ea981c4476403975dcddb2b6adf8d0761c31c22992021db`
- Attach resolver: `0x5784f9d31182416313a0d517bdd548f867fe63ab5a996c7eabd672d5980d6df9`
- Write protected records: `0xb3735615570c77c670d0464fa931986dacd26731714f511223c9e5d3bf51b1cc`
- Grant `latch.profile`: `0x023aa31666cff9db8ee4eccc465e60394d58a53983c02a5973723ea5acf80c6d`
- Verified at block `11680877`
