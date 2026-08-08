const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x7F45BF6De97E5D509D27a33ED6C6ea73D04026F3";
  console.log("Testing Group Treasury & RuleChange E2E Lifecycle on contract:", contractAddress);

  const proposalRegistry = await hre.viem.getContractAt("ProposalRegistry", contractAddress);
  const publicClient = await hre.viem.getPublicClient();

  const initialGroup = await proposalRegistry.read.getGroup([BigInt(0)]);
  console.log("Initial Treasury Balance:", formatEther(initialGroup.treasuryBalance), "ETH");

  // 1. Additional Treasury Deposit (0.0005 ETH)
  console.log("\n--- Step 1: Depositing 0.0005 ETH into Treasury ---");
  const depositTx = await proposalRegistry.write.depositToTreasury([BigInt(0)], {
    value: parseEther("0.0005"),
  });
  console.log("Deposit Tx Hash:", depositTx);
  await publicClient.waitForTransactionReceipt({ hash: depositTx });

  const postDepositGroup = await proposalRegistry.read.getGroup([BigInt(0)]);
  console.log("Updated Treasury Balance:", formatEther(postDepositGroup.treasuryBalance), "ETH");

  // 2. Create Funding Proposal (0.0005 ETH)
  console.log("\n--- Step 2: Creating Funding Proposal (0.0005 ETH) ---");
  const fundingAmount = parseEther("0.0005");
  const createFundingTx = await proposalRegistry.write.createFundingProposal([
    BigInt(0),
    "Demo Grant Payout",
    "Request 0.0005 ETH for dev bounties",
    fundingAmount,
    BigInt(604800), // 7-day voting period
  ]);
  console.log("Create Funding Proposal Tx Hash:", createFundingTx);
  await publicClient.waitForTransactionReceipt({ hash: createFundingTx });

  const fundingPropId = (await proposalRegistry.read.proposalCount()) - BigInt(1);
  console.log("Funding Proposal ID:", fundingPropId.toString());

  // 3. Vote YES immediately
  console.log("\n--- Step 3: Voting YES on Funding Proposal ---");
  const voteFundingTx = await proposalRegistry.write.vote([fundingPropId, true]);
  console.log("Vote Funding Tx Hash:", voteFundingTx);
  await publicClient.waitForTransactionReceipt({ hash: voteFundingTx });

  // 4. Create RuleChange Proposal
  console.log("\n--- Step 4: Creating RuleChange Proposal ---");
  const newMax = parseEther("0.005");
  const newHighThresh = parseEther("0.001");
  const newHighBps = BigInt(6600); // 66.00%

  const createRuleTx = await proposalRegistry.write.createRuleChangeProposal([
    BigInt(0),
    "Demo Spending Rule Update",
    "Set cap to 0.005 ETH, high-value thresh to 0.001 ETH @ 66%",
    newMax,
    newHighThresh,
    newHighBps,
    BigInt(604800), // 7-day voting period
  ]);
  console.log("Create RuleChange Proposal Tx Hash:", createRuleTx);
  await publicClient.waitForTransactionReceipt({ hash: createRuleTx });

  const rulePropId = (await proposalRegistry.read.proposalCount()) - BigInt(1);
  console.log("RuleChange Proposal ID:", rulePropId.toString());

  // 5. Vote YES on RuleChange Proposal
  console.log("\n--- Step 5: Voting YES on RuleChange Proposal ---");
  const voteRuleTx = await proposalRegistry.write.vote([rulePropId, true]);
  console.log("Vote RuleChange Tx Hash:", voteRuleTx);
  await publicClient.waitForTransactionReceipt({ hash: voteRuleTx });

  console.log("\nAll Live Onchain Transactions Successfully Executed!");
}

main().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exitCode = 1;
});
