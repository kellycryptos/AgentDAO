// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProposalRegistry {
    enum ProposalType { Funding, RuleChange }

    struct Group {
        string name;
        string description;
        address admin;
        bool isOpen; // true = anyone can self-join, false = admin must add members
        uint256 approvalThresholdBps; // e.g. 5100 = 51.00%
        uint256 defaultVotingPeriod; // seconds
        uint256 memberCount;
        uint256 treasuryBalance; // WEI
        uint256 maxDisbursementPerProposal; // hard cap in WEI, 0 = no cap
        uint256 highValueThreshold; // WEI amount above which highValueApprovalBps applies
        uint256 highValueApprovalBps; // e.g. 6600 = 66.00%
    }

    struct Proposal {
        uint256 groupId;
        ProposalType proposalType;
        string title;
        string summary;
        uint256 amount; // WEI for Funding proposals
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 createdAt;
        uint256 deadline;
        bool finalized;
        bool executed; // tracks whether payout executed or rules updated
        uint256 proposedMaxDisbursement;
        uint256 proposedHighValueThreshold;
        uint256 proposedHighValueApprovalBps;
    }

    Group[] public groups;
    Proposal[] public proposals;

    // groupId => account => isMember
    mapping(uint256 => mapping(address => bool)) public isMember;
    // proposalId => account => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Reentrancy Guard Flag
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "REENTRANCY_GUARD");
        locked = true;
        _;
        locked = false;
    }

    event GroupCreated(uint256 indexed groupId, string name, address indexed admin, bool isOpen);
    event MemberJoined(uint256 indexed groupId, address indexed member);
    event MemberAdded(uint256 indexed groupId, address indexed member, address indexed addedBy);
    event MemberRemoved(uint256 indexed groupId, address indexed member, address indexed removedBy);
    event ProposalCreated(uint256 indexed id, uint256 indexed groupId, address indexed proposer, uint256 deadline, ProposalType proposalType);
    event VoteCast(uint256 indexed id, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed id, bool passed, bool executed);
    event TreasuryDeposit(uint256 indexed groupId, address indexed sender, uint256 amount);
    event TreasuryDisbursed(uint256 indexed proposalId, uint256 indexed groupId, address indexed recipient, uint256 amount);
    event GroupRulesUpdated(uint256 indexed groupId, uint256 newMaxDisbursement, uint256 newHighValueThreshold, uint256 newHighValueApprovalBps);

    error GroupDoesNotExist(uint256 groupId);
    error GroupNotOpen(uint256 groupId);
    error AlreadyMember(uint256 groupId, address account);
    error NotGroupMember(uint256 groupId, address account);
    error NotGroupAdmin(uint256 groupId, address account);
    error CannotRemoveAdmin(uint256 groupId);
    error InvalidThresholdBps(uint256 bps);
    error AlreadyVoted(uint256 proposalId, address voter);
    error ProposalDoesNotExist(uint256 proposalId);
    error VotingClosed(uint256 proposalId);
    error VotingStillOpen(uint256 proposalId);
    error AlreadyFinalized(uint256 proposalId);
    error ExceedsMaxDisbursement(uint256 amount, uint256 maxDisbursement);
    error InsufficientTreasuryFunds(uint256 required, uint256 available);
    error TransferFailed(address recipient, uint256 amount);

    function createGroup(
        string calldata name,
        string calldata description,
        bool isOpen,
        uint256 approvalThresholdBps,
        uint256 defaultVotingPeriod
    ) external returns (uint256) {
        return _createGroupInternal(name, description, isOpen, approvalThresholdBps, defaultVotingPeriod, 0, 0, 0);
    }

    function createGroupWithRules(
        string calldata name,
        string calldata description,
        bool isOpen,
        uint256 approvalThresholdBps,
        uint256 defaultVotingPeriod,
        uint256 maxDisbursementPerProposal,
        uint256 highValueThreshold,
        uint256 highValueApprovalBps
    ) external returns (uint256) {
        return _createGroupInternal(
            name,
            description,
            isOpen,
            approvalThresholdBps,
            defaultVotingPeriod,
            maxDisbursementPerProposal,
            highValueThreshold,
            highValueApprovalBps
        );
    }

    function _createGroupInternal(
        string calldata name,
        string calldata description,
        bool isOpen,
        uint256 approvalThresholdBps,
        uint256 defaultVotingPeriod,
        uint256 maxDisbursementPerProposal,
        uint256 highValueThreshold,
        uint256 highValueApprovalBps
    ) internal returns (uint256) {
        if (approvalThresholdBps > 10000) {
            revert InvalidThresholdBps(approvalThresholdBps);
        }
        if (highValueApprovalBps > 10000) {
            revert InvalidThresholdBps(highValueApprovalBps);
        }

        uint256 groupId = groups.length;
        groups.push(
            Group({
                name: name,
                description: description,
                admin: msg.sender,
                isOpen: isOpen,
                approvalThresholdBps: approvalThresholdBps,
                defaultVotingPeriod: defaultVotingPeriod,
                memberCount: 1,
                treasuryBalance: 0,
                maxDisbursementPerProposal: maxDisbursementPerProposal,
                highValueThreshold: highValueThreshold,
                highValueApprovalBps: highValueApprovalBps
            })
        );

        isMember[groupId][msg.sender] = true;

        emit GroupCreated(groupId, name, msg.sender, isOpen);
        emit MemberAdded(groupId, msg.sender, msg.sender);

        return groupId;
    }

    function depositToTreasury(uint256 groupId) external payable {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        groups[groupId].treasuryBalance += msg.value;
        emit TreasuryDeposit(groupId, msg.sender, msg.value);
    }

    function joinGroup(uint256 groupId) external {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (isMember[groupId][msg.sender]) {
            revert AlreadyMember(groupId, msg.sender);
        }

        if (!groups[groupId].isOpen) {
            revert GroupNotOpen(groupId);
        }

        isMember[groupId][msg.sender] = true;
        groups[groupId].memberCount++;

        emit MemberJoined(groupId, msg.sender);
    }

    function addMember(uint256 groupId, address member) external {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (msg.sender != groups[groupId].admin) {
            revert NotGroupAdmin(groupId, msg.sender);
        }

        if (isMember[groupId][member]) {
            revert AlreadyMember(groupId, member);
        }

        isMember[groupId][member] = true;
        groups[groupId].memberCount++;

        emit MemberAdded(groupId, member, msg.sender);
    }

    function removeMember(uint256 groupId, address member) external {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (msg.sender != groups[groupId].admin) {
            revert NotGroupAdmin(groupId, msg.sender);
        }

        if (member == groups[groupId].admin) {
            revert CannotRemoveAdmin(groupId);
        }

        if (!isMember[groupId][member]) {
            revert NotGroupMember(groupId, member);
        }

        isMember[groupId][member] = false;
        groups[groupId].memberCount--;

        emit MemberRemoved(groupId, member, msg.sender);
    }

    function createFundingProposal(
        uint256 groupId,
        string calldata title,
        string calldata summary,
        uint256 amount,
        uint256 votingPeriodSeconds
    ) public returns (uint256) {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (!isMember[groupId][msg.sender]) {
            revert NotGroupMember(groupId, msg.sender);
        }

        Group memory grp = groups[groupId];
        if (grp.maxDisbursementPerProposal != 0 && amount > grp.maxDisbursementPerProposal) {
            revert ExceedsMaxDisbursement(amount, grp.maxDisbursementPerProposal);
        }

        uint256 proposalId = proposals.length;
        uint256 deadline = block.timestamp + votingPeriodSeconds;

        proposals.push(
            Proposal({
                groupId: groupId,
                proposalType: ProposalType.Funding,
                title: title,
                summary: summary,
                amount: amount,
                proposer: msg.sender,
                yesVotes: 0,
                noVotes: 0,
                createdAt: block.timestamp,
                deadline: deadline,
                finalized: false,
                executed: false,
                proposedMaxDisbursement: 0,
                proposedHighValueThreshold: 0,
                proposedHighValueApprovalBps: 0
            })
        );

        emit ProposalCreated(proposalId, groupId, msg.sender, deadline, ProposalType.Funding);
        return proposalId;
    }

    function createRuleChangeProposal(
        uint256 groupId,
        string calldata title,
        string calldata summary,
        uint256 proposedMaxDisbursement,
        uint256 proposedHighValueThreshold,
        uint256 proposedHighValueApprovalBps,
        uint256 votingPeriodSeconds
    ) public returns (uint256) {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (!isMember[groupId][msg.sender]) {
            revert NotGroupMember(groupId, msg.sender);
        }

        if (proposedHighValueApprovalBps > 10000) {
            revert InvalidThresholdBps(proposedHighValueApprovalBps);
        }

        uint256 proposalId = proposals.length;
        uint256 deadline = block.timestamp + votingPeriodSeconds;

        proposals.push(
            Proposal({
                groupId: groupId,
                proposalType: ProposalType.RuleChange,
                title: title,
                summary: summary,
                amount: 0,
                proposer: msg.sender,
                yesVotes: 0,
                noVotes: 0,
                createdAt: block.timestamp,
                deadline: deadline,
                finalized: false,
                executed: false,
                proposedMaxDisbursement: proposedMaxDisbursement,
                proposedHighValueThreshold: proposedHighValueThreshold,
                proposedHighValueApprovalBps: proposedHighValueApprovalBps
            })
        );

        emit ProposalCreated(proposalId, groupId, msg.sender, deadline, ProposalType.RuleChange);
        return proposalId;
    }

    // Backward compatible proposal creation mapping to createFundingProposal
    function createProposal(
        uint256 groupId,
        string calldata title,
        string calldata summary,
        uint256 amount,
        uint256 votingPeriodSeconds
    ) external returns (uint256) {
        return createFundingProposal(groupId, title, summary, amount, votingPeriodSeconds);
    }

    function vote(uint256 proposalId, bool support) external {
        if (proposalId >= proposals.length) {
            revert ProposalDoesNotExist(proposalId);
        }

        Proposal storage prop = proposals[proposalId];

        if (!isMember[prop.groupId][msg.sender]) {
            revert NotGroupMember(prop.groupId, msg.sender);
        }

        if (block.timestamp > prop.deadline) {
            revert VotingClosed(proposalId);
        }

        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted(proposalId, msg.sender);
        }

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            prop.yesVotes++;
        } else {
            prop.noVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    function finalizeProposal(uint256 proposalId) external nonReentrant {
        if (proposalId >= proposals.length) {
            revert ProposalDoesNotExist(proposalId);
        }

        Proposal storage prop = proposals[proposalId];

        if (prop.finalized) {
            revert AlreadyFinalized(proposalId);
        }

        if (block.timestamp <= prop.deadline) {
            revert VotingStillOpen(proposalId);
        }

        Group storage grp = groups[prop.groupId];
        uint256 totalVotes = prop.yesVotes + prop.noVotes;

        // Determine threshold to use
        uint256 requiredThresholdBps = grp.approvalThresholdBps;
        if (
            prop.proposalType == ProposalType.Funding &&
            grp.highValueThreshold != 0 &&
            prop.amount > grp.highValueThreshold
        ) {
            requiredThresholdBps = grp.highValueApprovalBps;
        }

        bool passed = false;
        if (totalVotes > 0) {
            passed = (prop.yesVotes * 10000) >= (totalVotes * requiredThresholdBps);
        }

        prop.finalized = true;

        if (passed) {
            if (prop.proposalType == ProposalType.Funding) {
                if (grp.treasuryBalance < prop.amount) {
                    revert InsufficientTreasuryFunds(prop.amount, grp.treasuryBalance);
                }

                // Checks-Effects-Interactions Pattern: Update state BEFORE low-level call
                grp.treasuryBalance -= prop.amount;
                prop.executed = true;

                (bool success, ) = payable(prop.proposer).call{value: prop.amount}("");
                if (!success) {
                    revert TransferFailed(prop.proposer, prop.amount);
                }

                emit TreasuryDisbursed(proposalId, prop.groupId, prop.proposer, prop.amount);
            } else if (prop.proposalType == ProposalType.RuleChange) {
                grp.maxDisbursementPerProposal = prop.proposedMaxDisbursement;
                grp.highValueThreshold = prop.proposedHighValueThreshold;
                grp.highValueApprovalBps = prop.proposedHighValueApprovalBps;
                prop.executed = true;

                emit GroupRulesUpdated(
                    prop.groupId,
                    prop.proposedMaxDisbursement,
                    prop.proposedHighValueThreshold,
                    prop.proposedHighValueApprovalBps
                );
            }
        }

        emit ProposalFinalized(proposalId, passed, prop.executed);
    }

    function getGroup(uint256 groupId) external view returns (Group memory) {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }
        return groups[groupId];
    }

    function groupCount() external view returns (uint256) {
        return groups.length;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposalId >= proposals.length) {
            revert ProposalDoesNotExist(proposalId);
        }
        return proposals[proposalId];
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
