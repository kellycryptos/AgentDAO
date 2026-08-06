import hre from "hardhat";
import { expect } from "chai";
import { parseEther } from "viem";

describe("ProposalRegistry", function () {
  async function deployProposalRegistryFixture() {
    const [owner, alice, bob] = await hre.viem.getWalletClients();
    const proposalRegistry = await hre.viem.deployContract("ProposalRegistry");
    const publicClient = await hre.viem.getPublicClient();

    return { proposalRegistry, owner, alice, bob, publicClient };
  }

  describe("Proposal Creation & Getters", function () {
    it("should start with a proposalCount of 0", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();
      const count = await proposalRegistry.read.proposalCount();
      expect(count).to.equal(0n);
    });

    it("1. should create a proposal and read it back correctly", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      const title = "Community Art Grant";
      const summary = "Allocate funding for local digital artists.";
      const amount = parseEther("2000");

      await proposalRegistry.write.createProposal([title, summary, amount]);

      const count = await proposalRegistry.read.proposalCount();
      expect(count).to.equal(1n);

      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.title).to.equal(title);
      expect(proposal.summary).to.equal(summary);
      expect(proposal.amount).to.equal(amount);
      expect(proposal.proposer.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      expect(proposal.yesVotes).to.equal(0n);
      expect(proposal.noVotes).to.equal(0n);
      expect(proposal.createdAt).to.be.greaterThan(0n);
    });

    it("5. should return the correct proposalCount after multiple creations", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Proposal 1", "Summary 1", parseEther("100")]);
      await proposalRegistry.write.createProposal(["Proposal 2", "Summary 2", parseEther("200")]);
      await proposalRegistry.write.createProposal(["Proposal 3", "Summary 3", parseEther("300")]);

      const count = await proposalRegistry.read.proposalCount();
      expect(count).to.equal(3n);
    });
  });

  describe("Voting Logic & Controls", function () {
    it("2. should allow voting yes and voting no, and update vote counts correctly", async function () {
      const { proposalRegistry, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Security Audit", "Audit smart contracts", parseEther("5000")]);

      // Alice votes YES (support = true)
      await proposalRegistry.write.vote([0n, true], { account: alice.account });

      let proposal = await proposalRegistry.read.getProposal([0n]);
      expect(proposal.yesVotes).to.equal(1n);
      expect(proposal.noVotes).to.equal(0n);

      // Bob votes NO (support = false)
      await proposalRegistry.write.vote([0n, false], { account: bob.account });

      proposal = await proposalRegistry.read.getProposal([0n]);
      expect(proposal.yesVotes).to.equal(1n);
      expect(proposal.noVotes).to.equal(1n);
    });

    it("3. should reject a double vote from the same address with AlreadyVoted error", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Hackathon Bounties", "Developer prizes", parseEther("3500")]);

      // First vote passes
      await proposalRegistry.write.vote([0n, true], { account: alice.account });

      // Second vote from Alice must revert
      await expect(
        proposalRegistry.write.vote([0n, true], { account: alice.account })
      ).to.be.rejectedWith("AlreadyVoted");
    });

    it("4. should reject a vote on a nonexistent proposal ID with ProposalDoesNotExist error", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      // Voting on proposal 99 (nonexistent) must revert
      await expect(
        proposalRegistry.write.vote([99n, true], { account: alice.account })
      ).to.be.rejectedWith("ProposalDoesNotExist");

      // Reading nonexistent proposal 99 must also revert
      await expect(
        proposalRegistry.read.getProposal([99n])
      ).to.be.rejectedWith("ProposalDoesNotExist");
    });
  });
});
