"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { ConnectButton } from "@/components/ConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { AddMemberPanel } from "@/components/AddMemberPanel";
import {
  ArrowLeft,
  Vote,
  Users,
  Shield,
  UserCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  DollarSign,
  User,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Share2,
  Check,
  Lock,
  Unlock,
  Plus,
  Coins,
  Sliders,
} from "lucide-react";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

const formatEthDisplay = (rawWei: bigint): string => {
  if (rawWei === BigInt(0)) return "0 ETH";
  const val = Number(formatEther(rawWei));
  if (val < 0.0001) return `${rawWei.toString()} Wei`;
  return `${val.toFixed(4)} ETH`;
};

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

export default function ProposalDetailPage({ params }: ProposalPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;
  const proposalId = /^\d+$/.test(rawId) ? BigInt(rawId) : null;

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const [copied, setCopied] = useState(false);
  const [voteType, setVoteType] = useState<boolean | null>(null);
  const [isFinalizingAction, setIsFinalizingAction] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: count, isLoading: isCountLoading } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "proposalCount",
    query: { refetchInterval: 5000 },
  });

  const { data: proposal, isLoading: isProposalLoading, refetch: refetchProposal } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getProposal",
    args: proposalId !== null ? [proposalId] : undefined,
    query: { enabled: proposalId !== null, refetchInterval: 4000 },
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
    args: address && proposalId !== null ? [groupId, address] : undefined,
    query: { enabled: !!address && proposalId !== null, refetchInterval: 4000 },
  });

  const { data: hasVotedUser } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "hasVoted",
    args: address && proposalId !== null ? [proposalId, address] : undefined,
    query: { enabled: !!address && proposalId !== null, refetchInterval: 4000 },
  });

  const { data: hash, isPending: isWritePending, error: writeError, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleVote = async (support: boolean) => {
    if (proposalId === null) return;
    setLocalError(null);
    setIsFinalizingAction(false);
    setVoteType(support);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "vote",
        args: [proposalId, support],
      });
      refetchProposal();
    } catch (err: any) {
      setLocalError(parseFriendlyError(err));
    }
  };

  const handleFinalize = async () => {
    if (proposalId === null) return;
    setLocalError(null);
    setIsFinalizingAction(true);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "finalizeProposal",
        args: [proposalId],
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

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isInvalidId = proposalId === null || (count !== undefined && proposalId >= count);

  if (!isCountLoading && isInvalidId) {
    return (
      <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans flex flex-col justify-between">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-card)] sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xs font-bold text-[var(--accent-violet)] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <ConnectButton />
            </div>
          </div>
        </header>

        <div className="max-w-md mx-auto my-auto p-6 text-center space-y-4">
          <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Proposal Not Found</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">
            Proposal ID #{rawId} does not exist on ProposalRegistry (`0x7F45...26F3`). Total proposals registered onchain: {count ? count.toString() : "0"}.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[var(--accent-violet)] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>

        <Footer />
      </main>
    );
  }

  if (isProposalLoading || !proposal) {
    return (
      <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans flex flex-col justify-between">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-card)] sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="h-4 bg-[var(--border-color)] rounded w-32 animate-pulse" />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <ConnectButton />
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-12 w-full space-y-6 animate-pulse">
          <div className="h-8 bg-[var(--border-color)] rounded w-3/4" />
          <div className="h-24 bg-[var(--bg-card-secondary)] rounded-2xl" />
          <div className="h-40 bg-[var(--bg-card)] rounded-2xl" />
        </div>

        <Footer />
      </main>
    );
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

  const isHighValue = !isRuleChange && group && group.highValueThreshold > BigInt(0) && amount > group.highValueThreshold;
  const thresholdBps = group
    ? isHighValue
      ? Number(group.highValueApprovalBps)
      : Number(group.approvalThresholdBps)
    : 5100;

  const totalVotes = yesVotes + noVotes;
  const isPassed = totalVotes > BigInt(0) && (yesVotes * BigInt(10000)) >= (totalVotes * BigInt(thresholdBps));
  const yesPct = totalVotes > BigInt(0) ? Number((yesVotes * BigInt(100)) / totalVotes) : 0;
  const noPct = totalVotes > BigInt(0) ? Number((noVotes * BigInt(100)) / totalVotes) : 0;

  const isAdmin = address && group && group.admin.toLowerCase() === address.toLowerCase();

  const getTimeRemainingText = () => {
    if (!deadlineNum) return "No Deadline";
    const diff = deadlineNum - nowSec;
    if (diff <= 0) return "Voting Closed";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  return (
    <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-card)] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-[var(--accent-violet)] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[var(--accent-violet)]">Dashboard</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] font-bold">Proposal #{rawId}</span>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-violet)] transition-colors cursor-pointer text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Share Link"}</span>
          </button>
        </div>

        {/* Main Proposal Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30 font-bold">
                  Proposal #{rawId}
                </span>

                {isRuleChange ? (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-extrabold flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-violet-500" /> Rule Change Proposal
                  </span>
                ) : (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-500" /> Funding Request
                  </span>
                )}

                <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[var(--accent-violet)]" />
                  {group ? group.name : `Group #${groupId.toString()}`}
                </span>

                {isAdmin ? (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-500" /> Admin
                  </span>
                ) : isMember ? (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 font-bold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[var(--accent-mint)]" /> Member
                  </span>
                ) : (
                  <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30 font-medium flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Guest
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] leading-tight">{title}</h1>
            </div>

            <div className="bg-[var(--bg-card-secondary)] px-4 py-2.5 rounded-2xl border border-[var(--border-color)] flex items-center gap-3 self-start sm:self-auto shrink-0 shadow-inner">
              {isRuleChange ? (
                <Sliders className="w-6 h-6 text-violet-400" />
              ) : (
                <Coins className="w-6 h-6 text-emerald-500" />
              )}
              <div>
                <div className="text-[11px] uppercase text-[var(--text-muted)] font-mono">
                  {isRuleChange ? "Proposal Type" : "Requested Funding"}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-[var(--text-primary)]">
                  {isRuleChange ? "Rule Update" : formattedAmount}
                </div>
              </div>
            </div>
          </div>

          {/* Rationale / Summary */}
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-mono text-[var(--text-muted)] font-semibold">Summary & Rationale</h4>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
              {summary}
            </p>
          </div>

          {/* Before / After Rule Comparison */}
          {isRuleChange && (
            <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl space-y-3 font-mono">
              <h4 className="text-xs font-bold text-violet-600 dark:text-violet-300 uppercase">
                Proposed Spending Rule Changes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">Max Disbursement Cap</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    {formatEthDisplay(group?.maxDisbursementPerProposal || BigInt(0))} → {formatEthDisplay(proposedMaxDisbursement)}
                  </span>
                </div>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">High-Value Threshold</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    {formatEthDisplay(group?.highValueThreshold || BigInt(0))} → {formatEthDisplay(proposedHighValueThreshold)}
                  </span>
                </div>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block text-[11px]">High-Value Supermajority</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    {(Number(group?.highValueApprovalBps || 5100) / 100).toFixed(0)}% → {(Number(proposedHighValueApprovalBps) / 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Proposer & Timeline Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block text-[11px]">Proposer</span>
              <a
                href={`https://sepolia-explorer.giwa.io/address/${proposer}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-violet)] font-bold hover:underline inline-flex items-center gap-1 pt-1"
              >
                {proposer.slice(0, 6)}...{proposer.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block text-[11px]">Created Date</span>
              <span className="text-[var(--text-primary)] font-bold pt-1 block">{formattedDate}</span>
            </div>

            <div className="bg-[var(--bg-card-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block text-[11px]">Approval Threshold</span>
              <span className="text-[var(--text-primary)] font-bold pt-1 block">
                {(thresholdBps / 100).toFixed(1)}% {isHighValue && "(Supermajority)"}
              </span>
            </div>
          </div>

          {/* Large Vote Tally Visual Bar */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[var(--text-primary)]">Vote Tally Progress</span>
              <span className="text-[var(--text-muted)]">Total Votes: {totalVotes.toString()}</span>
            </div>

            <div className="h-4 bg-[var(--bg-card-secondary)] rounded-full overflow-hidden flex border border-[var(--border-color)] p-0.5">
              <div
                style={{ width: `${yesPct}%` }}
                className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                title={`YES: ${yesPct}%`}
              />
              <div
                style={{ width: `${noPct}%` }}
                className="bg-rose-500 h-full rounded-r-full transition-all duration-500"
                title={`NO: ${noPct}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center font-mono">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                <div className="text-xs uppercase text-emerald-600 dark:text-emerald-400 font-bold">YES Votes ({yesPct}%)</div>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">{yesVotes.toString()}</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
                <div className="text-xs uppercase text-rose-600 dark:text-rose-400 font-bold">NO Votes ({noPct}%)</div>
                <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300">{noVotes.toString()}</div>
              </div>
            </div>
          </div>

          {/* Interactive Voting / Execution Actions */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            {finalized ? (
              <div className={`text-xs p-4 rounded-xl border text-center font-bold flex items-center justify-center gap-2 ${
                executed
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                  : isPassed
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
              }`}>
                {executed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>
                      {isRuleChange
                        ? "Executed: Spending rules updated onchain!"
                        : `Executed: ${formattedAmount} auto-sent to proposer!`}
                    </span>
                  </>
                ) : isPassed ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>Passed but Failed Execution: Insufficient Group Treasury Funds!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span>Proposal Rejected — Failed {(thresholdBps / 100).toFixed(0)}% Threshold Bar</span>
                  </>
                )}
              </div>
            ) : isExpired ? (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isWritePending || isConfirming || !isConnected || !isCorrectNetwork}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isWritePending && isFinalizingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing Onchain...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Finalize Proposal Onchain</span>
                  </>
                )}
              </button>
            ) : isMember || isAdmin ? (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleVote(true)}
                  disabled={isWritePending || isConfirming || hasVotedUser || !isConnected || !isCorrectNetwork}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
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
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
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
                className="w-full inline-flex items-center justify-center gap-2 bg-[#00E5C7] hover:bg-[#00C4AA] text-slate-950 font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
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
              <div className="text-center py-3 px-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-xs text-violet-400 font-mono">
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
        </div>
      </div>

      <Footer />
    </main>
  );
}
