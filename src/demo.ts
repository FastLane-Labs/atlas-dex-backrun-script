import { Hex, zeroAddress } from "viem";
import { atlasSdk } from "./common";
import { setupAtlas } from "./atlas";
import { eoaClient, publicClient } from "./user";

// Build user operation and send it to the FastLane auctioneer.
// We get in return a full Atlas bundle.
// Only interaction from user during this phase is token approval (if needed).
const bundle = await setupAtlas(eoaClient);
const atlasAddress = await atlasSdk.getAtlasAddress();

if (bundle.solverOperations.length > 0) {
  const topBidAmount = bundle.solverOperations[0].getField("bidAmount")
    .value as bigint;
  console.log("Best Solver bid amount:", topBidAmount);
}

const metacallCalldata = atlasSdk.getMetacallCalldata(
  bundle.userOperation,
  bundle.solverOperations,
  bundle.dAppOperation
);

let gasLimit = bundle.userOperation.getField("gas").value as bigint;
for (const solverOp of bundle.solverOperations) {
  gasLimit += (solverOp.getField("gas").value as bigint) * BigInt(2);
}
gasLimit += BigInt(500_000); // Buffer for metacall validation

console.log("User sending transaction (self bundling)");

const hash = await eoaClient.sendTransaction({
  to: atlasAddress as Hex,
  value:
    process.env.USER_SELL_TOKEN_ADDRESS == zeroAddress
      ? BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string)
      : BigInt(0),
  gas: gasLimit,
  maxFeePerGas: bundle.userOperation.getField("maxFeePerGas").value as bigint,
  data: metacallCalldata as Hex,
});

await publicClient.waitForTransactionReceipt({ hash });

console.log("Swapped:", hash);
