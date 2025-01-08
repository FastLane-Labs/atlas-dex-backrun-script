import { Bundle } from "@fastlane-labs/atlas-sdk";
import { provider, atlasSdk } from "./common";
import { encodeUserOpData } from "./userOpData";
import {
  approveErc20IfNeeded,
  mintErc20IfNeeded,
  sendTokensToSolverIfNeeded,
} from "./helpers";
import { eoaClient, publicClient } from "./user";
import { Client, Hex, zeroAddress } from "viem";
import dotenv from "dotenv";

dotenv.config();

export async function setupAtlas(walletClient: Client): Promise<Bundle> {
  console.log("===== SETTING UP DEMO =====");

  const userAddress = walletClient.account?.address as Hex;
  const executionEnvironment = (await atlasSdk.getExecutionEnvironment(
    userAddress,
    process.env.DAPP_CONTROL_ADDRESS as string
  )) as Hex;

  let recipient;

  if (process.env.USER_BUY_TOKEN_ADDRESS === zeroAddress) {
    recipient = process.env.UNISWAP_V3_ROUTER_ADDRESS as Hex;
  } else {
    recipient = executionEnvironment;
  }

  const [amountToApprove, data] = await encodeUserOpData(
    publicClient,
    Number(process.env.SWAP_TYPE),
    recipient,
    executionEnvironment
  );

  console.log("Generated swap data");

  await mintErc20IfNeeded(walletClient, amountToApprove);
  await approveErc20IfNeeded(walletClient, amountToApprove);

  await sendTokensToSolverIfNeeded(
    eoaClient,
    amountToApprove,
    process.env.SOLVER_CONTRACT_ADDRESS as string
  );

  const currentBlockNumber = await provider.getBlockNumber();
  const suggestedFeeData = await provider.getFeeData();

  console.log("Current block number:", currentBlockNumber);

  console.log("Generating user operation");

  let atlasUserOperation = await atlasSdk.newUserOperation({
    from: userAddress,
    value:
      process.env.USER_SELL_TOKEN_ADDRESS == zeroAddress
        ? BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string)
        : BigInt(0),
    gas: BigInt(3_000_000), // Hardcoded for demo
    maxFeePerGas: (suggestedFeeData.maxFeePerGas as bigint) * BigInt(2),
    deadline: BigInt(currentBlockNumber + 10),
    dapp: process.env.UNISWAP_V3_ROUTER_ADDRESS as string,
    control: process.env.DAPP_CONTROL_ADDRESS as string,
    sessionKey: process.env.AUCTIONEER_ADDRESS as string,
    data,
  });

  console.log("Generated user operation (unsigned)");

  console.log("Sending user operation to FastLane auctioneer");

  const bundle = (await atlasSdk.submitUserOperation(atlasUserOperation, [], {
    auctionDurationInMillis: 1500, // Longer duration for the demo
    disableBundling: true, // Disable Atlas bundler, we bundle ourselves
  })) as Bundle;

  console.log("Atlas bundle received");

  console.log("===== SETUP COMPLETE =====");

  return bundle;
}
