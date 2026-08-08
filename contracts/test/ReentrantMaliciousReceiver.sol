// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProposalRegistry {
    function joinGroup(uint256 groupId) external;
    function createFundingProposal(uint256 groupId, string calldata title, string calldata summary, uint256 amount, uint256 votingPeriodSeconds) external returns (uint256);
    function vote(uint256 proposalId, bool support) external;
    function finalizeProposal(uint256 proposalId) external;
}

contract ReentrantMaliciousReceiver {
    IProposalRegistry public targetRegistry;
    uint256 public targetProposalId;
    bool public attackAttempted;
    bool public attackSucceeded;

    constructor(address _targetRegistry) {
        targetRegistry = IProposalRegistry(_targetRegistry);
    }

    function setTargetProposal(uint256 _proposalId) external {
        targetProposalId = _proposalId;
    }

    function doJoinGroup(uint256 groupId) external {
        targetRegistry.joinGroup(groupId);
    }

    function doCreateFundingProposal(
        uint256 groupId,
        string calldata title,
        string calldata summary,
        uint256 amount,
        uint256 votingPeriod
    ) external returns (uint256) {
        return targetRegistry.createFundingProposal(groupId, title, summary, amount, votingPeriod);
    }

    function doVote(uint256 proposalId, bool support) external {
        targetRegistry.vote(proposalId, support);
    }

    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            try targetRegistry.finalizeProposal(targetProposalId) {
                attackSucceeded = true;
            } catch {
                attackSucceeded = false;
            }
        }
    }
}
