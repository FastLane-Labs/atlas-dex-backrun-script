import { ethers } from "ethers";
import { AtlasSdk, FastlaneBackend } from "@fastlane-labs/atlas-sdk";
import dotenv from "dotenv";

dotenv.config();

export const chainId = 84532; // Base Sepolia
export const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL,
  chainId
);

export const atlasSdk = await AtlasSdk.create(
  provider,
  chainId,
  new FastlaneBackend({
    endpoint: process.env.AUCTIONEER_ENDPOINT as string,
  })
);
