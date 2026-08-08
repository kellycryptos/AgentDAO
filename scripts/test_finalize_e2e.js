const hre = require("hardhat");
const { parseEther, formatEther } = require("viem");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const contractAddress = "0x7F45BF6De97E5D509D27a33ED6C6ea73D04026F3";
  console.log("=== finalizeProposal E2E Test (120s window) ===");
  console.log("Contract:", contractAddress);

  const registry = await hre.viem.getContractAt("ProposalRegistry", contractAddress);
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const proposer = wallet.account.address;

  // ── Snapshot before ──────────────────────────────────────────────────────
  const groupBefore = await registry.read.getGroup([BigInt(0)]);
  const balBefore = await publicClient.getBalance({ address: proposer });
  console.log("\nBEFORE:");
  console.log("  Treasury :", formatEther(groupBefore.treasuryBalance), "ETH");
  console.log("  Proposer :", formatEther(balBefore), "ETH");
  
  const fundAmount = parseEther("0.0005");
  const countBefore = await registry.read.proposalCount();
  console.log("  Proposal count:", countBefore.toString());

  // ── Create Funding Proposal (120s) ───────────────────────────────────────
  console.log("\n[1] Creating Funding Proposal (0.0005 ETH, 120s)...");
  const t1 = await registry.write.createFundingProposal([
    BigInt(0), "Finalize E2E: Payout", "Auto-disbursement test — 0.0005 ETH", fundAmount, BigInt(120),
  ]);
  console.log("  Tx:", t1);
  await publicClient.waitForTransactionReceipt({ hash: t1 });
  const fundId = (await registry.read.proposalCount()) - BigInt(1);
  console.log("  Funding Proposal ID:", fundId.toString());

  // ── Vote YES on Funding ───────────────────────────────────────────────────
  console.log("\n[2] Voting YES on Funding Proposal ID", fundId.toString(), "...");
  const t2 = await registry.write.vote([fundId, true]);
  console.log("  Tx:", t2);
  await publicClient.waitForTransactionReceipt({ hash: t2 });
  console.log("  Vote confirmed.");

  // ── Create RuleChange Proposal (120s) ────────────────────────────────────
  console.log("\n[3] Creating RuleChange Proposal (120s)...");
  const t3 = await registry.write.createRuleChangeProposal([
    BigInt(0), "Finalize E2E: Rules", "Set max 0.002 ETH, high-value 0.001 ETH @ 66%",
    parseEther("0.002"), parseEther("0.001"), BigInt(6600), BigInt(120),
  ]);
  console.log("  Tx:", t3);
  await publicClient.waitForTransactionReceipt({ hash: t3 });
  const ruleId = (await registry.read.proposalCount()) - BigInt(1);
  console.log("  RuleChange Proposal ID:", ruleId.toString());
  // Sanity check — IDs must differ
  if (ruleId === fundId) throw new Error("Proposal IDs are the same — abort!");

  // ── Vote YES on RuleChange ────────────────────────────────────────────────
  console.log("\n[4] Voting YES on RuleChange Proposal ID", ruleId.toString(), "...");
  const t4 = await registry.write.vote([ruleId, true]);
  console.log("  Tx:", t4);
  await publicClient.waitForTransactionReceipt({ hash: t4 });
  console.log("  Vote confirmed.");

  // ── Wait for deadline ─────────────────────────────────────────────────────
  console.log("\nWaiting 130 seconds for deadlines to expire...");
  await sleep(130000);
  console.log("Deadline passed.");

  // ── Finalize Funding ──────────────────────────────────────────────────────
  console.log("\n[5] finalizeProposal(", fundId.toString(), ") — Funding...");
  const t5 = await registry.write.finalizeProposal([fundId]);
  console.log("  Finalize Funding Tx:", t5);
  await publicClient.waitForTransactionReceipt({ hash: t5 });

  // ── Finalize RuleChange ───────────────────────────────────────────────────
  console.log("\n[6] finalizeProposal(", ruleId.toString(), ") — RuleChange...");
  const t6 = await registry.write.finalizeProposal([ruleId]);
  console.log("  Finalize RuleChange Tx:", t6);
  await publicClient.waitForTransactionReceipt({ hash: t6 });

  // ── Read results ──────────────────────────────────────────────────────────
  const groupAfter = await registry.read.getGroup([BigInt(0)]);
  const balAfter = await publicClient.getBalance({ address: proposer });
  const fundProp = await registry.read.getProposal([fundId]);
  const ruleProp = await registry.read.getProposal([ruleId]);

  const treasuryDelta = BigInt(groupBefore.treasuryBalance) - BigInt(groupAfter.treasuryBalance);
  const balDelta = balAfter - balBefore;

  console.log("\n=== RESULTS ===");
  console.log("Treasury BEFORE          :", formatEther(groupBefore.treasuryBalance), "ETH");
  console.log("Treasury AFTER           :", formatEther(groupAfter.treasuryBalance), "ETH");
  console.log("Treasury decrease        :", formatEther(treasuryDelta), "ETH (expected 0.0005)");
  console.log("");
  console.log("Proposer balance BEFORE  :", formatEther(balBefore), "ETH");
  console.log("Proposer balance AFTER   :", formatEther(balAfter), "ETH");
  console.log("Proposer net (after gas) :", formatEther(balDelta >= 0n ? balDelta : -balDelta), "ETH", balDelta >= 0n ? "gained" : "lost (gas > payout)");
  console.log("");
  console.log("Funding  finalized:", fundProp.finalized, " executed:", fundProp.executed);
  console.log("RuleChange finalized:", ruleProp.finalized, " executed:", ruleProp.executed);
  console.log("");
  console.log("New maxDisbursementPerProposal :", formatEther(groupAfter.maxDisbursementPerProposal), "(expected 0.002)");
  console.log("New highValueThreshold         :", formatEther(groupAfter.highValueThreshold), "(expected 0.001)");
  console.log("New highValueApprovalBps       :", groupAfter.highValueApprovalBps.toString(), "(expected 6600)");

  const pass = treasuryDelta === fundAmount && fundProp.executed && ruleProp.executed;
  console.log("\n" + (pass ? "✅ ALL CHECKS PASSED" : "⚠️ CHECK MISMATCH — see above"));
}

main().catch((err) => {
  console.error("Error:", err.shortMessage || err.message || err);
  process.exitCode = 1;
});
