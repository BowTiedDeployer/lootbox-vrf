import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.31.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const CONTRACT_NAME = 'lootbox-background';
const CREATE_LOOTBOX = 'create-lootbox';
const OPEN_LOOTBOX = 'open-lootbox';
const SET_ADMIN = 'set-admin';
const GET_RANDOM = 'get-random';
const GET_TOKEN_URI = 'get-token-uri';
const ITEM_FOR_LOOTBOX = 'item-for-lootbox';
const IS_OPENABLE = 'is-openable';
const LIMIT_MINT = 255;

// errors
const ERR_ADMIN_ONLY = 100;
const ERR_OWNER_ONLY = 101;
const ERR_MINT_LIMIT_EXCEEDED = 102;
const ERR_MISSING_BLOCK_HEIGHT = 402;
const ERR_LOOTBOX_LOCKED = 403;

// Clarinet.test({
//     name: "Ensure that <...>",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         let block = chain.mineBlock([
//             /*
//              * Add transactions with:
//              * Tx.contractCall(...)
//             */
//         ]);
//         assertEquals(block.receipts.length, 0);
//         assertEquals(block.height, 2);

//         block = chain.mineBlock([
//             /*
//              * Add transactions with:
//              * Tx.contractCall(...)
//             */
//         ]);
//         assertEquals(block.receipts.length, 0);
//         assertEquals(block.height, 3);
//     },
// });

Clarinet.test({
  name: 'Ensure that admin can create lootbox for address',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'Ensure that admin can create lootbox for admin',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(admin.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that address can't create lootbox for address",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const address = accounts.get('wallet_1')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(address.address)], address.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectErr().expectUint(ERR_ADMIN_ONLY);
  },
});

Clarinet.test({
  name: 'Ensure that new changed admin can create lootbox for address',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin_old = accounts.get('deployer')!;
    const admin_new = accounts.get('wallet_1')!;
    const receiver = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, SET_ADMIN, [types.principal(admin_new.address)], admin_old.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin_new.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: 'Ensure that get-token-url is right',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const receiver2 = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver2.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);

    let token_uri = chain.callReadOnlyFn(CONTRACT_NAME, GET_TOKEN_URI, [types.uint(1)], receiver.address);
    assertEquals(
      token_uri.result.expectOk().expectSome(),
      '"ipfs://QmWEA3QfSskyopgrw3nPyk8u7UAbPbL7uA3Wj8UbtCuXBt/$TOKEN_ID.json"'
    );
    token_uri = chain.callReadOnlyFn(CONTRACT_NAME, GET_TOKEN_URI, [types.uint(2)], receiver.address);
    token_uri.result.expectOk().expectSome();
    assertEquals(
      token_uri.result.expectOk().expectSome(),
      '"ipfs://QmWEA3QfSskyopgrw3nPyk8u7UAbPbL7uA3Wj8UbtCuXBt/$TOKEN_ID.json"'
    );
  },
});

Clarinet.test({
  name: 'Ensure that item-for-value is right',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const receiver2 = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver2.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    chain.mineBlock([]);
    chain.mineBlock([]);
    let item = chain.callReadOnlyFn(CONTRACT_NAME, ITEM_FOR_LOOTBOX, [types.uint(1)], receiver.address);
    assertEquals(item.result.expectOk(), '"Goldie"');
    item = chain.callReadOnlyFn(CONTRACT_NAME, ITEM_FOR_LOOTBOX, [types.uint(2)], receiver.address);
    assertEquals(item.result.expectOk(), '"Emerald"');
  },
});

Clarinet.test({
  name: "Ensure that old changed admin can't create lootbox for address",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin_old = accounts.get('deployer')!;
    const admin_new = accounts.get('wallet_1')!;
    const receiver = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, SET_ADMIN, [types.principal(admin_new.address)], admin_old.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin_old.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ERR_ADMIN_ONLY);
  },
});

Clarinet.test({
  name: 'Ensure that lootbox is not openable by other wallets, admin included',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const another_wallet = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], admin.address),
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], another_wallet.address),
    ]);
    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ERR_OWNER_ONLY);
    block.receipts[2].result.expectErr().expectUint(ERR_OWNER_ONLY);
  },
});

// lootbox is not openable same block as minted
Clarinet.test({
  name: 'Ensure that lootbox is not openable same block as minted',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(ERR_LOOTBOX_LOCKED);
  },
});

Clarinet.test({
  name: 'Ensure that lootbox is openable by owner in the next block',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const another_wallet = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    let block2 = chain.mineBlock([]);
    assertEquals(block2.receipts.length, 0);
    assertEquals(block2.height, 3);
    let block3 = chain.mineBlock([Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address)]);
    assertEquals(block3.receipts.length, 1);
    assertEquals(block3.height, 4);
    block3.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: 'Ensure that lootbox is openable by owner  after 300 blocks',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const another_wallet = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    for (let i = 0; i < 300; i++) block = chain.mineBlock([]);
    assertEquals(block.receipts.length, 0);
    assertEquals(block.height, 302);
    block = chain.mineBlock([Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address)]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 303);
    block.receipts[0].result.expectOk();
  },
});

// see lootbox value after block done

// get random for block one

//read-only get-random
Clarinet.test({
  name: 'Ensure that lootbox get-random generated the number expected',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    const another_wallet = accounts.get('wallet_2')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    // lootbox locked
    let rnd_nr = chain.callReadOnlyFn(CONTRACT_NAME, GET_RANDOM, [types.uint(1)], receiver.address);
    rnd_nr.result.expectErr().expectUint(ERR_LOOTBOX_LOCKED);
    block = chain.mineBlock([]);
    rnd_nr = chain.callReadOnlyFn(CONTRACT_NAME, GET_RANDOM, [types.uint(1)], receiver.address);
    assertEquals(rnd_nr.result.expectOk(), '0x04bb147b9a06236f987bf6a5d7290d33e720321a7e3df6e56c477c4f36223b7a');
  },
});

//public get-random
// Clarinet.test({
//   name: 'Ensure that lootbox get-random generated the number expected',
//   async fn(chain: Chain, accounts: Map<string, Account>) {
//     const admin = accounts.get('deployer')!;
//     const receiver = accounts.get('wallet_1')!;
//     let block = chain.mineBlock([
//       Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
//       Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
//       Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
//     ]);
//     let block2 = chain.mineBlock([]);
//     assertEquals(block.receipts.length, 3);
//     assertEquals(block.height, 2);
//     block = chain.mineBlock([
//       Tx.contractCall(CONTRACT_NAME, GET_RANDOM, [types.uint(1)], receiver.address),
//       Tx.contractCall(CONTRACT_NAME, GET_RANDOM, [types.uint(2)], receiver.address),
//       Tx.contractCall(CONTRACT_NAME, GET_RANDOM, [types.uint(3)], receiver.address),
//     ]);

//     assertEquals(
//       block.receipts[0].result.expectOk(),
//       '0x04bb147b9a06236f987bf6a5d7290d33e720321a7e3df6e56c477c4f36223b7a'
//     );
//     assertEquals(block.receipts[0].events[0].contract_event.value, '0x01');
//     assertEquals(
//       block.receipts[0].events[1].contract_event.value,
//       '0x18539e8755a439d1c4a09c77f6f4bb48c233edcb6938052b680a338d62e2e6f201'
//     );

//     //
//     console.log(block.receipts[1].events);
//     assertEquals(
//       block.receipts[1].result.expectOk(),
//       '0x7490c2c8735462b98addbf7e021c1cf05700be19c2ec459c638509f16998a256'
//     );
//     assertEquals(block.receipts[1].events[0].contract_event.value, '0x02');
//     assertEquals(
//       block.receipts[1].events[1].contract_event.value,
//       '0x18539e8755a439d1c4a09c77f6f4bb48c233edcb6938052b680a338d62e2e6f202'
//     );

//     //
//     console.log(block.receipts[2].events);
//     assertEquals(
//       block.receipts[2].result.expectOk(),
//       '0x7785834120b0d1b36bb9a48cd3a3076a5c2bf58f6f8da07c0811d0300c83fd64'
//     );
//     assertEquals(block.receipts[2].events[0].contract_event.value, '0x03');
//     assertEquals(
//       block.receipts[2].events[1].contract_event.value,
//       '0x18539e8755a439d1c4a09c77f6f4bb48c233edcb6938052b680a338d62e2e6f203'
//     );

//     //   block.receipts[0].result.expectOk().expectBool(true);
//   },
// });

// get each type of component
Clarinet.test({
  name: 'Ensure that lootbox gets every type of item from the collection',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    assertEquals(block.receipts.length, 14);
    assertEquals(block.height, 2);
    block = chain.mineBlock([]);
    let valuesBurn = [1, 2, 4, 5, 6, 14];
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address), // 0x04 1 // commmon
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(2)], receiver.address), // 0x74 3 // commmon
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(4)], receiver.address), // 0xe2 5 // rare
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(5)], receiver.address), // 0xf6 6 // epic
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(6)], receiver.address), // 0x9b 4 // rare
      Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(14)], receiver.address), // 0x30 2 // commmon
    ]);
    for (let i = 0; i < block.receipts.length; i++) {
      block.receipts[i].result.expectOk().expectBool(true);
      assertEquals(block.receipts[i].events[0].type, 'nft_burn_event');
      assertEquals(
        block.receipts[i].events[0].nft_burn_event.asset_identifier,
        'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.lootbox-background::lootbox-background'
      );
      assertEquals(block.receipts[i].events[0].nft_burn_event.sender, receiver.address);
      block.receipts[i].events[0].nft_burn_event.value.expectUint(valuesBurn[i]);
      assertEquals(block.receipts[i].events[1].type, 'nft_mint_event');
      assertEquals(
        block.receipts[i].events[1].nft_mint_event.asset_identifier,
        'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.background-item::background'
      );
      assertEquals(block.receipts[i].events[1].nft_mint_event.recipient, receiver.address);
      block.receipts[i].events[1].nft_mint_event.value.expectUint(i + 1);
    }
  },
});

// verify limit id exceeded
// include verify create_lootbox and error-not-owner for open_lootbox
Clarinet.test({
  name: 'Ensure that lootbox is not created after limit, also cannot open non-existing nft',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    let transactions_create_lootbox = [];
    for (let i = 0; i < LIMIT_MINT + 1; i++)
      transactions_create_lootbox.push(
        Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address)
      );
    let block = chain.mineBlock(transactions_create_lootbox);
    assertEquals(block.receipts.length, 256);
    assertEquals(block.height, 2);
    // verify all cals before this happened succesfully
    for (let i = 0; i < LIMIT_MINT; i++) block.receipts[i].result.expectOk().expectBool(true);
    // limit reached error
    block.receipts[LIMIT_MINT].result.expectErr().expectUint(ERR_MINT_LIMIT_EXCEEDED);
  },
});

// verify already open
Clarinet.test({
  name: 'Ensure that lootbox cannot be opened twice',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const receiver = accounts.get('wallet_1')!;
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CREATE_LOOTBOX, [types.principal(receiver.address)], admin.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block = chain.mineBlock([]);
    // open lootbox
    block = chain.mineBlock([Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address)]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 4);
    block.receipts[0].result.expectOk();
    // try to open burnt lootbox
    block = chain.mineBlock([Tx.contractCall(CONTRACT_NAME, OPEN_LOOTBOX, [types.uint(1)], receiver.address)]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 5);
    block.receipts[0].result.expectErr().expectUint(ERR_OWNER_ONLY);
  },
});
