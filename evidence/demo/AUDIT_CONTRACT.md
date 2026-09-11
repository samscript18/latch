# LatchAudit Sepolia deployment

- Chain: Ethereum Sepolia (`11155111`)
- Contract: `0xF184B0A98B690B48234D40eD7e1f5A89d3E9D2a9`
- Deployment transaction: `0xe44933739336d80b335e78b166cbe02e1e55ff3f5122d2cbfba543743c200f0b`
- Block: `11679355`
- Status: successful
- Authorized recorder: `0x20639744BeB517b1AF16C8f67CA42016Ef0c4B7c`

Verification performed after confirmation:

1. The deployment receipt reported status `1`.
2. Runtime bytecode was present at the contract address.
3. `recorder()` returned the configured admin wallet.

Explorer:

- [Contract](https://sepolia.etherscan.io/address/0xF184B0A98B690B48234D40eD7e1f5A89d3E9D2a9)
- [Deployment transaction](https://sepolia.etherscan.io/tx/0xe44933739336d80b335e78b166cbe02e1e55ff3f5122d2cbfba543743c200f0b)
