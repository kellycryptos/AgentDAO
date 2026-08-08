"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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
} from "lucide-react";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
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

  // Read total proposal count to validate ID range
  const { data: count, isLoading: isCountLoading } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "proposalCount",
    query: { refetchInterval: 5000 },
  });

  // Fetch Proposal Details
  const { data: proposal, isLoading: isProposalLoading, refetch: refetchProposal } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getProposal",
    args: proposalId !== null ? [proposalId] : undefined,
    query: { enabled: proposalId !== null, refetchInterval: 4000 },
  });

  const groupId = proposal?.groupId ?? BigInt(0);

  // Fetch Group Details
  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [groupId],
    query: { refetchInterval: 4000 },
  });

  // Fetch User Group Membership
  const { data: isMember, refetch: refetchIsMember } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "isMember",
    args: address ? [groupId, address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  // Fetch Has Voted status
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

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* HEADER */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-header)] backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="AgentDAO Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md shrink-0" />
            <div>
              <h1 className="font-bold text-xl tracking-tight text-[var(--text-primary)] flex items-center gap-2 group-hover:text-[var(--accent-violet)] transition-colors">
                AgentDAO{" "}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-violet-bg)] border border-[var(--accent-violet-border)] text-[var(--accent-violet)] font-mono font-semibold">
                  v0.1
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">AI assistant for simple community DAOs</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-violet)] hover:underline group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>Back to Proposals</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-violet)] text-[var(--text-primary)] px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-[var(--accent-violet)]" />}
            <span>{copied ? "Link Copied!" : "Share Proposal"}</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {(isCountLoading || isProposalLoading) && !isInvalidId && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-[var(--border-color)] rounded w-1/3" />
              <div className="h-6 bg-[var(--border-color)] rounded w-24" />
            </div>
            <div className="h-8 bg-[var(--border-color)] rounded w-3/4" />
            <div className="h-24 bg-[var(--bg-card-subtle)] rounded-xl" />
            <div className="h-32 bg-[var(--bg-card-subtle)] rounded-xl" />
          </div>
        )}

        {/* NOT FOUND / INVALID ID STATE */}
        {isInvalidId && !isCountLoading && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-10 text-center space-y-4 shadow-md max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Proposal Not Found</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Proposal #{rawId} does not exist on the GIWA Sepolia contract or is out of range.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-[#7B4FF2] hover:bg-[#683CD4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
              >
                Return to Proposals List
              </Link>
            </div>
          </div>
        )}

        {/* PROPOSAL DETAIL VIEW */}
        {proposal && !isInvalidId && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 shadow-lg space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7B4FF2] to-[#00E5C7]" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30 font-bold">
                      Proposal #{proposalId.toString()}
                    </span>

                    <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[var(--accent-violet)]" />
                      {group ? group.name : `Group #${groupId.toString()}`}
                    </span>

                    {/* Role Badge */}
                    {address && group && group.admin.toLowerCase() === address.toLowerCase() ? (
                      <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-500" /> Admin
                      </span>
                    ) : isMember ? (
                      <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 font-bold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-[var(--accent-mint)]" /> Member
                      </span>
                    ) : (
                      <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30 font-medium flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Guest (Read-Only)
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                    {proposal.title}
                  </h1>

                  <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)] pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Created: {new Date(Number(proposal.createdAt) * 1000).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[var(--accent-mint)]">
                      <User className="w-3.5 h-3.5" /> Proposer:{" "}
                      <a
                        href={`https://sepolia-explorer.giwa.io/address/${proposal.proposer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--bg-card-subtle)] px-5 py-3 rounded-2xl border border-[var(--border-color)] flex items-center gap-3 self-start sm:self-auto shrink-0 shadow-inner">
                  <DollarSign className="w-6 h-6 text-[var(--accent-mint)]" />
                  <div>
                    <div className="text-[11px] uppercase text-[var(--text-muted)] font-mono">Requested Funding</div>
                    <div className="text-lg font-extrabold font-mono text-[var(--accent-mint)]">
                      {formatAmountDisplay(proposal.amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposal Summary Box */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-mono text-[var(--text-muted)] font-bold tracking-wider">
                  Proposal Summary & Rationale
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-subtle)] p-5 rounded-xl border border-[var(--border-color)] whitespace-pre-wrap font-sans">
                  {proposal.summary}
                </p>
              </div>

              {/* Admin Panel for Invite-Only Groups */}
              {address && group && group.admin.toLowerCase() === address.toLowerCase() && !group.isOpen && (
                <AddMemberPanel groupId={groupId} groupName={group.name} onMemberAdded={refetchIsMember} />
              )}
            </div>

            {/* Voting Tally & Progress Bar Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-[var(--accent-mint)]" />
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Onchain Voting Tally</h2>
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)]">
                  Required Threshold: <strong className="text-[var(--text-primary)]">{((group ? Number(group.approvalThresholdBps) : 5100) / 100).toFixed(1)}%</strong>
                </div>
              </div>

              {/* Vote Stats Grid */}
              {(() => {
                const yes = Number(proposal.yesVotes);
                const no = Number(proposal.noVotes);
                const total = yes + no;
                const yesPct = total > 0 ? ((yes / total) * 100).toFixed(1) : "0.0";
                const noPct = total > 0 ? ((no / total) * 100).toFixed(1) : "0.0";
                const thresholdBps = group ? Number(group.approvalThresholdBps) : 5100;
                const isPassed = total > 0 && (proposal.yesVotes * BigInt(10000)) >= (BigInt(total) * BigInt(thresholdBps));

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                        <div className="text-xs font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                          Yes Votes ({yesPct}%)
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                          {yes}
                        </div>
                      </div>

                      <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-1">
                        <div className="text-xs font-mono uppercase text-rose-600 dark:text-rose-400 font-bold">
                          No Votes ({noPct}%)
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-300 font-mono">
                          {no}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="h-4 bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-full overflow-hidden flex shadow-inner">
                        <div
                          style={{ width: `${total > 0 ? yesPct : 0}%` }}
                          className="bg-emerald-500 transition-all duration-500"
                        />
                        <div
                          style={{ width: `${total > 0 ? noPct : 0}%` }}
                          className="bg-rose-500 transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                        <span>Total Votes Cast: {total}</span>
                        <span>Approval Threshold: {(thresholdBps / 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Finalized Banner */}
                    {proposal.finalized && (
                      <div
                        className={`p-4 rounded-2xl border text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 ${
                          isPassed
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
                        <span>
                          Proposal Finalized — {isPassed ? `PASSED (${yesPct}% Yes — met ${(thresholdBps / 100).toFixed(0)}% threshold)` : `REJECTED (${yesPct}% Yes — failed ${(thresholdBps / 100).toFixed(0)}% threshold)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Action Controls Section */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                {!proposal.finalized && Number(proposal.deadline) * 1000 <= Date.now() ? (
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isWritePending || isConfirming || !isConnected || !isCorrectNetwork}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isWritePending && isFinalizingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing Finalize Tx...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Finalize Proposal Onchain</span>
                      </>
                    )}
                  </button>
                ) : proposal.finalized ? null : !isConnected ? (
                  <div className="text-xs text-[var(--text-muted)] text-center italic py-3 bg-[var(--bg-card-subtle)] rounded-xl border border-[var(--border-color)]">
                    Connect wallet on GIWA Sepolia to cast your vote.
                  </div>
                ) : !isCorrectNetwork ? (
                  <div className="text-xs text-amber-600 dark:text-amber-300 text-center py-3 bg-amber-500/10 rounded-xl border border-amber-500/30 font-medium">
                    Switch network to GIWA Sepolia to vote.
                  </div>
                ) : !isMember && !(address && group && group.admin.toLowerCase() === address.toLowerCase()) ? (
                  /* GUEST STATE — Clear Membership Block Prompt */
                  <div className="bg-[var(--accent-violet-bg)] border border-[var(--accent-violet-border)] p-4 rounded-xl text-center space-y-2.5">
                    <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5">
                      <Eye className="w-4 h-4 text-[var(--accent-violet)]" />
                      <span>You are viewing as a Guest. Join this group to participate in voting.</span>
                    </div>
                    {group?.isOpen ? (
                      <button
                        type="button"
                        onClick={handleJoinGroup}
                        disabled={isWritePending || isConfirming}
                        className="inline-flex items-center gap-1.5 bg-[#00E5C7] hover:bg-[#00C4AA] text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isWritePending && !isFinalizingAction ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Joining Group...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Join Group to Vote</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        This is an invite-only group. Contact the Group Admin ({group?.admin.slice(0, 6)}...{group?.admin.slice(-4)}) to request access.
                      </p>
                    )}
                  </div>
                ) : hasVotedUser ? (
                  <div className="text-xs text-[var(--accent-mint)] bg-[var(--accent-mint-bg)] border border-[var(--accent-mint)]/30 p-3 rounded-xl text-center font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>You have already cast your vote on this proposal</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleVote(true)}
                      disabled={isWritePending || isConfirming}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isWritePending && !isFinalizingAction && voteType === true ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-4 h-4" />
                      )}
                      <span>Vote YES</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVote(false)}
                      disabled={isWritePending || isConfirming}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isWritePending && !isFinalizingAction && voteType === false ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="w-4 h-4" />
                      )}
                      <span>Vote NO</span>
                    </button>
                  </div>
                )}

                {(writeError || localError) && (
                  <div className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 p-3 rounded-xl border border-red-500/30 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{localError || parseFriendlyError(writeError)}</span>
                  </div>
                )}

                {isConfirmed && hash && (
                  <div className="text-xs text-[var(--accent-mint)] bg-[var(--accent-mint-bg)] p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 border border-[var(--accent-mint)]/30 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold">
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

            {/* Smart Contract Info Box */}
            <div className="bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-mono">
              <div>
                Verified Contract Address: <strong className="text-[var(--text-primary)] font-bold">{PROPOSAL_REGISTRY_ADDRESS}</strong>
              </div>
              <a
                href={`https://sepolia-explorer.giwa.io/address/${PROPOSAL_REGISTRY_ADDRESS}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent-violet)] hover:underline font-semibold"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
