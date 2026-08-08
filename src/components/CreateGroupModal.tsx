"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { Users, X, Shield, Lock, Unlock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isGroupOpen, setIsGroupOpen] = useState(true);
  const [thresholdPercent, setThresholdPercent] = useState("51");
  const [votingDays, setVotingDays] = useState("7");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: hash, isPending: isWritePending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Group name is required.");
      return;
    }

    const thresholdNum = parseFloat(thresholdPercent);
    if (isNaN(thresholdNum) || thresholdNum <= 0 || thresholdNum > 100) {
      setErrorMsg("Approval threshold must be between 1% and 100%.");
      return;
    }

    const daysNum = parseFloat(votingDays);
    if (isNaN(daysNum) || daysNum <= 0) {
      setErrorMsg("Default voting period must be greater than 0 days.");
      return;
    }

    const approvalThresholdBps = BigInt(Math.round(thresholdNum * 100));
    const defaultVotingPeriod = BigInt(Math.round(daysNum * 86400));

    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "createGroup",
        args: [name, description, isGroupOpen, approvalThresholdBps, defaultVotingPeriod],
      });
      onGroupCreated();
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || String(err);
      setErrorMsg(msg.includes("User rejected") ? "Transaction request cancelled." : msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-full items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col my-auto overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-card-subtle)] z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0 pr-8">
          <div className="p-2.5 rounded-xl bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[var(--text-primary)]">Create Community DAO Group</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Define membership rules, approval threshold, and voting periods onchain.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 font-mono shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isConfirmed ? (
          <div className="text-center py-6 space-y-3 overflow-y-auto flex-1 min-h-0 pt-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-[var(--text-primary)]">Group Created Successfully!</h4>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Your group is registered on GIWA Sepolia. You are the Group Admin.
            </p>
            <button
              onClick={onClose}
              className="bg-[var(--accent-violet)] hover:bg-[var(--accent-violet)]/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 text-xs overflow-y-auto flex-1 min-h-0 pt-4 pr-1">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. DeFi Core DAO or Art Collective"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe your DAO's mission and purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] transition-colors"
                />
              </div>

              {/* Open / Invite-Only Toggle */}
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1.5">Membership Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGroupOpen(true)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isGroupOpen
                        ? "bg-[var(--accent-mint-bg)] border-[var(--accent-mint)] text-[var(--text-primary)] shadow-sm"
                        : "bg-[var(--bg-card-subtle)] border-[var(--border-color)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Unlock className="w-4 h-4 text-[var(--accent-mint)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs">Open Group</div>
                      <div className="text-[10px] opacity-75">Anyone can self-join via 1-click</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGroupOpen(false)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      !isGroupOpen
                        ? "bg-[var(--accent-violet-bg)] border-[var(--accent-violet)] text-[var(--text-primary)] shadow-sm"
                        : "bg-[var(--bg-card-subtle)] border-[var(--border-color)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Lock className="w-4 h-4 text-[var(--accent-violet)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs">Invite-Only</div>
                      <div className="text-[10px] opacity-75">Admin must add members manually</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Threshold & Voting Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Approval Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={thresholdPercent}
                    onChange={(e) => setThresholdPercent(e.target.value)}
                    className="w-full bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-violet)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">e.g. 51% required to pass</span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Voting Period (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={votingDays}
                    onChange={(e) => setVotingDays(e.target.value)}
                    className="w-full bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-violet)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">Default duration for proposals</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-[var(--border-color)] mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || isWritePending || isConfirming}
                  className="inline-flex items-center gap-2 bg-[#7B4FF2] hover:bg-[#683CD4] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {isWritePending || isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isConfirming ? "Confirming..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Create Group Onchain</span>
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
