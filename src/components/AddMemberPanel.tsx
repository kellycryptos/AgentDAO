"use client";

import React, { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";

interface AddMemberPanelProps {
  groupId: bigint;
  groupName: string;
  onMemberAdded?: () => void;
}

export function AddMemberPanel({ groupId, groupName, onMemberAdded }: AddMemberPanelProps) {
  const { isConnected } = useAccount();
  const [memberAddress, setMemberAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: hash, isPending: isWritePending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const addr = memberAddress.trim();
    if (!addr.startsWith("0x") || addr.length !== 42) {
      setErrorMsg("Please enter a valid 42-character EVM wallet address (0x...).");
      return;
    }

    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "addMember",
        args: [groupId, addr as `0x${string}`],
      });
      setMemberAddress("");
      if (onMemberAdded) onMemberAdded();
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || String(err);
      if (msg.includes("AlreadyMember")) {
        setErrorMsg("This wallet address is already a member of this group.");
      } else if (msg.includes("NotGroupAdmin")) {
        setErrorMsg("Only the Group Admin can add new members.");
      } else if (msg.includes("User rejected")) {
        setErrorMsg("Transaction request cancelled.");
      } else {
        setErrorMsg(msg);
      }
    }
  };

  return (
    <div className="bg-[var(--bg-card-subtle)] border border-[var(--accent-violet-border)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
      <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-violet)]">
        <Shield className="w-4 h-4 shrink-0" />
        <span>Group Admin Control Panel — {groupName}</span>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Member added to group successfully onchain!</span>
        </div>
      )}

      <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row items-center gap-2.5">
        <input
          type="text"
          placeholder="Enter EVM Wallet Address (0x...)"
          value={memberAddress}
          onChange={(e) => setMemberAddress(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] transition-colors"
          required
        />

        <button
          type="submit"
          disabled={!isConnected || isWritePending || isConfirming}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#7B4FF2] hover:bg-[#683CD4] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
        >
          {isWritePending || isConfirming ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isConfirming ? "Adding..." : "Pending..."}</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
