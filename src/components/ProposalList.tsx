"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { AddMemberPanel } from "@/components/AddMemberPanel";
import { DepositTreasuryModal } from "@/components/DepositTreasuryModal";
import { CreateProposalModal } from "@/components/CreateProposalModal";
import {
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  User,
  Clock,
  Vote,
  Sparkles,
  RefreshCw,
  Users,
  Shield,
  Lock,
  Unlock,
  Plus,
  UserCheck,
  Eye,
  ArrowRight,
  Wallet,
  Sliders,
  Coins,
  ArrowUpRight,
} from "lucide-react";

interface ProposalItemProps {
  id: bigint;
  selectedGroupId?: bigint;
}

function parseFriendlyError(error: any): string {
  if (!error) return "An unexpected transaction error occurred.";
  const msg = typeof error === "string" ? error : error?.shortMessage || error?.message || String(error);
  if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
    return "Transaction request was cancelled in your wallet.";
  }
  if (msg.includes("insufficient funds")) {
    return "Insufficient testnet ETH for gas fees on GIWA Sepolia.";
  }
  if (msg.includes("InsufficientTreasuryFunds")) {
    return "Group treasury has insufficient funds to execute payout.";
  }
  if (msg.includes("ExceedsMaxDisbursement")) {
    return "Requested amount exceeds group's maximum disbursement cap.";
  }
  if (msg.includes("AlreadyVoted")) {
    return "You have already voted on this proposal.";
  }
  if (msg.includes("NotGroupMember")) {
    return "You are not a member of this group. Join the group to vote!";
  }
  if (msg.includes("ProposalDoesNotExist")) {
    return "This proposal ID does not exist onchain.";
  }
  return error?.shortMessage || "Transaction failed. Please try again.";
}

const formatEthDisplay = (rawWei: bigint): string => {
  if (rawWei === BigInt(0)) return "0 ETH";
  const val = Number(formatEther(rawWei));
  if (val < 0.0001) return `${rawWei.toString()} Wei`;
  return `${val.toFixed(4)} ETH`;
};

function ProposalItem({ id, selectedGroupId }: ProposalItemProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const { data: proposal, refetch: refetchProposal } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getProposal",
    args: [id],
    query: { refetchInterval: 4000 },
  });

  const groupId = proposal?.groupId ?? BigInt(0);

  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [groupId],
    query: { refetchInterval: 4000 },
  });

  const { data: isMember, refetch: refetchIsMember } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "isMember",
    args: address ? [groupId, address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: hasVotedUser } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "hasVoted",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: hash, isPending: isWritePending, error: writeError, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [voteType, setVoteType] = useState<boolean | null>(null);
  const [isFinalizingAction, setIsFinalizingAction] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleVote = async (support: boolean) => {
    setLocalError(null);
    setIsFinalizingAction(false);
    setVoteType(support);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "vote",
        args: [id, support],
      });
      refetchProposal();
    } catch (err: any) {
      setLocalError(parseFriendlyError(err));
    }
  };

  const handleFinalize = async () => {
    setLocalError(null);
    setIsFinalizingAction(true);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "finalizeProposal",
        args: [id],
      });
      refetchProposal();
    } catch (err: any) {
      setLocalError(parseFriendlyError(err));
    }
  };

  const handleJoinGroup = async () => {
    setLocalError(null);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "joinGroup",
        args: [groupId],
      });
      refetchIsMember();
    } catch (err: any) {
      setLocalError(parseFriendlyError(err));
    }
  };

  if (!proposal) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-[var(--border-color)] rounded w-1/4" />
          <div className="h-6 bg-[var(--border-color)] rounded w-20" />
        </div>
        <div className="h-5 bg-[var(--border-color)] rounded w-3/4" />
        <div className="h-16 bg-[var(--bg-card-subtle)] rounded-xl" />
      </div>
    );
  }

  if (selectedGroupId !== undefined && proposal.groupId !== selectedGroupId) {
    return null;
  }

  const {
    title,
    summary,
    amount,
    proposer,
    yesVotes,
    noVotes,
    createdAt,
    deadline,
    finalized,
    executed,
    proposalType,
    proposedMaxDisbursement,
    proposedHighValueThreshold,
    proposedHighValueApprovalBps,
  } = proposal;

  const isRuleChange = proposalType === 1;
  const formattedAmount = formatEthDisplay(amount);
  const formattedDate = new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const deadlineNum = Number(deadline || BigInt(0));
  const isExpired = deadlineNum > 0 && nowSec >= deadlineNum;

  // Determine required threshold
  const isHighValue = !isRuleChange && group && group.highValueThreshold > BigInt(0) && amount > group.highValueThreshold;
  const thresholdBps = group
    ? isHighValue
      ? Number(group.highValueApprovalBps)
      : Number(group.approvalThresholdBps)
    : 5100;

  const totalVotes = yesVotes + noVotes;
  const isPassed = totalVotes > BigInt(0) && (yesVotes * BigInt(10000)) >= (totalVotes * BigInt(thresholdBps));

  const isAdmin = address && group && group.admin.toLowerCase() === address.toLowerCase();

  const getTimeRemainingText = () => {
    if (!deadlineNum) return "No Deadline";
    const diff = deadlineNum - nowSec;
    if (diff <= 0) return "Voting Closed";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-violet)] transition-all rounded-2xl p-5 sm:p-6 shadow-md space-y-4 relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7B4FF2] to-[#00E5C7] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30 font-semibold">
              Proposal #{id.toString()}
            </span>

            {/* Proposal Type Badge */}
            {isRuleChange ? (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-extrabold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-violet-500" /> Rule Change Proposal
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center gap-1">
                <Coins className="w-3 h-3 text-emerald-500" /> Funding Request
              </span>
            )}

            {/* Group Tag */}
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-[var(--accent-violet)]" />
              {group ? group.name : `Group #${groupId.toString()}`}
            </span>

            {/* User Role Badge */}
            {isAdmin ? (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-500" /> Admin
              </span>
            ) : isMember ? (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 font-bold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[var(--accent-mint)]" /> Member
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30 font-medium flex items-center gap-1">
                <Eye className="w-3 h-3" /> Guest (Read-Only)
              </span>
            )}

            {/* Status Badges */}
            {finalized ? (
              executed ? (
                isRuleChange ? (
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" /> EXECUTED (RULES UPDATED)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> EXECUTED ({formattedAmount} SENT)
                  </span>
                )
              ) : isPassed ? (
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" /> FAILED (INSUFFICIENT FUNDS)
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-extrabold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500" /> REJECTED
                </span>
              )
            ) : isExpired ? (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> CLOSED (PENDING FINALIZATION)
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--accent-mint)]" /> {getTimeRemainingText()}
              </span>
            )}
          </div>
          <Link href={`/proposal/${id.toString()}`} className="group/title inline-block">
            <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover/title:text-[var(--accent-violet)] transition-colors flex items-center gap-1.5">
              <span>{title}</span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all text-[var(--accent-violet)] shrink-0" />
            </h3>
          </Link>
        </div>

        <div className="bg-[var(--bg-card-subtle)] px-3.5 py-2 rounded-xl border border-[var(--border-color)] flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-inner">
          {isRuleChange ? (
            <Sliders className="w-4 h-4 text-violet-400" />
          ) : (
            <Coins className="w-4 h-4 text-emerald-500" />
          )}
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)] font-mono">
              {isRuleChange ? "Type" : "Requested"}
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-[var(--text-primary)]">
              {isRuleChange ? "Rule Update" : formattedAmount}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
        {summary}
      </p>

      {/* Before / After Comparison for RuleChange proposals */}
      {isRuleChange && (
        <div className="bg-violet-500/10 border border-violet-500/30 p-3.5 rounded-xl text-xs space-y-2 font-mono">
          <span className="font-bold text-violet-600 dark:text-violet-300 block">
            Proposed Spending Rule Changes:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block">Max Cap:</span>
              <span className="text-[var(--text-primary)] font-bold">
                {formatEthDisplay(group?.maxDisbursementPerProposal || BigInt(0))} → {formatEthDisplay(proposedMaxDisbursement)}
              </span>
            </div>
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block">High Threshold:</span>
              <span className="text-[var(--text-primary)] font-bold">
                {formatEthDisplay(group?.highValueThreshold || BigInt(0))} → {formatEthDisplay(proposedHighValueThreshold)}
              </span>
            </div>
            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block">Supermajority:</span>
              <span className="text-[var(--text-primary)] font-bold">
                {(Number(group?.highValueApprovalBps || 5100) / 100).toFixed(0)}% → {(Number(proposedHighValueApprovalBps) / 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Proposer details */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 font-mono">
          <User className="w-3.5 h-3.5 text-[var(--accent-violet)]" />
          <span>Proposer:</span>
          <a
            href={`https://sepolia-explorer.giwa.io/address/${proposer}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-violet)] font-medium hover:underline flex items-center gap-1"
          >
            {proposer.slice(0, 6)}...{proposer.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="text-[11px] font-mono text-[var(--text-muted)]">
          Required Approval: <strong className="text-[var(--text-primary)] font-bold">{(thresholdBps / 100).toFixed(1)}%</strong>
          {isHighValue && <span className="ml-1 text-amber-500 font-bold">(High-Value Supermajority)</span>}
        </div>
      </div>

      {/* Admin Panel for Invite-Only Groups */}
      {isAdmin && group && !group.isOpen && (
        <AddMemberPanel groupId={groupId} groupName={group.name} onMemberAdded={refetchIsMember} />
      )}

      {/* Voting Tally & Action Buttons */}
      <div className="pt-2 border-t border-[var(--border-color)] space-y-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
            <div className="text-[11px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-semibold">Yes Votes</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">{yesVotes.toString()}</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
            <div className="text-[11px] font-mono uppercase text-rose-600 dark:text-rose-400 font-semibold">No Votes</div>
            <div className="text-lg font-extrabold text-rose-700 dark:text-rose-300 font-mono">{noVotes.toString()}</div>
          </div>
        </div>

        {/* Voting / Finalize / Guest Action Section */}
        {finalized ? (
          <div className={`text-xs p-3.5 rounded-xl border text-center font-bold flex items-center justify-center gap-2 ${
            executed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
              : isPassed
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
          }`}>
            {executed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  {isRuleChange
                    ? "Executed: Spending rules updated onchain!"
                    : `Executed: ${formattedAmount} auto-sent to proposer!`}
                </span>
              </>
            ) : isPassed ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Passed but Failed Execution: Insufficient Group Treasury Funds!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Proposal Rejected — Failed {(thresholdBps / 100).toFixed(0)}% Threshold Bar</span>
              </>
            )}
          </div>
        ) : isExpired ? (
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isWritePending || isConfirming || !isConnected || !isCorrectNetwork}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isWritePending && isFinalizingAction ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizing Onchain...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Finalize Proposal Onchain</span>
              </>
            )}
          </button>
        ) : isMember || isAdmin ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleVote(true)}
              disabled={isWritePending || isConfirming || hasVotedUser || !isConnected || !isCorrectNetwork}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && voteType === true ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              <span>{hasVotedUser ? "Voted YES" : "Vote YES"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleVote(false)}
              disabled={isWritePending || isConfirming || hasVotedUser || !isConnected || !isCorrectNetwork}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && voteType === false ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsDown className="w-4 h-4" />
              )}
              <span>{hasVotedUser ? "Voted NO" : "Vote NO"}</span>
            </button>
          </div>
        ) : group?.isOpen ? (
          <button
            type="button"
            onClick={handleJoinGroup}
            disabled={isWritePending || isConfirming || !isConnected || !isCorrectNetwork}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#00E5C7] hover:bg-[#00C4AA] text-slate-950 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isWritePending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Joining Group...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Join Group to Participate</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center py-2.5 px-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-xs text-violet-400 font-mono">
            Invite-Only Group — Contact Group Admin ({group?.admin.slice(0, 6)}...{group?.admin.slice(-4)}) to join
          </div>
        )}

        {(writeError || localError) && (
          <div className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{localError || parseFriendlyError(writeError)}</span>
          </div>
        )}
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
        <span>View full proposal metrics, timeline & block history</span>
        <Link href={`/proposal/${id.toString()}`} className="text-[var(--accent-violet)] hover:underline flex items-center gap-1 font-bold">
          <span>Details →</span>
        </Link>
      </div>
    </div>
  );
}

export function ProposalList({ selectedGroupId = BigInt(0) }: { selectedGroupId?: bigint }) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState(false);

  const { data: count, isLoading, refetch } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "proposalCount",
    query: { refetchInterval: 4000 },
  });

  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [selectedGroupId],
    query: { refetchInterval: 4000 },
  });

  const total = Number(count || BigInt(0));
  const proposalIds = Array.from({ length: total }, (_, i) => BigInt(i)).reverse();

  const treasuryEth = group?.treasuryBalance ? formatEther(group.treasuryBalance) : "0.0";
  const maxCapEth = group?.maxDisbursementPerProposal ? formatEther(group.maxDisbursementPerProposal) : "0.0";

  return (
    <div className="space-y-6">
      {/* Group Treasury Header Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {group ? group.name : `Group #${selectedGroupId.toString()}`}
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30 font-semibold">
                Group #{selectedGroupId.toString()}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{group?.description || "Community Governance Group"}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Deposit ETH</span>
            </button>

            <button
              onClick={() => setIsCreateProposalOpen(true)}
              className="bg-[var(--accent-violet)] hover:opacity-90 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Proposal</span>
            </button>
          </div>
        </div>

        {/* Treasury Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)] font-mono">
            <span className="text-[11px] text-[var(--text-muted)] block">Treasury Balance</span>
            <span className="text-base font-bold text-emerald-500">{treasuryEth} ETH</span>
          </div>
          <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)] font-mono">
            <span className="text-[11px] text-[var(--text-muted)] block">Max Disbursement Cap</span>
            <span className="text-base font-bold text-[var(--text-primary)]">
              {group?.maxDisbursementPerProposal && group.maxDisbursementPerProposal > BigInt(0) ? `${maxCapEth} ETH` : "No Cap"}
            </span>
          </div>
          <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)] font-mono">
            <span className="text-[11px] text-[var(--text-muted)] block">Approval Threshold</span>
            <span className="text-base font-bold text-[var(--text-primary)]">
              {(Number(group?.approvalThresholdBps || 5100) / 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Proposal Feed Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
          <Vote className="w-5 h-5 text-[var(--accent-violet)]" />
          <span>Governance Proposals ({total})</span>
        </h3>
        <button
          onClick={() => refetch()}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Proposal Items */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 h-32 animate-pulse" />
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 h-32 animate-pulse" />
        </div>
      ) : total === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center space-y-3">
          <Vote className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-50" />
          <h4 className="font-bold text-base text-[var(--text-primary)]">No Onchain Proposals Yet</h4>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Be the first member to submit an onchain proposal for Group #{selectedGroupId.toString()}!
          </p>
          <button
            onClick={() => setIsCreateProposalOpen(true)}
            className="bg-[var(--accent-violet)] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Proposal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {proposalIds.map((pId) => (
            <ProposalItem key={pId.toString()} id={pId} selectedGroupId={selectedGroupId} />
          ))}
        </div>
      )}

      {/* Deposit Treasury Modal */}
      {isDepositOpen && (
        <DepositTreasuryModal
          groupId={selectedGroupId}
          onClose={() => setIsDepositOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Create Proposal Modal */}
      <CreateProposalModal
        isOpen={isCreateProposalOpen}
        groupId={selectedGroupId}
        onClose={() => setIsCreateProposalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
