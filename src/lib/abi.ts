export const PROPOSAL_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x92a76b5CCCfBB56106bE22d15558009376496Ff5") as `0x${string}`;

export const PROPOSAL_REGISTRY_ABI = [
  {
    type: "function",
    name: "createProposal",
    stateMutability: "nonpayable",
    inputs: [
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
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
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
    name: "ProposalCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
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
