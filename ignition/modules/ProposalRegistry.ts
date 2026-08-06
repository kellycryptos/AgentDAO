import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ProposalRegistryModule = buildModule("ProposalRegistryModule", (m) => {
  const proposalRegistry = m.contract("ProposalRegistry");

  return { proposalRegistry };
});

export default ProposalRegistryModule;
