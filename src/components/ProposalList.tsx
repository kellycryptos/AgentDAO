"use client";

import React, { useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
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
} from "lucide-react";

interface ProposalItemProps {
  id: bigint;
}

function ProposalItem({ id }: ProposalItemProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const { data: proposal, refetch } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getProposal",
    args: [id],
    query: { refetchInterval: 4000 },
  });

  const { data: hasVotedUser } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "hasVoted",
    args: address ? [id, address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: hash, isPending: isWritePending, error: writeError, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [voteType, setVoteType] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleVote = async (support: boolean) => {
    setLocalError(null);
    setVoteType(support);
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "vote",
        args: [id, support],
      });
      refetch();
    } catch (err: any) {
      setLocalError(err?.shortMessage || err?.message || "Voting transaction failed");
    }
  };

  if (!proposal) {
    return (
      <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl p-5 animate-pulse flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-[#7B4FF2] animate-spin" />
        <span className="text-sm text-[#9E9BB9]">Loading proposal #{id.toString()} from GIWA Sepolia...</span>
      </div>
    );
  }

  const [title, summary, amount, proposer, yesVotes, noVotes, createdAt] = proposal;
  const formattedAmount = formatEther(amount);
  const formattedDate = new Date(Number(createdAt) * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#1B173E] border border-[#2E265C] hover:border-[#7B4FF2]/40 transition-all rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2E265C]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#7B4FF2]/20 text-[#00E5C7] border border-[#7B4FF2]/40">
              Proposal #{id.toString()}
            </span>
            <span className="text-xs text-[#9E9BB9] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#9E9BB9]/60" /> {formattedDate}
            </span>
          </div>
          <h3 className="font-bold text-lg text-white">{title}</h3>
        </div>

        <div className="bg-[#12102B] px-3.5 py-2 rounded-xl border border-[#2E265C] flex items-center gap-2 self-start sm:self-auto shrink-0">
          <DollarSign className="w-4 h-4 text-[#00E5C7]" />
          <div>
            <div className="text-[10px] uppercase text-[#9E9BB9] font-mono">Amount</div>
            <div className="text-xs font-bold font-mono text-[#00E5C7]">{formattedAmount} ETH / USDC</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#F1F0FB]/90 leading-relaxed bg-[#12102B]/50 p-3.5 rounded-xl border border-[#2E265C]/60">
        {summary}
      </p>

      {/* Proposer details */}
      <div className="flex items-center justify-between text-xs text-[#9E9BB9] pt-1">
        <div className="flex items-center gap-1.5 font-mono">
          <User className="w-3.5 h-3.5 text-[#7B4FF2]" />
          <span>Proposer:</span>
          <a
            href={`https://sepolia-explorer.giwa.io/address/${proposer}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00E5C7] hover:underline flex items-center gap-1"
          >
            {proposer.slice(0, 6)}...{proposer.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Voting Tally & Buttons */}
      <div className="pt-2 border-t border-[#2E265C] space-y-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl">
            <div className="text-xs font-mono uppercase text-emerald-400">Yes Votes</div>
            <div className="text-lg font-extrabold text-emerald-300 font-mono">{yesVotes.toString()}</div>
          </div>
          <div className="bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-xl">
            <div className="text-xs font-mono uppercase text-rose-400">No Votes</div>
            <div className="text-lg font-extrabold text-rose-300 font-mono">{noVotes.toString()}</div>
          </div>
        </div>

        {/* Voting Action */}
        {!isConnected ? (
          <div className="text-xs text-[#9E9BB9] text-center italic py-1">
            Connect wallet on GIWA Sepolia to cast your vote.
          </div>
        ) : !isCorrectNetwork ? (
          <div className="text-xs text-amber-300 text-center py-1">
            Switch network to GIWA Sepolia to vote.
          </div>
        ) : hasVotedUser ? (
          <div className="text-xs text-[#00E5C7] bg-[#00E5C7]/10 border border-[#00E5C7]/30 p-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>You have already voted on this proposal</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleVote(true)}
              disabled={isWritePending || isConfirming}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && voteType === true ? (
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
              className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isWritePending && voteType === false ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsDown className="w-3.5 h-3.5" />
              )}
              <span>Vote NO</span>
            </button>
          </div>
        )}

        {(writeError || localError) && (
          <div className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{localError || writeError?.message}</span>
          </div>
        )}

        {isConfirmed && hash && (
          <div className="text-xs text-[#00E5C7] bg-[#00E5C7]/10 p-2.5 rounded-xl flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Vote Recorded Onchain!
            </span>
            <a
              href={`https://sepolia-explorer.giwa.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline text-[11px]"
            >
              Tx Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProposalList() {
  const { data: count, isLoading, refetch } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "proposalCount",
    query: { refetchInterval: 3000 },
  });

  const proposalCountNum = count ? Number(count) : 0;
  const proposalIds = Array.from({ length: proposalCountNum }, (_, i) => BigInt(i)).reverse();

  return (
    <section id="proposals-list" className="border-t border-[#2E265C] pt-12 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Vote className="w-5 h-5 text-[#00E5C7]" />
              <h2 className="text-2xl font-bold text-white">GIWA Sepolia Onchain Proposals</h2>
            </div>
            <p className="text-xs text-[#9E9BB9]">
              Live proposals registered on `ProposalRegistry` ({PROPOSAL_REGISTRY_ADDRESS.slice(0, 8)}...{PROPOSAL_REGISTRY_ADDRESS.slice(-6)})
            </p>
          </div>

          <div className="bg-[#1B173E] px-3.5 py-1.5 rounded-xl border border-[#2E265C] text-xs font-mono text-[#00E5C7] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Total: {proposalCountNum}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl p-8 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#7B4FF2] animate-spin mx-auto" />
            <p className="text-sm text-[#9E9BB9]">Reading proposal registry from GIWA Sepolia...</p>
          </div>
        ) : proposalCountNum === 0 ? (
          <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl p-8 text-center space-y-3">
            <Vote className="w-8 h-8 text-[#9E9BB9]/40 mx-auto" />
            <h3 className="font-semibold text-white">No Onchain Proposals Yet</h3>
            <p className="text-xs text-[#9E9BB9] max-w-md mx-auto">
              Draft a governance proposal with the AI assistant above and click <strong>"Submit Onchain"</strong> to create the first live proposal!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {proposalIds.map((id) => (
              <ProposalItem key={id.toString()} id={id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
