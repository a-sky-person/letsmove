import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NAVISDKClient } from "navi-sdk";
import type { Pool, PoolConfig } from "navi-sdk/dist/types";
import { pool } from "navi-sdk/dist/address";
import {
  Sui,
  NAVX,
} from "navi-sdk/dist/address";
import { SignAndSubmitTXB } from "navi-sdk/dist/libs/PTB";


const client = new NAVISDKClient({
  mnemonic: process.env.MNEMONIC,
  networkType: "mainnet",
  numberOfAccounts: 1,
});
const account = client.accounts[0];

(async () => {
  let txb = new TransactionBlock();
  txb.setSender(account.address);
  txb.setGasBudget(500000000);

  const SUI_Pool: PoolConfig = pool[Sui.symbol as keyof Pool];
  const NAVX_Pool: PoolConfig = pool[NAVX.symbol as keyof Pool];

  const to_deposit = txb.splitCoins(txb.gas, [txb.pure(100_000_000)]);
  
  await txb.moveCall({
    target: `${process.env.Package}::incentive_v2::entry_deposit`,
    arguments: [
      txb.object("0x06"),
      txb.object(process.env.Storage!),
      txb.object(SUI_Pool.poolId),
      txb.pure(SUI_Pool.assetId),
      to_deposit,
      txb.pure(100_000_000),
      txb.object(process.env.IncentiveV1!),
      txb.object(process.env.IncentiveV2!),
    ],
    typeArguments: [SUI_Pool.type],
  });

  // 4月30日 上午10点
  const borrowAmount = 4_301_00000;
  let borrowed = await txb.moveCall({
    target: `${process.env.Package}::incentive_v2::borrow`,
    arguments: [
      txb.object("0x06"),
      txb.object(process.env.OraclePrice!),
      txb.object(process.env.Storage!),
      txb.object(NAVX_Pool.poolId),
      txb.pure(NAVX_Pool.assetId),
      txb.pure(borrowAmount),
      txb.object(process.env.IncentiveV2!),
    ],
    typeArguments: [NAVX_Pool.type],
  });

  const extra_coin = txb.moveCall({
    target: "0x2::coin::from_balance",
    arguments: [borrowed],
    typeArguments: [NAVX_Pool.type],
  });

  await txb.moveCall({
    target: `${process.env.Package}::incentive_v2::entry_deposit`,
    arguments: [
      txb.object("0x06"),
      txb.object(process.env.Storage!),
      txb.object(NAVX_Pool.poolId),
      txb.pure(NAVX_Pool.assetId),
      extra_coin,
      txb.pure(borrowAmount),
      txb.object(process.env.IncentiveV1!),
      txb.object(process.env.IncentiveV2!),
    ],
    typeArguments: [NAVX_Pool.type],
  });

  const result = await SignAndSubmitTXB(txb, account.client, account.keypair);
  console.log(result);
})();