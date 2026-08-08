"use client";

import React, { useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import {
  X,
  Plus,
  Coins,
  Sliders,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  FileText,
  Clock,
} from "lucide-react";

interface CreateProposalModalProps {
  isOpen: boolean;
  groupId: bigint;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProposalModal({ isOpen, groupId, onClose, onSuccess }: CreateProposalModalProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const [activeTab, setActiveTab] = useState<"funding" | "ruleChange">("funding");

  // Common fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [votingDays, setVotingDays] = useState("7");

  // Funding fields
  const [fundingAmountEth, setFundingAmountEth] = useState("0.0005");

  // Rule change fields
  const [proposedMaxEth, setProposedMaxEth] = useState("0.005");
  const [proposedHighThreshEth, setProposedHighThreshEth] = useState("0.001");
  const [proposedHighBps, setProposedHighBps] = useState("6600");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [groupId],
    query: { refetchInterval: 4000 },
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  if (!isOpen) return null;

  const treasuryEth = group?.treasuryBalance ? formatEther(group.treasuryBalance) : "0.0";
  const maxDisbursementEth = group?.maxDisbursementPerProposal ? formatEther(group.maxDisbursementPerProposal) : "0.0";

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !summary.trim()) {
      setErrorMsg("Please fill in the proposal title and summary.");
      return;
    }

    const votingSeconds = BigInt(Math.max(1, Number(votingDays) || 7) * 86400);

    try {
      if (activeTab === "funding") {
        if (!fundingAmountEth || isNaN(Number(fundingAmountEth)) || Number(fundingAmountEth) <= 0) {
          setErrorMsg("Please enter a valid ETH requested amount.");
          return;
        }

        const requestedWei = parseEther(fundingAmountEth);

        if (group?.maxDisbursementPerProposal && group.maxDisbursementPerProposal > BigInt(0)) {
          if (requestedWei > group.maxDisbursementPerProposal) {
            setErrorMsg(
              `Requested amount (${fundingAmountEth} ETH) exceeds the group's maximum disbursement cap (${maxDisbursementEth} ETH).`
            );
            return;
          }
        }

        writeContract({
          address: PROPOSAL_REGISTRY_ADDRESS,
          abi: PROPOSAL_REGISTRY_ABI,
          functionName: "createFundingProposal",
          args: [groupId, title, summary, requestedWei, votingSeconds],
        });
      } else {
        const newMaxWei = parseEther(proposedMaxEth || "0");
        const newHighThreshWei = parseEther(proposedHighThreshEth || "0");
        const newHighBpsVal = BigInt(Math.min(10000, Math.max(0, Number(proposedHighBps) || 5100)));

        writeContract({
          address: PROPOSAL_REGISTRY_ADDRESS,
          abi: PROPOSAL_REGISTRY_ABI,
          functionName: "createRuleChangeProposal",
          args: [groupId, title, summary, newMaxWei, newHighThreshWei, newHighBpsVal, votingSeconds],
        });
      }
    } catch (err: any) {
      console.error("Create proposal error:", err);
      setErrorMsg(err?.message || "Failed to create proposal.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-full items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-left"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2.5 bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] rounded-xl border border-[var(--accent-violet)]/30">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">Create Onchain Proposal</h3>
            <p className="text-xs text-[var(--text-muted)]">Scoped to Group #{groupId.toString()} ({group?.name || "DAO"})</p>
          </div>
        </div>

        {/* Tab Toggle: Funding Request vs Rule Change */}
        <div className="flex bg-[var(--bg-card-secondary)] border border-[var(--border-color)] p-1 rounded-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("funding")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "funding"
                ? "bg-[var(--accent-violet)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Funding Request</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ruleChange")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "ruleChange"
                ? "bg-[var(--accent-violet)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Change Spending Rules</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 font-mono shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isConfirmed ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-[var(--text-primary)]">Proposal Registered Onchain!</h4>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Your {activeTab === "funding" ? "Funding Request" : "Spending Rule Change"} proposal is active on GIWA Sepolia.
            </p>
            {txHash && (
              <a
                href={`https://sepolia-explorer.giwa.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-violet)] hover:underline font-mono"
              >
                <span>View Tx on Blockscout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="pt-2">
              <button
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="bg-[var(--accent-violet)] hover:opacity-90 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateProposal} className="space-y-4 text-xs overflow-y-auto flex-1 min-h-0 pt-1 pr-1">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Proposal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  activeTab === "funding"
                    ? "e.g. Developer Grant for AI Agent Integration"
                    : "e.g. Increase Max Disbursement & Supermajority Bar"
                }
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Summary / Rationale</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Explain the proposal goals, milestones, and governance justification..."
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] resize-none"
                required
              />
            </div>

            {activeTab === "funding" ? (
              <div className="space-y-3 bg-[var(--bg-card-secondary)] border border-[var(--border-color)] p-3.5 rounded-xl">
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>Group Treasury Balance: <strong className="text-emerald-500">{treasuryEth} ETH</strong></span>
                  {group?.maxDisbursementPerProposal && group.maxDisbursementPerProposal > BigInt(0) && (
                    <span>Max Cap: <strong className="text-amber-500">{maxDisbursementEth} ETH</strong></span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Requested Amount (ETH)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={fundingAmountEth}
                      onChange={(e) => setFundingAmountEth(e.target.value)}
                      placeholder="0.0005"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] pr-14"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs font-mono text-[var(--text-muted)]">ETH</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-[var(--bg-card-secondary)] border border-[var(--border-color)] p-3.5 rounded-xl">
                <span className="text-[11px] font-semibold text-[var(--accent-violet)] block mb-1">Proposed Spending Rules</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-mono">
                      Proposed Max Disbursement Cap (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={proposedMaxEth}
                      onChange={(e) => setProposedMaxEth(e.target.value)}
                      placeholder="0.005"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">0 = No hard cap</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-mono">
                      High-Value Threshold (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={proposedHighThreshEth}
                      onChange={(e) => setProposedHighThreshEth(e.target.value)}
                      placeholder="0.001"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Triggers supermajority</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-mono">
                    High-Value Supermajority Approval (BPS)
                  </label>
                  <input
                    type="number"
                    min="5100"
                    max="10000"
                    step="100"
                    value={proposedHighBps}
                    onChange={(e) => setProposedHighBps(e.target.value)}
                    placeholder="6600"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    6600 BPS = 66.00% YES approval required
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Voting Period (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={votingDays}
                onChange={(e) => setVotingDays(e.target.value)}
                className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConnected || !isCorrectNetwork || isPending || isWaiting}
                className="bg-[var(--accent-violet)] hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {isPending || isWaiting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isPending ? "Awaiting Signature..." : "Confirming..."}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Proposal</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
