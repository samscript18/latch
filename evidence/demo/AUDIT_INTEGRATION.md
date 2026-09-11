# LatchAudit backend integration

Verified on Sepolia on 2026-09-11.

- Contract: `0xF184B0A98B690B48234D40eD7e1f5A89d3E9D2a9`
- Authorized recorder: `0x20639744BeB517b1AF16C8f67CA42016Ef0c4B7c`
- Smoke task reference: `audit-smoke-1789137916856`
- `ActionRequested` transaction: `0x939c3a8e79d1b36c8950d6e274a5813c487cc78d1da90d416ca48a720b424afb`
- `ActionBlocked` transaction: `0xbce259a7376f890967ab2e3398689f7d6f33abcc156770f4a097493507a28a62`

The smoke input used a zero amount and opaque hashes. It contained no private policy values. Reproduce the read-only deployment check with `npm run verify:audit`, or opt into a fresh requested/blocked pair with `npm run verify:audit -- --execute`.
