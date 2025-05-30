import { Hex, PublicClient } from "viem";
import { eoaClient, publicClient } from "./user";
import { encodeUserOpData } from "./userOpData";
import { approveErc20IfNeeded } from "./helpers";

// Define the response type
interface SendUnsignedTransactionResponse {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  gas: bigint;
  maxFeePerGas: bigint;
}

const userAddress = eoaClient.account?.address as Hex;
const refundRecipient = process.env.REFUND_RECIPIENT as Hex;
const refundPercent = Number(process.env.REFUND_PERCENT);

const [amountToApprove, data] = await encodeUserOpData(
  publicClient as PublicClient,
  Number(process.env.SWAP_TYPE),
  userAddress
);

console.log("data", data);
await approveErc20IfNeeded(eoaClient, amountToApprove);

async function sendUnsignedTransaction(data: Hex) {
  const auctioneerEndpoint = process.env.AUCTIONEER_ENDPOINT || "http://localhost:8080";
  
  const payload = {
    jsonrpc: "2.0",
    method: "fastlane_sendUnsignedTransaction",
    params: [{
      transaction: {
        chainId: 10143,
        from: userAddress,
        to: process.env.UNISWAP_V2_ROUTER_ADDRESS as Hex,
        value: "0x0",
        data: data
      },
      refundRecipient: refundRecipient,
      refundPercent: refundPercent,
      bidTokenIsOutputToken: false,
    }],
    id: 1
  };

  try {
    const response = await fetch(auctioneerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    // Check if there's an error in the response
    if (result.error) {
      console.error("Error from auctioneer:", result.error);
      return null;
    }
    
    return result.result as SendUnsignedTransactionResponse;
  } catch (error) {
    console.error("Error sending unsigned transaction:", error);
    throw error;
  }
}

const result = await sendUnsignedTransaction(data);
console.log("Transaction result:", result);

if (result) {
  const hash = await eoaClient.sendTransaction({
    to: result.to,
    value: BigInt(result.value),
    gas: BigInt(result.gas),
    maxFeePerGas: BigInt(result.maxFeePerGas),
    data: result.data,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Swapped:", hash);
} else {
  console.error("Failed to get transaction data from auctioneer");
}
