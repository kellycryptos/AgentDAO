const hre = require("hardhat");

async function main() {
  const contractAddress = "0x7F45BF6De97E5D509D27a33ED6C6ea73D04026F3";
  const registry = await hre.viem.getContractAt("ProposalRegistry", contractAddress);
  const [wallet] = await hre.viem.getWalletClients();
  const addr = wallet.account.address;
  const isMember = await registry.read.isMember([BigInt(0), addr]);
  const group = await registry.read.getGroup([BigInt(0)]);
  const propCount = await registry.read.proposalCount();
  console.log("Deployer wallet:", addr);
  console.log("isMember of group 0:", isMember);
  console.log("Group admin:", group.admin);
  console.log("Group isOpen:", group.isOpen);
  console.log("Total proposals:", propCount.toString());
  // Print last 3 proposals
  for (let i = Number(propCount) - 1; i >= Math.max(0, Number(propCount) - 3); i--) {
    const p = await registry.read.getProposal([BigInt(i)]);
    console.log(`Proposal ${i}: type=${p.proposalType}, finalized=${p.finalized}, executed=${p.executed}, deadline=${new Date(Number(p.deadline)*1000).toISOString()}`);
  }
}
main().catch(console.error);
