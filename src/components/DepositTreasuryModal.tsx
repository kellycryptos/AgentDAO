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
import { X, Wallet, Loader2, CheckCircle2, AlertCircle, ExternalLink, ArrowUpRight } from "lucide-react";

interface DepositTreasuryModalProps {
  groupId: bigint;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DepositTreasuryModal({ groupId, onClose, onSuccess }: DepositTreasuryModalProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = chainId === 91342;

  const [depositAmount, setDepositAmount] = useState<string>("0.001");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [groupId],
    query: { refetchInterval: 4000 },
  });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      setErrorMsg("Please enter a valid positive ETH deposit amount.");
      return;
    }

    try {
      const parsedValue = parseEther(depositAmount);
      writeContract({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "depositToTreasury",
        args: [groupId],
        value: parsedValue,
      });
    } catch (err: any) {
      console.error("Deposit error:", err);
      setErrorMsg(err?.message || "Failed to initiate deposit transaction.");
    }
  };

  const treasuryEth = group?.treasuryBalance ? formatEther(group.treasuryBalance) : "0.0";

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-full items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-left"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">Deposit to Group Treasury</h3>
            <p className="text-xs text-[var(--text-muted)]">Fund Group #{groupId.toString()} ({group?.name || "DAO"})</p>
          </div>
        </div>

        <div className="bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 mb-4">
          <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-1">Current Treasury Balance</span>
          <div className="text-xl font-mono font-bold text-emerald-500 flex items-center gap-1.5">
            <span>{treasuryEth} ETH</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              GIWA Sepolia
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isConfirmed ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-[var(--text-primary)]">Deposit Confirmed!</h4>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Successfully deposited {depositAmount} ETH into Group Treasury.
            </p>
            {txHash && (
              <a
                href={`https://sepolia-explorer.giwa.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-violet)] hover:underline font-mono"
              >
                <span>View on Blockscout</span>
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
          <form onSubmit={handleDeposit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Deposit Amount (ETH)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.001"
                  className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] pr-14"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-[var(--text-muted)]">ETH</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                Recommended test deposit: 0.001 ETH
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
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
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                {isPending || isWaiting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isPending ? "Confirm in Wallet..." : "Broadcasting..."}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Deposit ETH</span>
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
