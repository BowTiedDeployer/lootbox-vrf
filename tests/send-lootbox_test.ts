import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.31.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';
const CONTRACT_NAME = 'send-lootbox';
const CLAIM_LOOTBOX = 'claim-lootbox';
const GET_REMAINING_MINTS = 'get-remaining-mints';
const SET_REMAINING_MINTS = 'set-remaining-mints';
const CAN_MINT_LOOTBOX = 'can-mint-lootbox';

const CONTRACT_LOOTBOX_NAME = 'lootbox-background';
const OPEN_LOOTBOX = 'open-lootbox';

const ERR_ADMIN_ONLY = 100;
const ERR_LOOTBOX_LOCKED = 403;
// only admin set remaining mints
Clarinet.test({
  name: 'Ensure that only admin set remaining mints',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender1 = accounts.get('deployer')!;
    const sender2 = accounts.get('wallet_1')!;
    const sender3 = accounts.get('wallet_2')!;

    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender1.address), types.uint(3)],
        sender1.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender2.address), types.uint(3)],
        sender1.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender1.address), types.uint(3)],
        sender2.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender2.address), types.uint(3)],
        sender3.address
      ),
    ]);
    assertEquals(block.receipts.length, 4);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(ERR_ADMIN_ONLY);
    block.receipts[3].result.expectErr().expectUint(ERR_ADMIN_ONLY);
  },
});

// check cannot mint without number attributed or it if number is 0
Clarinet.test({
  name: 'Ensure that can mint a lootbox NFT only if remaining-mints not valid',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender1 = accounts.get('deployer')!;
    const sender2 = accounts.get('wallet_1')!;
    const sender3 = accounts.get('wallet_2')!;
    // check cannot mint lootbox
    let block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
    ]);

    assertEquals(block.receipts.length, 6);
    assertEquals(block.height, 2);
    for (let i = 0; i < block.receipts.length; i++) {
      block.receipts[i].result.expectOk().expectBool(false);
    }
    block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender2.address), types.uint(3)],
        sender1.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender1.address), types.uint(3)],
        sender1.address
      ),
    ]);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 3);
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender3.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender3.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
    ]);
    for (let i = 0; i < block.receipts.length - 3; i++) {
      block.receipts[i].result.expectOk().expectBool(true);
      assertEquals(block.receipts[i].events[0].type, 'nft_mint_event');
      block.receipts[i].events[0].nft_mint_event.value.expectUint(i + 1);
    }
    block.receipts[block.receipts.length - 3].result.expectOk().expectBool(false);
    block.receipts[block.receipts.length - 2].result.expectOk().expectBool(false);
    block.receipts[block.receipts.length - 1].result.expectOk().expectBool(false);
  },
});

Clarinet.test({
  name: 'Ensure that can mint a lootbox NFT and open it after 1 block',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender1 = accounts.get('deployer')!;
    const sender2 = accounts.get('wallet_1')!;
    const sender3 = accounts.get('wallet_2')!;
    // give access to these wallets to have 3 nfts each
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender2.address), types.uint(3)],
        sender1.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender1.address), types.uint(3)],
        sender1.address
      ),
      Tx.contractCall(
        CONTRACT_NAME,
        SET_REMAINING_MINTS,
        [types.principal(sender3.address), types.uint(3)],
        sender1.address
      ),
    ]);
    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 2);
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender1.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
      Tx.contractCall(CONTRACT_NAME, CLAIM_LOOTBOX, [], sender2.address),
    ]);
    assertEquals(block.receipts.length, 6);
    assertEquals(block.height, 3);

    // check cannot open it here
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(1)], sender1.address), // 0x04 1 // commmon
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_LOOTBOX_LOCKED);
    block = chain.mineBlock([]);
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(1)], sender1.address), // 0x04 1 // commmon
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(2)], sender1.address), // 0x74 3 // commmon
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(3)], sender1.address), // 0xe2 5 // rare
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(4)], sender2.address), // 0xf6 6 // epic
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(5)], sender2.address), // 0x9b 4 // rare
      Tx.contractCall(CONTRACT_LOOTBOX_NAME, OPEN_LOOTBOX, [types.uint(6)], sender2.address), // 0x30 2 // commmon
    ]);
    for (let i = 0; i < block.receipts.length; i++) {
      block.receipts[i].result.expectOk().expectBool(true);
      block.receipts[i].events[0].type = 'nft_burn_event';
      assertEquals(
        block.receipts[i].events[0].nft_burn_event.asset_identifier,
        'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.lootbox-background::lootbox-background'
      );
      block.receipts[i].events[0].nft_burn_event.value.expectUint(i + 1);

      block.receipts[i].events[1].type = 'nft_mint_event';
      assertEquals(
        block.receipts[i].events[1].nft_mint_event.asset_identifier,
        'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.background-item::background'
      );
      block.receipts[i].events[1].nft_mint_event.value.expectUint(i + 1);
    }
  },
});
