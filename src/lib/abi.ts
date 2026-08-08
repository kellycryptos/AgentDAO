export const PROPOSAL_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x4ECedc29B2A8E9f9f46221e76Cee7cEDe4eB613e") as `0x${string}`;

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
          { name: "title", type: "string" },
          { name: "summary", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "finalized", type: "bool" },
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
] as const;

