// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProposalRegistry {
    struct Proposal {
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

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, address indexed proposer, uint256 deadline);
    event VoteCast(uint256 indexed id, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed id, bool passed);

    error AlreadyVoted(uint256 proposalId, address voter);
    error ProposalDoesNotExist(uint256 proposalId);
    error VotingClosed(uint256 proposalId);
    error VotingStillOpen(uint256 proposalId);
    error AlreadyFinalized(uint256 proposalId);

    function createProposal(
        string calldata title,
        string calldata summary,
        uint256 amount,
        uint256 votingPeriodSeconds
    ) external returns (uint256) {
        uint256 proposalId = proposals.length;
        uint256 deadline = block.timestamp + votingPeriodSeconds;

        proposals.push(
            Proposal({
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

        emit ProposalCreated(proposalId, msg.sender, deadline);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        if (proposalId >= proposals.length) {
            revert ProposalDoesNotExist(proposalId);
        }

        if (block.timestamp > proposals[proposalId].deadline) {
            revert VotingClosed(proposalId);
        }

        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted(proposalId, msg.sender);
        }

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposals[proposalId].yesVotes++;
        } else {
            proposals[proposalId].noVotes++;
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
        bool passed = prop.yesVotes > prop.noVotes;

        emit ProposalFinalized(proposalId, passed);
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
