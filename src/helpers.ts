import { Hex, encodeFunctionData, Client, zeroAddress } from "viem";
import { atlasSdk } from "./common";
import {
  demoErc20UserIsSelling,
  demoErc20UserIsBuying,
  eoaClient,
  publicClient,
} from "./user";

import demoErc20Abi from "./abi/demoErc20.json";

export async function mintErc20IfNeeded(
  client: Client,
  amountToApprove: bigint
) {
  if (process.env.USER_SELL_TOKEN_ADDRESS === zeroAddress) {
    console.log("User selling ETH, skipping mint");
    return;
  }

  const userAddress = client.account?.address as Hex;
  const balance: bigint = await demoErc20UserIsSelling.read.balanceOf([
    userAddress,
  ]);

  if (balance >= amountToApprove) {
    console.log("User already has enough tokens, skipping mint");
    return;
  }

  console.log("Minting tokens");

  const data = encodeFunctionData({
    abi: demoErc20Abi,
    functionName: "mint",
    args: [userAddress, amountToApprove],
  });

  const hash = await eoaClient.sendTransaction({
    to: process.env.USER_SELL_TOKEN_ADDRESS as Hex,
    data,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  console.log("Minted tokens:", hash);
}

export async function approveErc20IfNeeded(
  client: Client,
  amountToApprove: bigint
) {
  if (process.env.USER_SELL_TOKEN_ADDRESS === zeroAddress) {
    console.log("User selling ETH, skipping approval");
    return;
  }

  const atlasAddress = (await atlasSdk.getAtlasAddress()) as Hex;

  const allowance = await demoErc20UserIsSelling.read.allowance([
    client.account?.address,
    atlasAddress,
  ]);

  if (allowance >= amountToApprove) {
    console.log("User already has enough allowance, skipping approval");
    return;
  }

  console.log("Approving tokens");

  const data = encodeFunctionData({
    abi: demoErc20Abi,
    functionName: "approve",
    args: [atlasAddress, amountToApprove],
  });

  const hash = await client.sendTransaction({
    to: process.env.USER_SELL_TOKEN_ADDRESS as Hex,
    data,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  console.log("Aprroved:", hash);
}

export async function sendTokensToSolverIfNeeded(
  client: Client,
  minAmountUserBuys: bigint,
  solverAddress: string
) {
  if (process.env.SOLVER_SHOULD_FULFILL === "false") {
    console.log("Solver should not fulfill, skipping sending tokens");
    return;
  }

  // Demo solver is set to bid 10% above the minimum amount the user buys
  // const delta = (minAmountUserBuys * 10n) / 100n;
  // const expectedBidAmount = minAmountUserBuys + delta;
  const expectedBidAmount = BigInt(1_000_000_000);

  const currentBalance = await publicClient.getBalance({
    address: solverAddress as Hex,
  });

  if (currentBalance >= expectedBidAmount) {
    console.log("Solver already has enough eth, skipping sending eth");
    return;
  }

  let txHash: Hex;
  console.log("Sending eth to solver");

  txHash = await eoaClient.sendTransaction({
    to: solverAddress as Hex,
    value: expectedBidAmount - currentBalance,
  });

  console.log("Sent eth to solver:", txHash);
}
