// Import the required functions
import {
  createPublicClient,
  createWalletClient,
  getContract,
  Hex,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import demoErc20Abi from "./abi/demoErc20.json";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const EOA_PK = process.env.USER_PK as Hex;
const RPC_URL = process.env.RPC_URL;

const eoa = privateKeyToAccount(EOA_PK);

export const eoaClient = createWalletClient({
  chain: baseSepolia,
  transport: http(process.env.RPC_URL),
  account: eoa,
});

export const publicClient = createPublicClient({
  transport: http(RPC_URL),
  chain: baseSepolia,
});

function getErc20Contract(address: Hex) {
  return getContract({
    address: address,
    abi: demoErc20Abi,
    client: {
      public: publicClient,
      account: eoaClient.account,
    },
  });
}

export const demoErc20UserIsSelling = getErc20Contract(
  process.env.USER_SELL_TOKEN_ADDRESS as Hex
);

export const demoErc20UserIsBuying = getErc20Contract(
  process.env.USER_BUY_TOKEN_ADDRESS as Hex
);
