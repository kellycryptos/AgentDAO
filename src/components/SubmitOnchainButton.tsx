"use client";

import React, { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { ExternalLink, Loader2, Send, CheckCircle2, AlertCircle, Sparkles, ArrowUpRight } from "lucide-react";

interface SubmitOnchainButtonProps {
  groupId?: bigint;
  title: string;
  summary: string;
  amount: string;
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
  if (msg.includes("NotGroupMember")) {
    return "You must be a member of this group to submit proposals onchain.";
  }
  return error?.shortMessage || "Transaction failed on GIWA Sepolia. Please try again.";
}

export function SubmitOnchainButton({ groupId = BigInt(0), title, summary, amount }: SubmitOnchainButtonProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const { data: hash, isPending: isWritePending, error: writeError, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [localError, setLocalError] = useState<string | null>(null);

  // Extract number from amount string (e.g. "2000 USDC" -> 2000)
  const parseAmountToPlainNumber = (amountStr: string): bigint => {
    const cleaned = amountStr.replace(/[^0-9.]/g, "");
    const num = Math.floor(parseFloat(cleaned) || 0);
    return BigInt(num);
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      const parsedAmount = parseAmountToPlainNumber(amount);
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "createProposal",
        args: [groupId, title, summary, parsedAmount, BigInt(604800)],
      });
    } catch (err: any) {
      setLocalError(parseFriendlyError(err));
    }
  };

  if (!isConnected) {
    return (
      <div className="text-xs text-[#9E9BB9] italic bg-[#12102B]/60 p-3 rounded-xl border border-[#2E265C] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#7B4FF2]" />
        <span>Connect wallet on GIWA Sepolia to submit this proposal onchain.</span>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="text-xs text-amber-300 bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Switch wallet network to GIWA Sepolia (Chain ID: 91342) to submit onchain.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {!isConfirmed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isWritePending || isConfirming}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5C7] to-[#00B4D8] hover:from-[#00B4D8] hover:to-[#00E5C7] text-[#12102B] font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#00E5C7]/20 hover:shadow-[#00E5C7]/40 disabled:opacity-50 cursor-pointer"
        >
          {isWritePending || isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isWritePending ? "Awaiting Wallet Signature..." : "Confirming on GIWA Sepolia..."}</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Submit Onchain</span>
            </>
          )}
        </button>
      )}

      {(writeError || localError) && (
        <div className="text-xs text-red-300 bg-red-950/40 p-3 rounded-xl border border-red-500/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{localError || parseFriendlyError(writeError)}</span>
        </div>
      )}

      {isConfirmed && hash && (
        <div className="bg-[#00E5C7]/10 border border-[#00E5C7]/30 p-3.5 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-[#00E5C7] font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Proposal Successfully Registered Onchain!</span>
          </div>
          <a
            href={`https://sepolia-explorer.giwa.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#00E5C7] hover:underline font-mono text-[11px] break-all"
          >
            <span>View Tx: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
