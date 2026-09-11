# ENSv2 delegated permission boundary

Network: Ethereum Sepolia (`11155111`)

The two agent wallets were granted only the `ROLE_SET_TEXT` permission derived
from the `latch.profile` setter on their respective isolated Permissioned
Resolvers. The protected `latch.role` setter was simulated from each agent
wallet and reverted before any transaction was broadcast.

## Procurement Agent

- Name: `procurement.latchsecurity.eth`
- Wallet: `0x7e9BE5A2D594fCce28396690255817C242F46D2F`
- Harmless profile update: `0xec28c5aaeb6ea8ed5e254035bc77494eddd6b50d8effb95faac0ea7bd94770aa`
- Protected role update: simulation reverted as required

## Travel Agent

- Name: `travel.latchsecurity.eth`
- Wallet: `0x6297ffe967A2Cf676975E9E1253863a455743f0A`
- Harmless profile update: `0x83a27d86e315189f82c88cb3c9a12110c9c3ca5eec9337d84c6a80b39507b328`
- Protected role update: simulation reverted as required

## Gas funding

Each agent received `0.001` testnet ETH from the project admin solely to pay
for its proof transaction:

- Procurement: `0xaf32aef321b22c3744047d70bce7326b484d6411e35848f851a533b960fea8cf`
- Travel: `0xaf86aad6ec992c95378d03cf6095871bdea842b41e586469476490b633f0dbc9`

No private key, signed raw transaction, or confidential policy value is stored
in this evidence file.
