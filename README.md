# Details lootbox

## docs

https://gamefi-stacks.gitbook.io/gamefistacks/lootbox-on-chain-m3/

## main points

- user does one call operation
- id and block-height+1 are given when lootbox minted
- can call function open-lootbox starting with block-height+1
- when open is called, burn the lootbox and mint a new component nft to the user address

## flow lootbox

- admin mint a lootbox to a user address
- lootbox has block-height of the block it was minted on
- lootbox has id as an NFT
- users can check with `is-openable` if they can open the lootbox
- after one block from the moment the lootbox was minted, users can open it
- when lootbox is opnened
  - it concatenates vrf-seed of the minted block with the lootbox id and calculates the keccak256 hash of result
  - takes first byte of the value resulted and if it is between given values it mints that specific component
    - eg. 0 < nr < 51 mint a 'Goldie' background
    - eg. 192 < nr < 231 mint a 'Sunset' background
- the mint is called in the same function with the burn of the lootbox and has direct control for mint-as-admin on the components smart contract
