import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    giwaSepolia: {
      type: "http",
      chainType: "op",
      url: "https://sepolia-rpc.giwa.io",
      accounts: [PRIVATE_KEY],
    },
  },
  chainDescriptors: {
    91342: {
      name: "Giwa Sepolia",
      blockExplorers: {
        blockscout: {
          name: "Giwa Sepolia Explorer",
          url: "https://sepolia-explorer.giwa.io",
          apiUrl: "https://sepolia-explorer.giwa.io/api",
        },
      },
    },
  },
};

export default config;
