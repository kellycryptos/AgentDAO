import hre from "hardhat";
import { expect } from "chai";
import { parseEther } from "viem";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProposalRegistry — Full Combined Test Suite (Group Management, Treasury & Reentrancy)", function () {
  const ONE_WEEK = BigInt(604800); // 7 days in seconds
  const THRESHOLD_51 = BigInt(5100); // 51.00% approval threshold
  const THRESHOLD_66 = BigInt(6600); // 66.00% high-value threshold

  async function deployProposalRegistryFixture() {
    const [owner, alice, bob, charlie, david] = await hre.viem.getWalletClients();
    const proposalRegistry = await hre.viem.deployContract("ProposalRegistry");
    const publicClient = await hre.viem.getPublicClient();

    return { proposalRegistry, owner, alice, bob, charlie, david, publicClient };
  }

  describe("Group Creation & Member Management", function () {
    it("1. should start with groupCount of 0", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();
      const count = await proposalRegistry.read.groupCount();
      expect(count).to.equal(BigInt(0));
    });

    it("2. should create an open group, auto-add admin as member, and read group details", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup([
        "Public Demo Group",
        "Open group for testing",
        true, // isOpen
        THRESHOLD_51,
        ONE_WEEK,
      ]);

      const count = await proposalRegistry.read.groupCount();
      expect(count).to.equal(BigInt(1));

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.name).to.equal("Public Demo Group");
      expect(group.description).to.equal("Open group for testing");
      expect(group.admin.toLowerCase()).to.equal(owner.account.address.toLowerCase());
      expect(group.isOpen).to.equal(true);
      expect(group.approvalThresholdBps).to.equal(THRESHOLD_51);
      expect(group.defaultVotingPeriod).to.equal(ONE_WEEK);
      expect(group.memberCount).to.equal(BigInt(1));

      const isOwnerMember = await proposalRegistry.read.isMember([BigInt(0), owner.account.address]);
      expect(isOwnerMember).to.equal(true);
    });

    it("3. should allow any wallet to self-join an open group", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Anyone can join", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });

      const isAliceMember = await proposalRegistry.read.isMember([BigInt(0), alice.account.address]);
      expect(isAliceMember).to.equal(true);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.memberCount).to.equal(BigInt(2));
    });

    it("4. should revert joinGroup with AlreadyMember if wallet is already a member", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Anyone can join", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });

      await expect(
        proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account })
      ).to.be.rejectedWith("AlreadyMember");
    });

    it("5. should check AlreadyMember before GroupNotOpen on closed groups", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["VIP DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.addMember([BigInt(0), alice.account.address]);

      await expect(
        proposalRegistry.write.joinGroup([BigInt(0)])
      ).to.be.rejectedWith("AlreadyMember");

      await expect(
        proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account })
      ).to.be.rejectedWith("AlreadyMember");
    });

    it("6. should revert joinGroup with GroupNotOpen for non-members on invite-only groups", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed Group", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account })
      ).to.be.rejectedWith("GroupNotOpen");
    });

    it("7. should allow admin to add and remove members in invite-only groups", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await proposalRegistry.write.addMember([BigInt(0), alice.account.address]);
      let isAliceMember = await proposalRegistry.read.isMember([BigInt(0), alice.account.address]);
      expect(isAliceMember).to.equal(true);

      await proposalRegistry.write.removeMember([BigInt(0), alice.account.address]);
      isAliceMember = await proposalRegistry.read.isMember([BigInt(0), alice.account.address]);
      expect(isAliceMember).to.equal(false);
    });

    it("8. should revert addMember and removeMember when called by non-admin", async function () {
      const { proposalRegistry, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.addMember([BigInt(0), bob.account.address], { account: alice.account })
      ).to.be.rejectedWith("NotGroupAdmin");

      await expect(
        proposalRegistry.write.removeMember([BigInt(0), bob.account.address], { account: alice.account })
      ).to.be.rejectedWith("NotGroupAdmin");
    });

    it("9. should revert removeMember when admin tries to remove themselves", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Private DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.removeMember([BigInt(0), owner.account.address])
      ).to.be.rejectedWith("CannotRemoveAdmin");
    });
  });

  describe("Proposal & Voting Access Control", function () {
    it("10. should revert createProposal with NotGroupMember when non-member tries to create a proposal", async function () {
      const { proposalRegistry, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);

      await expect(
        proposalRegistry.write.createProposal(
          [BigInt(0), "Grant Title", "Grant Summary", parseEther("1000"), ONE_WEEK],
          { account: alice.account }
        )
      ).to.be.rejectedWith("NotGroupMember");
    });

    it("11. should allow group member to create a proposal scoped to their groupId", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Community DAO", "Open group", true, THRESHOLD_51, ONE_WEEK]);

      await proposalRegistry.write.createProposal([
        BigInt(0),
        "Art Grant",
        "Fund community art",
        parseEther("2000"),
        ONE_WEEK,
      ]);

      const proposal = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(proposal.groupId).to.equal(BigInt(0));
      expect(proposal.title).to.equal("Art Grant");
      expect(proposal.proposer.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it("12. should revert vote with NotGroupMember when non-member tries to vote", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Closed DAO", "Invite only", false, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.createProposal([BigInt(0), "Title", "Summary", parseEther("500"), ONE_WEEK]);

      await expect(
        proposalRegistry.write.vote([BigInt(0), true], { account: alice.account })
      ).to.be.rejectedWith("NotGroupMember");
    });

    it("13. should allow group members to vote and track yes/no tallies", async function () {
      const { proposalRegistry, owner, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Open DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });

      await proposalRegistry.write.createProposal([BigInt(0), "Title", "Summary", parseEther("500"), ONE_WEEK]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: bob.account });

      const proposal = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(proposal.yesVotes).to.equal(BigInt(2));
      expect(proposal.noVotes).to.equal(BigInt(1));
    });
  });

  describe("Group Treasury Deposits & Spending Rules", function () {
    it("14. should allow anyone (even non-members) to deposit ETH into group treasury", async function () {
      const { proposalRegistry, owner, charlie, publicClient } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Treasury DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);

      const depositAmount = parseEther("2.5");
      await proposalRegistry.write.depositToTreasury([BigInt(0)], {
        account: charlie.account,
        value: depositAmount,
      });

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(depositAmount);

      const contractBalance = await publicClient.getBalance({ address: proposalRegistry.address });
      expect(contractBalance).to.equal(depositAmount);
    });

    it("15. should revert depositToTreasury for non-existent group ID", async function () {
      const { proposalRegistry, charlie } = await deployProposalRegistryFixture();

      await expect(
        proposalRegistry.write.depositToTreasury([BigInt(99)], {
          account: charlie.account,
          value: parseEther("1"),
        })
      ).to.be.rejectedWith("GroupDoesNotExist");
    });

    it("16. should revert createFundingProposal with ExceedsMaxDisbursement when amount exceeds cap", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      const maxCap = parseEther("2");
      await proposalRegistry.write.createGroupWithRules([
        "Capped DAO",
        "Max 2 ETH cap",
        true,
        THRESHOLD_51,
        ONE_WEEK,
        maxCap,
        parseEther("1"),
        THRESHOLD_66,
      ]);

      await expect(
        proposalRegistry.write.createFundingProposal([
          BigInt(0),
          "Big Funding Request",
          "Needs 3 ETH",
          parseEther("3"),
          ONE_WEEK,
        ])
      ).to.be.rejectedWith("ExceedsMaxDisbursement");
    });

    it("17. should store createRuleChangeProposal proposed values correctly without touching amount or treasury", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Rule DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);

      const newMax = parseEther("5");
      const newHighThresh = parseEther("2");
      const newHighBps = BigInt(7000);

      await proposalRegistry.write.createRuleChangeProposal([
        BigInt(0),
        "Increase Cap Proposal",
        "Raise cap to 5 ETH",
        newMax,
        newHighThresh,
        newHighBps,
        ONE_WEEK,
      ]);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.proposalType).to.equal(1);
      expect(prop.amount).to.equal(BigInt(0));
      expect(prop.proposedMaxDisbursement).to.equal(newMax);
      expect(prop.proposedHighValueThreshold).to.equal(newHighThresh);
      expect(prop.proposedHighValueApprovalBps).to.equal(newHighBps);
      expect(prop.executed).to.equal(false);
    });
  });

  describe("Proposal Finalization, Auto-Disbursement & Insufficient Treasury Guards", function () {
    it("18. should auto-disburse ETH to proposer on passed Funding proposal with sufficient treasury balance", async function () {
      const { proposalRegistry, owner, alice, bob, publicClient } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Funded DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });

      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("5") });

      const requestAmount = parseEther("1.5");
      await proposalRegistry.write.createFundingProposal(
        [BigInt(0), "Grant Request", "1.5 ETH for dev", requestAmount, ONE_WEEK],
        { account: alice.account }
      );

      const aliceBalBefore = await publicClient.getBalance({ address: alice.account.address });

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: bob.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.finalized).to.equal(true);
      expect(prop.executed).to.equal(true);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(parseEther("3.5"));

      const aliceBalAfter = await publicClient.getBalance({ address: alice.account.address });
      expect(aliceBalAfter > aliceBalBefore).to.equal(true);
    });

    it("19. CRITICAL — should revert InsufficientTreasuryFunds on passed Funding proposal if treasury balance is insufficient, leaving treasury balance unchanged and executed = false", async function () {
      const { proposalRegistry, owner, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Underfunded DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });

      const currentTreasury = parseEther("1");
      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: currentTreasury });

      const requestAmount = parseEther("5");
      await proposalRegistry.write.createFundingProposal(
        [BigInt(0), "Big Request", "Needs 5 ETH", requestAmount, ONE_WEEK],
        { account: alice.account }
      );

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: bob.account });

      await time.increase(604801);

      await expect(
        proposalRegistry.write.finalizeProposal([BigInt(0)])
      ).to.be.rejectedWith("InsufficientTreasuryFunds");

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(currentTreasury);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.executed).to.equal(false);
      expect(prop.finalized).to.equal(false);
    });

    it("20. should update group rules upon passed RuleChange proposal and leave ETH untouched", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Gov DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });

      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("2") });

      const proposedMax = parseEther("10");
      const proposedHighThresh = parseEther("3");
      const proposedHighBps = BigInt(7500);

      await proposalRegistry.write.createRuleChangeProposal([
        BigInt(0),
        "Governance Rule Update",
        "Set max to 10 ETH, high-value thresh to 3 ETH @ 75%",
        proposedMax,
        proposedHighThresh,
        proposedHighBps,
        ONE_WEEK,
      ]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.maxDisbursementPerProposal).to.equal(proposedMax);
      expect(group.highValueThreshold).to.equal(proposedHighThresh);
      expect(group.highValueApprovalBps).to.equal(proposedHighBps);
      expect(group.treasuryBalance).to.equal(parseEther("2"));

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.finalized).to.equal(true);
      expect(prop.executed).to.equal(true);
    });
  });

  describe("Approval Threshold & High-Value Supermajority Enforcement", function () {
    it("21. should PASS a proposal meeting the group's 51% approval threshold (2 YES, 1 NO = 66.6%)", async function () {
      const { proposalRegistry, owner, alice, bob } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });

      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("1") });
      await proposalRegistry.write.createProposal([BigInt(0), "Grant 1", "Summary 1", parseEther("1"), ONE_WEEK]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: bob.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);
      const proposal = await proposalRegistry.read.getProposal([BigInt(0)]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.yesVotes).to.equal(BigInt(2));
      expect(proposal.noVotes).to.equal(BigInt(1));
    });

    it("22. should REJECT a proposal failing a 51% threshold (1 YES, 1 NO = 50.0%)", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });

      await proposalRegistry.write.createProposal([BigInt(0), "Grant 2", "Summary 2", parseEther("1000"), ONE_WEEK]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: alice.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);
      const proposal = await proposalRegistry.read.getProposal([BigInt(0)]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.executed).to.equal(false);
    });

    it("23. should REJECT a proposal with 0 votes cast upon finalization", async function () {
      const { proposalRegistry } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["DAO 51%", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.createProposal([BigInt(0), "No Votes Grant", "Summary", parseEther("500"), ONE_WEEK]);

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);
      const proposal = await proposalRegistry.read.getProposal([BigInt(0)]);

      expect(proposal.finalized).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.yesVotes).to.equal(BigInt(0));
      expect(proposal.noVotes).to.equal(BigInt(0));
    });

    it("24. should REJECT a high-value proposal that passes normal 51% threshold but fails high-value 66% supermajority bar", async function () {
      const { proposalRegistry, owner, alice, bob, charlie, david } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroupWithRules([
        "Supermajority DAO",
        "High threshold DAO",
        true,
        THRESHOLD_51,
        ONE_WEEK,
        parseEther("10"),
        parseEther("1"),
        THRESHOLD_66,
      ]);

      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: charlie.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: david.account });

      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("10") });

      await proposalRegistry.write.createFundingProposal([
        BigInt(0),
        "High Value Grant",
        "Needs 3 ETH",
        parseEther("3"),
        ONE_WEEK,
      ]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: bob.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: charlie.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: david.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.finalized).to.equal(true);
      expect(prop.executed).to.equal(false);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(parseEther("10"));
    });

    it("25. should PASS a high-value proposal meeting the 66% supermajority bar (4 YES, 1 NO = 80%)", async function () {
      const { proposalRegistry, owner, alice, bob, charlie, david } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroupWithRules([
        "Supermajority DAO",
        "High threshold DAO",
        true,
        THRESHOLD_51,
        ONE_WEEK,
        parseEther("10"),
        parseEther("1"),
        THRESHOLD_66,
      ]);

      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: bob.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: charlie.account });
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: david.account });

      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("10") });

      await proposalRegistry.write.createFundingProposal([
        BigInt(0),
        "High Value Grant",
        "Needs 3 ETH",
        parseEther("3"),
        ONE_WEEK,
      ]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: alice.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: bob.account });
      await proposalRegistry.write.vote([BigInt(0), true], { account: charlie.account });
      await proposalRegistry.write.vote([BigInt(0), false], { account: david.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.finalized).to.equal(true);
      expect(prop.executed).to.equal(true);
    });
  });

  describe("Failed Votes & Reentrancy / Checks-Effects-Interactions Guard", function () {
    it("26. should set executed = false and leave treasury untouched on failed votes", async function () {
      const { proposalRegistry, owner, alice } = await deployProposalRegistryFixture();

      await proposalRegistry.write.createGroup(["Test DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await proposalRegistry.write.joinGroup([BigInt(0)], { account: alice.account });
      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("5") });

      await proposalRegistry.write.createFundingProposal([
        BigInt(0),
        "Failed Grant",
        "Will fail",
        parseEther("1"),
        ONE_WEEK,
      ]);

      await proposalRegistry.write.vote([BigInt(0), false], { account: alice.account });

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const prop = await proposalRegistry.read.getProposal([BigInt(0)]);
      expect(prop.finalized).to.equal(true);
      expect(prop.executed).to.equal(false);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(parseEther("5"));
    });

    it("27. Reentrancy & Checks-Effects-Interactions Verification: nonReentrant guard blocks malicious contract re-entry during auto-disbursement", async function () {
      const { proposalRegistry, owner } = await deployProposalRegistryFixture();

      const attacker = await hre.viem.deployContract("ReentrantMaliciousReceiver", [
        proposalRegistry.address,
      ]);

      await proposalRegistry.write.createGroup(["Target DAO", "Open", true, THRESHOLD_51, ONE_WEEK]);
      await attacker.write.doJoinGroup([BigInt(0)]);
      await proposalRegistry.write.depositToTreasury([BigInt(0)], { value: parseEther("3") });

      await attacker.write.doCreateFundingProposal([
        BigInt(0),
        "Attacker Proposal",
        "Reentrancy test",
        parseEther("1"),
        ONE_WEEK,
      ]);

      await attacker.write.setTargetProposal([BigInt(0)]);

      await proposalRegistry.write.vote([BigInt(0), true], { account: owner.account });
      await attacker.write.doVote([BigInt(0), true]);

      await time.increase(604801);

      await proposalRegistry.write.finalizeProposal([BigInt(0)]);

      const attackAttempted = await attacker.read.attackAttempted();
      const attackSucceeded = await attacker.read.attackSucceeded();

      expect(attackAttempted).to.equal(true);
      expect(attackSucceeded).to.equal(false);

      const group = await proposalRegistry.read.getGroup([BigInt(0)]);
      expect(group.treasuryBalance).to.equal(parseEther("2"));
    });
  });
});
