export const PROPOSAL_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x7F45BF6De97E5D509D27a33ED6C6ea73D04026F3") as `0x${string}`;

export const PROPOSAL_REGISTRY_ABI = [
  {
    type: "function",
    name: "createGroup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "isOpen", type: "bool" },
      { name: "approvalThresholdBps", type: "uint256" },
      { name: "defaultVotingPeriod", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createGroupWithRules",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "isOpen", type: "bool" },
      { name: "approvalThresholdBps", type: "uint256" },
      { name: "defaultVotingPeriod", type: "uint256" },
      { name: "maxDisbursementPerProposal", type: "uint256" },
      { name: "highValueThreshold", type: "uint256" },
      { name: "highValueApprovalBps", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "depositToTreasury",
    stateMutability: "payable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "joinGroup",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addMember",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "member", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeMember",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "member", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createFundingProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "title", type: "string" },
      { name: "summary", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "votingPeriodSeconds", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createRuleChangeProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "title", type: "string" },
      { name: "summary", type: "string" },
      { name: "proposedMaxDisbursement", type: "uint256" },
      { name: "proposedHighValueThreshold", type: "uint256" },
      { name: "proposedHighValueApprovalBps", type: "uint256" },
      { name: "votingPeriodSeconds", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "title", type: "string" },
      { name: "summary", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "votingPeriodSeconds", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeProposal",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getGroup",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "admin", type: "address" },
          { name: "isOpen", type: "bool" },
          { name: "approvalThresholdBps", type: "uint256" },
          { name: "defaultVotingPeriod", type: "uint256" },
          { name: "memberCount", type: "uint256" },
          { name: "treasuryBalance", type: "uint256" },
          { name: "maxDisbursementPerProposal", type: "uint256" },
          { name: "highValueThreshold", type: "uint256" },
          { name: "highValueApprovalBps", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "groupCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isMember",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "groupId", type: "uint256" },
          { name: "proposalType", type: "uint8" },
          { name: "title", type: "string" },
          { name: "summary", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "finalized", type: "bool" },
          { name: "executed", type: "bool" },
          { name: "proposedMaxDisbursement", type: "uint256" },
          { name: "proposedHighValueThreshold", type: "uint256" },
          { name: "proposedHighValueApprovalBps", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "voter", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "GroupCreated",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "admin", type: "address", indexed: true },
      { name: "isOpen", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TreasuryDeposit",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TreasuryDisbursed",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "groupId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GroupRulesUpdated",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "newMaxDisbursement", type: "uint256", indexed: false },
      { name: "newHighValueThreshold", type: "uint256", indexed: false },
      { name: "newHighValueApprovalBps", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MemberJoined",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "MemberAdded",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "addedBy", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "MemberRemoved",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "removedBy", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "groupId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "proposalType", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "support", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalFinalized",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "passed", type: "bool", indexed: false },
      { name: "executed", type: "bool", indexed: false },
    ],
  },
  {
    type: "error",
    name: "GroupDoesNotExist",
    inputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "error",
    name: "GroupNotOpen",
    inputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "error",
    name: "AlreadyMember",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "account", type: "address" },
    ],
  },
  {
    type: "error",
    name: "NotGroupMember",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "account", type: "address" },
    ],
  },
  {
    type: "error",
    name: "NotGroupAdmin",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "account", type: "address" },
    ],
  },
  {
    type: "error",
    name: "CannotRemoveAdmin",
    inputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "error",
    name: "InvalidThresholdBps",
    inputs: [{ name: "bps", type: "uint256" }],
  },
  {
    type: "error",
    name: "AlreadyVoted",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "voter", type: "address" },
    ],
  },
  {
    type: "error",
    name: "ProposalDoesNotExist",
    inputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "error",
    name: "VotingClosed",
    inputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "error",
    name: "VotingStillOpen",
    inputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "error",
    name: "AlreadyFinalized",
    inputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    type: "error",
    name: "ExceedsMaxDisbursement",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "maxDisbursement", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "InsufficientTreasuryFunds",
    inputs: [
      { name: "required", type: "uint256" },
      { name: "available", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
] as const;
