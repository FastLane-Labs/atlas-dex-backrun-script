# Uniswap V3 Demo script

## Instructions

### Install dependencies

```
npm install
```

### Setup environment variables

```
cp .env.example .env
```

Fill out `USER_PK`, `RPC_URL`, `AUCTIONEER_ENDPOINT`, `AUCTIONEER_ADDRESS` and `DAPP_CONTROL_ADDRESS`.
The Atlas config values should not be changed.
The Demo config values can be changed to test different scenarios.

### Different demo swap options
#### Tokens
- [USDB](https://sepolia.basescan.org/address/0xb842b00bcdcb0ffb4d1ae4e478e14974430e2081)
- [USDA](https://sepolia.basescan.org/address/0xe220095597070b910492b02a1858664f0b9f3a45)
- [WETH](https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000006)
#### Pools
- [USDA <> WETH](https://sepolia.basescan.org/address/0xb80ac0bc95535672ccf1e457b29525713b6c019a)
- [USDB <> WETH](https://sepolia.basescan.org/address/0x6319e85a39429ff311f30dd783b29a0391e687d8)
- [USDA <> USDB](https://sepolia.basescan.org/address/0xf7c6c3474b10c140fba657c7c0bf6677f38a5995)
#### Swap Options
- ERC20 <> ERC20
- ERC20 <> ETH
- ETH <> ERC20
#### SwapRouter02 Options
- exactInputSingle
- exactOutputSingle
- exactInput
- exactOutput
- multicall [swap -> unwrapWETH9]

### Run demo

EOA demo. The user is self bundling.

```
npm run demo
```
