// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProposalRegistry {
    struct Group {
        string name;
        string description;
        address admin;
        bool isOpen; // true = anyone can self-join, false = admin must add members
        uint256 approvalThresholdBps; // e.g. 5100 = 51.00%
        uint256 defaultVotingPeriod; // seconds
        uint256 memberCount;
    }

    struct Proposal {
        uint256 groupId;
        string title;
        string summary;
        uint256 amount;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 createdAt;
        uint256 deadline;
        bool finalized;
    }

    Group[] public groups;
    Proposal[] public proposals;

    // groupId => account => isMember
    mapping(uint256 => mapping(address => bool)) public isMember;
    // proposalId => account => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event GroupCreated(uint256 indexed groupId, string name, address indexed admin, bool isOpen);
    event MemberJoined(uint256 indexed groupId, address indexed member);
    event MemberAdded(uint256 indexed groupId, address indexed member, address indexed addedBy);
    event MemberRemoved(uint256 indexed groupId, address indexed member, address indexed removedBy);
    event ProposalCreated(uint256 indexed id, uint256 indexed groupId, address indexed proposer, uint256 deadline);
    event VoteCast(uint256 indexed id, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed id, bool passed);

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

    function createGroup(
        string calldata name,
        string calldata description,
        bool isOpen,
        uint256 approvalThresholdBps,
        uint256 defaultVotingPeriod
    ) external returns (uint256) {
        if (approvalThresholdBps > 10000) {
            revert InvalidThresholdBps(approvalThresholdBps);
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
                memberCount: 1
            })
        );

        isMember[groupId][msg.sender] = true;

        emit GroupCreated(groupId, name, msg.sender, isOpen);
        emit MemberAdded(groupId, msg.sender, msg.sender);

        return groupId;
    }

    function joinGroup(uint256 groupId) external {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        // Check AlreadyMember FIRST before GroupNotOpen so pre-added members on closed groups don't get a confusing error
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

    function createProposal(
        uint256 groupId,
        string calldata title,
        string calldata summary,
        uint256 amount,
        uint256 votingPeriodSeconds
    ) external returns (uint256) {
        if (groupId >= groups.length) {
            revert GroupDoesNotExist(groupId);
        }

        if (!isMember[groupId][msg.sender]) {
            revert NotGroupMember(groupId, msg.sender);
        }

        uint256 proposalId = proposals.length;
        uint256 deadline = block.timestamp + votingPeriodSeconds;

        proposals.push(
            Proposal({
                groupId: groupId,
                title: title,
                summary: summary,
                amount: amount,
                proposer: msg.sender,
                yesVotes: 0,
                noVotes: 0,
                createdAt: block.timestamp,
                deadline: deadline,
                finalized: false
            })
        );

        emit ProposalCreated(proposalId, groupId, msg.sender, deadline);
        return proposalId;
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

    function finalizeProposal(uint256 proposalId) external {
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

        prop.finalized = true;

        Group memory grp = groups[prop.groupId];
        uint256 totalVotes = prop.yesVotes + prop.noVotes;
        bool passed = false;

        if (totalVotes > 0) {
            passed = (prop.yesVotes * 10000) >= (totalVotes * grp.approvalThresholdBps);
        }

        emit ProposalFinalized(proposalId, passed);
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

