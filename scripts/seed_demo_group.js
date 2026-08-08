const hre = require("hardhat");
const { parseEther } = require("viem");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Error: Please set CONTRACT_ADDRESS environment variable.");
    console.error("Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/seed_demo_group.js --network giwaSepolia");
    process.exit(1);
  }

  console.log("Seeding Public Demo Group and funding Treasury on contract at:", contractAddress);

  const proposalRegistry = await hre.viem.getContractAt(
    "ProposalRegistry",
    contractAddress
  );
  const publicClient = await hre.viem.getPublicClient();

  const groupCount = await proposalRegistry.read.groupCount();
  console.log("Existing Groups Count:", groupCount.toString());

  if (groupCount === BigInt(0)) {
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

    console.log("Group Creation Tx Hash:", txHash);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log("Group Creation Confirmed! Group ID #0 created.");
  } else {
    console.log("Group ID #0 already exists on contract.");
  }

  // Deposit 0.001 ETH into Group #0 Treasury (fitting within wallet balance)
  console.log("Depositing 0.001 ETH into Group #0 Treasury...");
  const depositTxHash = await proposalRegistry.write.depositToTreasury([BigInt(0)], {
    value: parseEther("0.001"),
  });
  console.log("Treasury Deposit Tx Hash:", depositTxHash);
  const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
  console.log("Deposit Receipt Status:", depositReceipt.status === "success" ? "SUCCESS (1)" : "FAILED (0)");

  const group0 = await proposalRegistry.read.getGroup([BigInt(0)]);
  console.log("Group #0 Details:", {
    name: group0.name,
    admin: group0.admin,
    treasuryBalance: group0.treasuryBalance.toString(),
    maxDisbursementPerProposal: group0.maxDisbursementPerProposal.toString(),
  });
}

main().catch((error) => {
  console.error("Error seeding demo group:", error);
  process.exitCode = 1;
});
