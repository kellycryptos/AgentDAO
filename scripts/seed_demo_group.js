const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Error: Please set CONTRACT_ADDRESS environment variable.");
    console.error("Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/seed_demo_group.js --network giwaSepolia");
    process.exit(1);
  }

  console.log("Seeding Public Demo Group on contract at:", contractAddress);

  const proposalRegistry = await hre.viem.getContractAt(
    "ProposalRegistry",
    contractAddress
  );

  const name = "Public Demo Group";
  const description = "Open community governance group for testing AgentDAO on GIWA Sepolia.";
  const isOpen = true;
  const approvalThresholdBps = BigInt(5100); // 51.00%
  const defaultVotingPeriod = BigInt(604800); // 7 days in seconds

  console.log("Submitting createGroup transaction for Public Demo Group...");
  const txHash = await proposalRegistry.write.createGroup([
    name,
    description,
    isOpen,
    approvalThresholdBps,
    defaultVotingPeriod,
  ]);

  console.log("Transaction submitted! Hash:", txHash);
  console.log("View on GIWA Sepolia Explorer: https://sepolia-explorer.giwa.io/tx/" + txHash);

  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Transaction Receipt Status:", receipt.status === "success" ? "SUCCESS (1)" : "FAILED (0)");
  console.log("Block Number:", receipt.blockNumber.toString());

  const groupCount = await proposalRegistry.read.groupCount();
  console.log("Total Groups Count on Contract:", groupCount.toString());
  console.log("Seeded Public Demo Group ID: 0");
}

main().catch((error) => {
  console.error("Error seeding demo group:", error);
  process.exitCode = 1;
});
