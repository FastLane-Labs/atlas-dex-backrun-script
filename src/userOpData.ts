import uniswapV2RouterAbi from "./abi/uniswapV2/uniswapV2Router.json";
import {
  encodeFunctionData,
  Hex,
  zeroAddress,
  PublicClient,
  Client,
} from "viem";

export async function encodeUserOpData(
  publicClient: PublicClient,
  swapType: number,
  recipient: Hex
): Promise<[bigint, Hex]> {
  let [amountToApprove, amountOut, data] = await encodeSwapData(
    publicClient,
    swapType,
    recipient
  );

  console.log("amountOut", amountOut);

  return [amountToApprove, data];
}

async function getAmountOutMin(publicClient: PublicClient): Promise<bigint> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const amountIn = BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string);
  const weth = process.env.WETH_ADDRESS as Hex;

  // Create path array for UniswapV2
  const path = [
    tokenIn === zeroAddress ? weth : tokenIn,
    tokenOut === zeroAddress ? weth : tokenOut,
  ];

  const result = await publicClient.readContract({
    address: process.env.UNISWAP_V2_ROUTER_ADDRESS as Hex,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsOut",
    args: [amountIn, path],
  });

  // Return the output amount (last element in the amounts array)
  const amounts = result as bigint[];
  return amounts[amounts.length - 1];
}

async function getAmountInMax(publicClient: PublicClient): Promise<bigint> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const amountOut = BigInt(process.env.USER_BUY_TOKEN_AMOUNT as string);
  const weth = process.env.WETH_ADDRESS as Hex;

  // Create path array for UniswapV2
  const path = [
    tokenIn === zeroAddress ? weth : tokenIn,
    tokenOut === zeroAddress ? weth : tokenOut,
  ];

  const result = await publicClient.readContract({
    address: process.env.UNISWAP_V2_ROUTER_ADDRESS as Hex,
    abi: uniswapV2RouterAbi,
    functionName: "getAmountsIn",
    args: [amountOut, path],
  });

  // Return the input amount (first element in the amounts array)
  // Type assertion to handle the bigint[] type
  const amounts = result as bigint[];
  return amounts[0];
}

async function encodeSwapData(
  publicClient: PublicClient,
  swapType: number,
  recipient: Hex
): Promise<[bigint, bigint, Hex]> {
  const tokenIn = process.env.USER_SELL_TOKEN_ADDRESS as Hex;
  const tokenOut = process.env.USER_BUY_TOKEN_ADDRESS as Hex;
  const exactAmount =
    swapType === 0 || swapType === 2
      ? BigInt(process.env.USER_SELL_TOKEN_AMOUNT as string)
      : BigInt(process.env.USER_BUY_TOKEN_AMOUNT as string);
  const weth = process.env.WETH_ADDRESS as Hex;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes from now

  if (tokenIn === tokenOut) {
    throw new Error("Token in and token out cannot be the same");
  }

  // Create path array for UniswapV2
  const path = [
    tokenIn === zeroAddress ? weth : tokenIn,
    tokenOut === zeroAddress ? weth : tokenOut,
  ];

  if (swapType === 0) {
    // exactInput = swapExactTokensForTokens or swapExactETHForTokens or swapExactTokensForETH
    const amountOutMinimum = await getAmountOutMin(publicClient);

    if (tokenIn === zeroAddress) {
      // swapExactETHForTokens
      return [
        exactAmount,
        amountOutMinimum,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapExactETHForTokens",
          args: [amountOutMinimum, path, recipient, deadline],
        }),
      ];
    } else if (tokenOut === zeroAddress) {
      // swapExactTokensForETH
      return [
        exactAmount,
        amountOutMinimum,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapExactTokensForETH",
          args: [exactAmount, amountOutMinimum, path, recipient, deadline],
        }),
      ];
    } else {
      // swapExactTokensForTokens
      return [
        exactAmount,
        amountOutMinimum,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapExactTokensForTokens",
          args: [exactAmount, amountOutMinimum, path, recipient, deadline],
        }),
      ];
    }
  } else if (swapType === 1) {
    // exactOutput = swapTokensForExactTokens or swapETHForExactTokens or swapTokensForExactETH
    const amountInMaximum = await getAmountInMax(publicClient);

    if (tokenIn === zeroAddress) {
      // swapETHForExactTokens
      return [
        amountInMaximum,
        exactAmount,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapETHForExactTokens",
          args: [exactAmount, path, recipient, deadline],
        }),
      ];
    } else if (tokenOut === zeroAddress) {
      // swapTokensForExactETH
      return [
        amountInMaximum,
        exactAmount,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapTokensForExactETH",
          args: [exactAmount, amountInMaximum, path, recipient, deadline],
        }),
      ];
    } else {
      // swapTokensForExactTokens
      return [
        amountInMaximum,
        exactAmount,
        encodeFunctionData({
          abi: uniswapV2RouterAbi,
          functionName: "swapTokensForExactTokens",
          args: [exactAmount, amountInMaximum, path, recipient, deadline],
        }),
      ];
    }
  } else if (swapType === 2 || swapType === 3) {
    // In UniswapV2, we don't have separate multi-hop functions
    // We just use the same functions with a longer path array
    // For demo purposes, fallback to swapType 0 or 1 respectively
    return encodeSwapData(publicClient, swapType === 2 ? 0 : 1, recipient);
  } else {
    throw new Error("Invalid swapType provided. Must be 0, 1, 2, or 3.");
  }
}

// No need for the encodePath function in UniswapV2 as it uses address[] directly
