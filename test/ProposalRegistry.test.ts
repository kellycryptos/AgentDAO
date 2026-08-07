import hre from "hardhat";
import { expect } from "chai";
import { parseEther } from "viem";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProposalRegistry", function () {
  const ONE_WEEK = 604800n; // 7 days in seconds

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

    it("1. should create a proposal with deadline and read it back correctly", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      const title = "Community Art Grant";
      const summary = "Allocate funding for local digital artists.";
      const amount = parseEther("2000");

      await proposalRegistry.write.createProposal([title, summary, amount, ONE_WEEK]);

      const count = await proposalRegistry.read.proposalCount();
      expect(count).to.equal(1n);

      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.title).to.equal(title);
      expect(proposal.summary).to.equal(summary);
      expect(proposal.amount).to.equal(amount);
      expect(proposal.proposer.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      expect(proposal.yesVotes).to.equal(0n);
      expect(proposal.noVotes).to.equal(0n);
      expect(proposal.createdAt > 0n).to.equal(true);
      expect(proposal.deadline).to.equal(proposal.createdAt + ONE_WEEK);
      expect(proposal.finalized).to.equal(false);
    });

    it("should return the correct proposalCount after multiple creations", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Proposal 1", "Summary 1", parseEther("100"), ONE_WEEK]);
      await proposalRegistry.write.createProposal(["Proposal 2", "Summary 2", parseEther("200"), ONE_WEEK]);
      await proposalRegistry.write.createProposal(["Proposal 3", "Summary 3", parseEther("300"), ONE_WEEK]);

      const count = await proposalRegistry.read.proposalCount();
      expect(count).to.equal(3n);
    });
  });

  describe("Voting Logic & Deadlines", function () {
    it("2. should allow voting before deadline, and update vote counts correctly", async function () {
      const { proposalRegistry, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Security Audit", "Audit smart contracts", parseEther("5000"), ONE_WEEK]);

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

    it("3. should reject voting after deadline with VotingClosed error", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Hackathon Bounties", "Developer prizes", parseEther("3500"), ONE_WEEK]);

      // Fast forward time past deadline
      await time.increase(604801);

      // Vote after deadline must revert
      await expect(
        proposalRegistry.write.vote([0n, true], { account: alice.account })
      ).to.be.rejectedWith("VotingClosed");
    });

    it("4. should reject a double vote from the same address with AlreadyVoted error", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Hackathon Bounties", "Developer prizes", parseEther("3500"), ONE_WEEK]);

      await proposalRegistry.write.vote([0n, true], { account: alice.account });

      await expect(
        proposalRegistry.write.vote([0n, true], { account: alice.account })
      ).to.be.rejectedWith("AlreadyVoted");
    });

    it("5. should reject a vote on a nonexistent proposal ID with ProposalDoesNotExist error", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await expect(
        proposalRegistry.write.vote([99n, true], { account: alice.account })
      ).to.be.rejectedWith("ProposalDoesNotExist");
    });
  });

  describe("Proposal Finalization", function () {
    it("6. should revert finalizeProposal if called before deadline with VotingStillOpen error", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Grant 1", "Summary 1", parseEther("1000"), ONE_WEEK]);

      await expect(
        proposalRegistry.write.finalizeProposal([0n])
      ).to.be.rejectedWith("VotingStillOpen");
    });

    it("7. should finalize a passed proposal after deadline when yesVotes > noVotes", async function () {
      const { proposalRegistry, alice, publicClient } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Grant 1", "Summary 1", parseEther("1000"), ONE_WEEK]);
      await proposalRegistry.write.vote([0n, true], { account: alice.account });

      // Fast forward past deadline
      await time.increase(604801);

      const hash = await proposalRegistry.write.finalizeProposal([0n]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const proposal = await proposalRegistry.read.getProposal([0n]);
      expect(proposal.finalized).to.equal(true);
      expect(receipt.status).to.equal("success");
    });

    it("8. should revert finalizeProposal with AlreadyFinalized if called twice", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Grant 2", "Summary 2", parseEther("1000"), ONE_WEEK]);
      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([0n]);

      await expect(
        proposalRegistry.write.finalizeProposal([0n])
      ).to.be.rejectedWith("AlreadyFinalized");
    });

    it("9. should finalize a rejected proposal when noVotes >= yesVotes", async function () {
      const { proposalRegistry, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createProposal(["Grant 3", "Summary 3", parseEther("1000"), ONE_WEEK]);
      await proposalRegistry.write.vote([0n, false], { account: bob.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([0n]);
      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.yesVotes).to.equal(0n);
      expect(proposal.noVotes).to.equal(1n);
    });
  });
});
