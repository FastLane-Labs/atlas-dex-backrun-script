export interface ExactInputParams {
  path: `0x${string}`;
  recipient: `0x${string}`;
  amountIn: bigint;
  amountOutMinimum: bigint;
}

export interface ExactInputSingleParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  fee: bigint;
  recipient: `0x${string}`;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
}

export interface ExactOutputSingleParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  fee: bigint;
  recipient: `0x${string}`;
  amountOut: bigint;
  amountInMaximum: bigint;
  sqrtPriceLimitX96: bigint;
}

export interface ExactOutputParams {
  path: `0x${string}`;
  recipient: `0x${string}`;
  amountOut: bigint;
  amountInMaximum: bigint;
}
