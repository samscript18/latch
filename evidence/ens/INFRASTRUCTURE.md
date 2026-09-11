# ENSv2 organization infrastructure

Network: Ethereum Sepolia (`11155111`)

Parent: `latchsecurity.eth`

Admin: `0x20639744BeB517b1AF16C8f67CA42016Ef0c4B7c`

## Attached contracts

- Permissioned Resolver proxy: `0xbDbAd83f9Ecc883B948aE45A2dA58837a032C88d`
- User Registry proxy: `0xc9875482d9cEEbDe53d5b642197729F9c8e4d37f`
- Parent expiry verified as `2027-09-11T13:43:36.000Z`

## Transactions

- Deploy resolver: `0x0d36e76aca078b61a8ec3c91c6edbfb247c00a2dc8b3b0a4a10c908222bbd428`
- Attach resolver: `0x8f4a557e5284815e62423de6f6f10d6c6889cbf4ca8a8452a9160d680045128b`
- Deploy subregistry: `0xf9c1a13e7d996ee3d4ed98e7de19677272b10899b22f4898bf1079809193de30`
- Attach subregistry: `0x8c805d54649034ec10673862a9cea00d0acfb9c9b71a7283df28f5ba37428536`

All four receipts succeeded. A fresh `npm run ens:setup` read both nonzero
pointers from the hackathon ETHRegistry after the writes. No private keys,
commitment secrets, or signed raw transactions are stored here.
