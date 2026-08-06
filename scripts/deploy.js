const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("Deploying contract with account:", deployer.account.address);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Account balance:", formatEther(balance), "ETH");

  const proposalRegistry = await hre.viem.deployContract("ProposalRegistry");

  console.log("PROPOSAL_REGISTRY_ADDRESS=" + proposalRegistry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
