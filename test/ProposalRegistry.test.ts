import hre from "hardhat";
import { expect } from "chai";
import { parseEther } from "viem";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProposalRegistry — Group Management & Access Control", function () {
  const ONE_WEEK = 604800n; // 7 days in seconds
  const THRESHOLD_51 = 5100n; // 51.00% approval threshold

  async function deployProposalRegistryFixture() {
    const [owner, alice, bob, charlie, david] = await hre.viem.getWalletClients();
    const proposalRegistry = await hre.viem.deployContract("ProposalRegistry");
    const publicClient = await hre.viem.getPublicClient();

    return { proposalRegistry, owner, alice, bob, charlie, david, publicClient };
  }

  describe("Group Creation & Member Management", function () {
    it("should start with groupCount of 0", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();
      const count = await proposalRegistry.read.groupCount();
      expect(count).to.equal(0n);
    });

    it("1. should create an open group, auto-add admin as member, and read group details", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup([
        "Public Demo Group",
        "Open group for testing",
        true, // isOpen
        THRESHOLD_51,
        ONE_WEEK,
      ]);

      const count = await proposalRegistry.read.groupCount();
      expect(count).to.equal(1n);

      const group = await proposalRegistry.read.getGroup([0n]);
      expect(group.name).to.equal("Public Demo Group");
      expect(group.description).to.equal("Open group for testing");
      expect(group.admin.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      expect(group.isOpen).to.equal(true);
      expect(group.approvalThresholdBps).to.equal(THRESHOLD_51);
      expect(group.defaultVotingPeriod).to.equal(ONE_WEEK);
      expect(group.memberCount).to.equal(1n);

      const isOwnerMember = await proposalRegistry.read.isMember([0n, owner.account.address]);
      expect(isOwnerMember).to.equal(true);
    });

    it("2. should allow any wallet to self-join an open group", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Anyone can join", true, THRESHOLD_51, ONE_WEEK]);

      await proposalRegistry.write.joinGroup([0n], { account: alice.account });

      const isAliceMember = await proposalRegistry.read.isMember([0n, alice.account.address]);
      expect(isAliceMember).to.equal(true);

      const group = await proposalRegistry.read.getGroup([0n]);
      expect(group.memberCount).to.equal(2n);
    });

    it("3. should revert joinGroup with AlreadyMember if wallet is already a member", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Anyone can join", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([0n], { account: alice.account });

      await expect(
        proposalRegistry.write.joinGroup([0n], { account: alice.account })
      ).to.be.rejectedWith("AlreadyMember");
    });

    it("4. should check AlreadyMember before GroupNotOpen on closed groups", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      // Create a closed (invite-only) group
      await proposalRegistry.write.createGroup(["VIP DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);
      
      // Admin adds Alice
      await proposalRegistry.write.addMember([0n, alice.account.address]);

      // Admin calling joinGroup on group #0 should revert AlreadyMember (not GroupNotOpen)
      await expect(
        proposalRegistry.write.joinGroup([0n])
      ).to.be.rejectedWith("AlreadyMember");

      // Alice (already added by admin) calling joinGroup should revert AlreadyMember (not GroupNotOpen)
      await expect(
        proposalRegistry.write.joinGroup([0n], { account: alice.account })
      ).to.be.rejectedWith("AlreadyMember");
    });

    it("5. should revert joinGroup with GroupNotOpen for non-members on invite-only groups", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed Group", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.joinGroup([0n], { account: alice.account })
      ).to.be.rejectedWith("GroupNotOpen");
    });

    it("6. should allow admin to add and remove members in invite-only groups", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      // Admin adds Alice
      await proposalRegistry.write.addMember([0n, alice.account.address]);
      let isAliceMember = await proposalRegistry.read.isMember([0n, alice.account.address]);
      expect(isAliceMember).to.equal(true);

      // Admin removes Alice
      await proposalRegistry.write.removeMember([0n, alice.account.address]);
      isAliceMember = await proposalRegistry.read.isMember([0n, alice.account.address]);
      expect(isAliceMember).to.equal(false);
    });

    it("7. should revert addMember and removeMember when called by non-admin", async function () {
      const { proposalRegistry, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.addMember([0n, bob.account.address], { account: alice.account })
      ).to.be.rejectedWith("NotGroupAdmin");

      await expect(
        proposalRegistry.write.removeMember([0n, bob.account.address], { account: alice.account })
      ).to.be.rejectedWith("NotGroupAdmin");
    });

    it("8. should revert removeMember when admin tries to remove themselves", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.removeMember([0n, owner.account.address])
      ).to.be.rejectedWith("CannotRemoveAdmin");
    });
  });

  describe("Proposal & Voting Access Control", function () {
    it("9. should revert createProposal with NotGroupMember when non-member tries to create a proposal", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.createProposal(
          [0n, "Grant Title", "Grant Summary", parseEther("1000"), ONE_WEEK],
          { account: alice.account }
        )
      ).to.be.rejectedWith("NotGroupMember");
    });

    it("10. should allow group member to create a proposal scoped to their groupId", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Community DAO", "Open group", true, THRESHOLD_51, ONE_WEEK]);

      await proposalRegistry.write.createProposal([
        0n,
        "Art Grant",
        "Fund community art",
        parseEther("2000"),
        ONE_WEEK,
      ]);

      const proposal = await proposalRegistry.read.getProposal([0n]);
      expect(proposal.groupId).to.equal(0n);
      expect(proposal.title).to.equal("Art Grant");
      expect(proposal.proposer.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it("11. should revert vote with NotGroupMember when non-member tries to vote", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.createProposal([0n, "Title", "Summary", parseEther("500"), ONE_WEEK]);

      // Alice is not a member of Group #0
      await expect(
        proposalRegistry.write.vote([0n, true], { account: alice.account })
      ).to.be.rejectedWith("NotGroupMember");
    });

    it("12. should allow group members to vote and track yes/no tallies", async function () {
      const { proposalRegistry, owner, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([0n], { account: alice.account });
      await proposalRegistry.write.joinGroup([0n], { account: bob.account });

      await proposalRegistry.write.createProposal([0n, "Title", "Summary", parseEther("500"), ONE_WEEK]);

      // Owner votes YES
      await proposalRegistry.write.vote([0n, true], { account: owner.account });
      // Alice votes YES
      await proposalRegistry.write.vote([0n, true], { account: alice.account });
      // Bob votes NO
      await proposalRegistry.write.vote([0n, false], { account: bob.account });

      const proposal = await proposalRegistry.read.getProposal([0n]);
      expect(proposal.yesVotes).to.equal(2n);
      expect(proposal.noVotes).to.equal(1n);
    });
  });

  describe("Approval Threshold Finalization Enforcement", function () {
    it("13. should PASS a proposal meeting the group's 51% approval threshold (2 YES, 1 NO = 66.6%)", async function () {
      const { proposalRegistry, owner, alice, bob } = await deployProposalRegistryFixture();

      // Create group with 51.00% threshold (5100 BPS)
      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, 5100n, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([0n], { account: alice.account });
      await proposalRegistry.write.joinGroup([0n], { account: bob.account });

      await proposalRegistry.write.createProposal([0n, "Grant 1", "Summary 1", parseEther("1000"), ONE_WEEK]);

      await proposalRegistry.write.vote([0n, true], { account: owner.account });
      await proposalRegistry.write.vote([0n, true], { account: alice.account });
      await proposalRegistry.write.vote([0n, false], { account: bob.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([0n]);
      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.yesVotes).to.equal(2n);
      expect(proposal.noVotes).to.equal(1n);
    });

    it("14. should REJECT a proposal failing a 51% threshold (1 YES, 1 NO = 50.0%)", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, 5100n, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([0n], { account: alice.account });

      await proposalRegistry.write.createProposal([0n, "Grant 2", "Summary 2", parseEther("1000"), ONE_WEEK]);

      // 1 YES, 1 NO -> 50% < 51% threshold
      await proposalRegistry.write.vote([0n, true], { account: owner.account });
      await proposalRegistry.write.vote([0n, false], { account: alice.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([0n]);
      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.finalized).to.equal(true);
      // Under 51% threshold, 50% is NOT passed
    });

    it("15. should REJECT a proposal with 0 votes cast upon finalization", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, 5100n, ONE_WEEK]);
      await proposalRegistry.write.createProposal([0n, "No Votes Grant", "Summary", parseEther("500"), ONE_WEEK]);

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([0n]);
      const proposal = await proposalRegistry.read.getProposal([0n]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.yesVotes).to.equal(0n);
      expect(proposal.noVotes).to.equal(0n);
    });
  });
});

