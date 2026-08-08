"use client";

import React, { useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { AddMemberPanel } from "@/components/AddMemberPanel";
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

const THRESHOLD = BigInt("1000000000000000");
const WEI_UNIT = BigInt("1000000000000000000");

const formatAmountDisplay = (rawAmount: bigint): string => {
  if (rawAmount >= THRESHOLD) {
    const scaled = Number(rawAmount / WEI_UNIT);
    return `${scaled.toLocaleString()} USDC`;
  }
  return `${Number(rawAmount).toLocaleString()} USDC`;
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

  // Filter out if selectedGroupId is specified and doesn't match
  if (selectedGroupId !== undefined && proposal.groupId !== selectedGroupId) {
    return null;
  }

  const { title, summary, amount, proposer, yesVotes, noVotes, createdAt, deadline, finalized } = proposal;
  const formattedAmount = formatAmountDisplay(amount);
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

  const thresholdBps = group ? Number(group.approvalThresholdBps) : 5100;
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
              isPassed ? (
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASSED ({(thresholdBps / 100).toFixed(0)}% THRESHOLD MET)
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
          <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-violet)] transition-colors">{title}</h3>
        </div>

        <div className="bg-[var(--bg-card-subtle)] px-3.5 py-2 rounded-xl border border-[var(--border-color)] flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-inner">
          <DollarSign className="w-4 h-4 text-[var(--accent-mint)]" />
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)] font-mono">Amount</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-[var(--accent-mint)]">{formattedAmount}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
        {summary}
      </p>

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
          Approval Threshold: <strong className="text-[var(--text-primary)] font-bold">{(thresholdBps / 100).toFixed(1)}%</strong>
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
          <div className={`text-xs p-3 rounded-xl border text-center font-bold flex items-center justify-center gap-2 ${
            isPassed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
          }`}>
            {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>Proposal Finalized — Outcome: {isPassed ? `PASSED (${(thresholdBps / 100).toFixed(0)}% THRESHOLD MET)` : "REJECTED"}</span>
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
                <span>Signing Finalize Tx...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalize Proposal Onchain</span>
              </>
            )}
          </button>
        ) : !isConnected ? (
          <div className="text-xs text-[var(--text-muted)] text-center italic py-2.5 bg-[var(--bg-card-subtle)] rounded-xl border border-[var(--border-color)]">
            Connect wallet on GIWA Sepolia to vote.
          </div>
        ) : !isCorrectNetwork ? (
          <div className="text-xs text-amber-600 dark:text-amber-300 text-center py-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 font-medium">
            Switch network to GIWA Sepolia to vote.
          </div>
        ) : !isMember && !isAdmin ? (
          /* GUEST STATE — Clear Membership Block Prompt */
          <div className="bg-[var(--accent-violet-bg)] border border-[var(--accent-violet-border)] p-3.5 rounded-xl text-center space-y-2">
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5">
              <Eye className="w-4 h-4 text-[var(--accent-violet)]" />
              <span>You are viewing as a Guest. Join this group to participate in voting.</span>
            </div>
            {group?.isOpen ? (
              <button
                type="button"
                onClick={handleJoinGroup}
                disabled={isWritePending || isConfirming}
                className="inline-flex items-center gap-1.5 bg-[#00E5C7] hover:bg-[#00C4AA] text-slate-950 font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isWritePending && !isFinalizingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Joining Group...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Join Group to Vote</span>
                  </>
                )}
              </button>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] italic">
                This is an invite-only group. Contact the Group Admin ({group?.admin.slice(0, 6)}...{group?.admin.slice(-4)}) to request access.
              </p>
            )}
          </div>
        ) : hasVotedUser ? (
          <div className="text-xs text-[var(--accent-mint)] bg-[var(--accent-mint-bg)] border border-[var(--accent-mint)]/30 p-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>You have already voted on this proposal</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleVote(true)}
              disabled={isWritePending || isConfirming}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && !isFinalizingAction && voteType === true ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-3.5 h-3.5" />
              )}
              <span>Vote YES</span>
            </button>

            <button
              type="button"
              onClick={() => handleVote(false)}
              disabled={isWritePending || isConfirming}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && !isFinalizingAction && voteType === false ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsDown className="w-3.5 h-3.5" />
              )}
              <span>Vote NO</span>
            </button>
          </div>
        )}

        {(writeError || localError) && (
          <div className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 p-2.5 rounded-xl border border-red-500/30 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>{localError || parseFriendlyError(writeError)}</span>
          </div>
        )}

        {isConfirmed && hash && (
          <div className="text-xs text-[var(--accent-mint)] bg-[var(--accent-mint-bg)] p-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2 border border-[var(--accent-mint)]/30 font-medium">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" /> {isFinalizingAction ? "Proposal Finalized Onchain!" : "Action Recorded Onchain!"}
            </span>
            <a
              href={`https://sepolia-explorer.giwa.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline text-[11px] hover:text-[var(--text-primary)]"
            >
              View Tx Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProposalListProps {
  selectedGroupId?: bigint;
}

export function ProposalList({ selectedGroupId }: ProposalListProps) {
  const { data: count, isLoading, isError, refetch } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "proposalCount",
    query: {
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const proposalCountNum = count ? Number(count) : 0;
  const proposalIds = Array.from({ length: proposalCountNum }, (_, i) => BigInt(i)).reverse();

  return (
    <section id="proposals-list" className="border-t border-[var(--border-color)] pt-12 pb-16 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Vote className="w-5 h-5 text-[var(--accent-mint)]" />
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">GIWA Sepolia Onchain Proposals</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Registered proposals on `ProposalRegistry` contract ({PROPOSAL_REGISTRY_ADDRESS.slice(0, 8)}...{PROPOSAL_REGISTRY_ADDRESS.slice(-6)})
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-all cursor-pointer shadow-sm"
              title="Refresh proposal list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="bg-[var(--bg-card)] px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-mono text-[var(--accent-mint)] flex items-center gap-2 font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Total: {proposalCountNum}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-[var(--border-color)] rounded w-1/4" />
                  <div className="h-6 bg-[var(--border-color)] rounded w-20" />
                </div>
                <div className="h-5 bg-[var(--border-color)] rounded w-3/4" />
                <div className="h-16 bg-[var(--bg-card-subtle)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400 mx-auto" />
            <h3 className="font-semibold text-[var(--text-primary)]">Unable to Load Proposals</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Failed to connect to GIWA Sepolia RPC. Please check your network connection or try refreshing.
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-200 hover:bg-red-500/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching
            </button>
          </div>
        ) : proposalCountNum === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <Vote className="w-8 h-8 text-[var(--text-muted)] opacity-50 mx-auto" />
            <h3 className="font-semibold text-[var(--text-primary)] text-base">No Onchain Proposals Yet</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              Draft a governance proposal with the AI assistant above and click <strong className="text-[var(--accent-violet)]">"Submit Onchain"</strong> to create the first live proposal!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {proposalIds.map((id) => (
              <ProposalItem key={id.toString()} id={id} selectedGroupId={selectedGroupId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

