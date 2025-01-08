import uniswapV3QuoterAbi from "./abi/uniswapV3/quoterv2.json";
import uniswapV3SwapRouterAbi from "./abi/uniswapV3/swapRouter02.json";
import {
  encodeFunctionData,
  Client,
  Hex,
  zeroAddress,
  toHex,
  padHex,
  concatHex,
} from "viem";
import {
  ExactInputParams,
  ExactInputSingleParams,
  ExactOutputSingleParams,
  ExactOutputParams,
} from "./types";

export async function encodeUserOpData(
  publicClient: Client,
  swapType: number,
  recipient: Hex,
  executionEnvironment: Hex
): Promise<[bigint, Hex]> {
  let [amountToApprove, amountOut, data] = await encodeSwapData(
    publicClient,
    swapType,
    recipient
  );

  if (process.env.USER_BUY_TOKEN_ADDRESS === zeroAddress) {
    // Swap to ETH, we need to multicall the swap and unwrapping
    const unwrapData = encodeFunctionData({
      abi: uniswapV3SwapRouterAbi,
      functionName: "unwrapWETH9",
      args: [amountOut, executionEnvironment],
    });

    data = encodeFunctionData({
      abi: uniswapV3SwapRouterAbi,
      functionName: "multicall",
      args: [[data, unwrapData]],
    });
  }

  return [amountToApprove, data];
}

async function getAmountOutMin(publicClient: Client): Promise<bigint> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const amountIn = BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string);
  const fee = 100n; // pool fee as a bigint
  const { result } = await publicClient.simulateContract({
    address: process.env.UNISWAP_V3_QUOTER_ADDRESS as string,
    abi: uniswapV3QuoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn:
          tokenIn === zeroAddress ? (process.env.WETH_ADDRESS as Hex) : tokenIn,
        tokenOut:
          tokenOut === zeroAddress
            ? (process.env.WETH_ADDRESS as Hex)
            : tokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return result[0];
}

async function getAmountInMax(publicClient: Client): Promise<bigint> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const amount = BigInt(process.env.USER_BUY_TOKEN_AMOUNT as string);
  const fee = 100n; // pool fee as a bigint
  const { result } = await publicClient.simulateContract({
    address: process.env.UNISWAP_V3_QUOTER_ADDRESS as string,
    abi: uniswapV3QuoterAbi,
    functionName: "quoteExactOutputSingle",
    args: [
      {
        tokenIn:
          tokenIn === zeroAddress ? (process.env.WETH_ADDRESS as Hex) : tokenIn,
        tokenOut:
          tokenOut === zeroAddress
            ? (process.env.WETH_ADDRESS as Hex)
            : tokenOut,
        amount,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return result[0];
}

async function encodeSwapData(
  publicClient: Client,
  swapType: number,
  recipient: Hex
): Promise<[bigint, bigint, Hex]> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const exactAmount =
    swapType === 0 || swapType === 2
      ? BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string)
      : BigInt(process.env.USER_BUY_TOKEN_AMOUNT as string);
  const fee = 100n; // pool fee as a bigint
  const weth9 = process.env.WETH_ADDRESS as Hex;

  if (tokenIn === tokenOut) {
    throw new Error("Token in and token out cannot be the same");
  }

  if (swapType === 0) {
    const amountOutMinimum = await getAmountOutMin(publicClient);
    // exactInputSingle
    const params: ExactInputSingleParams = {
      tokenIn: tokenIn === zeroAddress ? weth9 : tokenIn,
      tokenOut: tokenOut === zeroAddress ? weth9 : tokenOut,
      fee,
      recipient,
      amountIn: exactAmount,
      amountOutMinimum,
      sqrtPriceLimitX96: 0n,
    };

    return [
      exactAmount,
      amountOutMinimum,
      encodeFunctionData({
        abi: uniswapV3SwapRouterAbi,
        functionName: "exactInputSingle",
        args: [params],
      }),
    ];
  } else if (swapType === 1) {
    const amountInMaximum = await getAmountInMax(publicClient);
    // exactOutputSingle
    const params: ExactOutputSingleParams = {
      tokenIn: tokenIn === zeroAddress ? weth9 : tokenIn,
      tokenOut: tokenOut === zeroAddress ? weth9 : tokenOut,
      fee,
      recipient,
      amountOut: exactAmount,
      amountInMaximum,
      sqrtPriceLimitX96: 0n,
    };

    return [
      amountInMaximum,
      exactAmount,
      encodeFunctionData({
        abi: uniswapV3SwapRouterAbi,
        functionName: "exactOutputSingle",
        args: [params],
      }),
    ];
  } else if (swapType === 2) {
    const amountOutMinimum = await getAmountOutMin(publicClient);
    const path = encodePath(
      [
        tokenIn === zeroAddress ? weth9 : tokenIn,
        tokenOut === zeroAddress ? weth9 : tokenOut,
      ],
      [Number(fee)],
      false
    );
    // exactInput (multi-hop)
    const params: ExactInputParams = {
      path,
      recipient,
      amountIn: exactAmount,
      amountOutMinimum,
    };

    return [
      exactAmount,
      amountOutMinimum,
      encodeFunctionData({
        abi: uniswapV3SwapRouterAbi,
        functionName: "exactInput",
        args: [params],
      }),
    ];
  } else if (swapType === 3) {
    const amountInMaximum = await getAmountInMax(publicClient);
    const path = encodePath(
      [
        tokenIn === zeroAddress ? weth9 : tokenIn,
        tokenOut === zeroAddress ? weth9 : tokenOut,
      ],
      [Number(fee)],
      true
    );
    // exactOutput (multi-hop)
    const params: ExactOutputParams = {
      path,
      recipient,
      amountOut: exactAmount,
      amountInMaximum,
    };

    return [
      amountInMaximum,
      exactAmount,
      encodeFunctionData({
        abi: uniswapV3SwapRouterAbi,
        functionName: "exactOutput",
        args: [params],
      }),
    ];
  } else {
    throw new Error("Invalid swapType provided. Must be 0, 1, 2, or 3.");
  }
}

function encodePath(
  tokens: `0x${string}`[],
  fees: number[],
  exactOutput: boolean
): `0x${string}` {
  if (fees.length + 1 !== tokens.length) {
    throw new Error("Mismatch: fees.length + 1 must equal tokens.length");
  }

  // Make sure to define or import these helpers properly
  function encodeFee(fee: number): `0x${string}` {
    const feeHex = toHex(fee);       // must return a hex string without 0x prefix
    const padded = padHex(feeHex, { size: 3 }); // should return `0x` prefixed
    return padded;
  }

  let parts: `0x${string}`[] = [];

  if (!exactOutput) {
    // Forward encoding (exactInput)
    for (let i = 0; i < fees.length; i++) {
      const feeHex = encodeFee(fees[i]);
      parts.push(tokens[i]);
      parts.push(feeHex);
    }
    parts.push(tokens[tokens.length - 1]);
  } else {
    // Reverse encoding (exactOutput)
    parts.push(tokens[tokens.length - 1]);
    for (let i = fees.length; i > 0; i--) {
      const feeHex = encodeFee(fees[i - 1]);
      parts.push(feeHex);
      parts.push(tokens[i - 1]);
    }
  }

  // Combine all parts into one hex string:
  const concatenated = ('0x' + parts.map(p => p.slice(2)).join('')).toLowerCase();
  return concatenated as `0x${string}`;
}

// function encodePath(
//   tokens: `0x${string}`[],
//   fees: number[],
//   exactOutput: boolean
// ): `0x${string}` {
//   if (fees.length + 1 !== tokens.length) {
//     throw new Error("Mismatch: fees.length + 1 must equal tokens.length");
//   }

//   // A helper to encode a 3-byte fee
//   function encodeFee(fee: number): `0x${string}` {
//     // Convert fee to hex without padding
//     const feeHex = toHex(fee);
//     // Pad it to 3 bytes (6 hex chars) + "0x"
//     return padHex(feeHex, { size: 3 });
//   }

//   let parts: `0x${string}`[] = [];

//   if (!exactOutput) {
//     // Forward encoding (exactInput)
//     // For each fee, append token[i] + fee[i]
//     for (let i = 0; i < fees.length; i++) {
//       const feeHex = encodeFee(fees[i]);
//       parts.push(tokens[i]);
//       parts.push(feeHex);
//     }
//     // After all fees, append the last token
//     parts.push(tokens[tokens.length - 1]);
//   } else {
//     // Reverse encoding (exactOutput)
//     // Start with the last token
//     parts.push(tokens[tokens.length - 1]);
//     // Go backwards through fees and tokens
//     for (let i = fees.length; i > 0; i--) {
//       const feeHex = encodeFee(fees[i - 1]);
//       parts.push(feeHex);
//       parts.push(tokens[i - 1]);
//     }
//   }

//   // Concatenate all hex parts into one hex string
//   return concatHex(parts);
// }
