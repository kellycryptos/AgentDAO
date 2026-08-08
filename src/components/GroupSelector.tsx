"use client";

import React, { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PROPOSAL_REGISTRY_ADDRESS, PROPOSAL_REGISTRY_ABI } from "@/lib/abi";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { Users, Plus, Shield, Lock, Unlock, Loader2, CheckCircle2, ChevronDown, X, Globe, Sparkles } from "lucide-react";

interface GroupSelectorProps {
  selectedGroupId: bigint;
  onSelectGroup: (groupId: bigint) => void;
}

function GroupListItem({
  groupId,
  selectedGroupId,
  onSelectGroup,
  onCloseModal,
}: {
  groupId: bigint;
  selectedGroupId: bigint;
  onSelectGroup: (groupId: bigint) => void;
  onCloseModal: () => void;
}) {
  const { address } = useAccount();

  const { data: group } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [groupId],
  });

  const { data: isMember, refetch: refetchIsMember } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "isMember",
    args: address ? [groupId, address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: hash, isPending: isWritePending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isJoinedSuccess } = useWaitForTransactionReceipt({ hash });

  if (!group) {
    return (
      <div className="bg-[var(--bg-card-subtle)] p-3 rounded-xl border border-[var(--border-color)] animate-pulse h-16" />
    );
  }

  const isAdmin = address && group.admin.toLowerCase() === address.toLowerCase();

  const handleJoin = async () => {
    try {
      await writeContractAsync({
        address: PROPOSAL_REGISTRY_ADDRESS,
        abi: PROPOSAL_REGISTRY_ABI,
        functionName: "joinGroup",
        args: [groupId],
      });
      refetchIsMember();
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        selectedGroupId === groupId
          ? "bg-[var(--accent-violet-bg)] border-[var(--accent-violet)] shadow-sm"
          : "bg-[var(--bg-card-subtle)] border-[var(--border-color)] hover:border-[var(--accent-violet)]/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm text-[var(--text-primary)]">{group.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
              Group #{groupId.toString()}
            </span>
            {group.isOpen ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <Unlock className="w-3 h-3 text-emerald-500" /> Open
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3 text-violet-500" /> Invite-Only
              </span>
            )}

            {isAdmin ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                Admin
              </span>
            ) : isMember ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30 font-semibold">
                Member
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/30">
                Guest
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{group.description}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-muted)] pt-2">
            <span>Members: {group.memberCount.toString()}</span>
            <span>Threshold: {(Number(group.approvalThresholdBps) / 100).toFixed(1)}%</span>
            <span>Default Voting: {(Number(group.defaultVotingPeriod) / 86400).toFixed(0)}d</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isMember || isAdmin ? (
            <button
              onClick={() => {
                onSelectGroup(groupId);
                onCloseModal();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedGroupId === groupId
                  ? "bg-[var(--accent-violet)] text-white shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-violet)]"
              }`}
            >
              {selectedGroupId === groupId ? "Active" : "Select"}
            </button>
          ) : group.isOpen ? (
            <button
              onClick={handleJoin}
              disabled={isWritePending || isConfirming}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00E5C7] hover:bg-[#00C4AA] text-slate-950 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isWritePending || isConfirming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Join Group</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] font-mono text-[var(--text-muted)] italic px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg">
              Invite-Only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupSelector({ selectedGroupId, onSelectGroup }: GroupSelectorProps) {
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: groupCount } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "groupCount",
    query: { refetchInterval: 4000 },
  });

  const { data: selectedGroup } = useReadContract({
    address: PROPOSAL_REGISTRY_ADDRESS,
    abi: PROPOSAL_REGISTRY_ABI,
    functionName: "getGroup",
    args: [selectedGroupId],
  });

  const count = Number(groupCount || BigInt(0));
  const groupIds = Array.from({ length: count }, (_, i) => BigInt(i));

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setIsBrowseOpen(true)}
            className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-violet)] text-[var(--text-primary)] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-[var(--accent-violet)]" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate">
              {selectedGroup ? selectedGroup.name : `Group #${selectedGroupId.toString()}`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          aria-label="Create new group"
          title="Create new group"
          className="inline-flex items-center gap-1.5 bg-[var(--accent-violet-bg)] border border-[var(--accent-violet-border)] hover:bg-[var(--accent-violet)] hover:text-white text-[var(--accent-violet)] px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Group</span>
        </button>
      </div>

      {/* Browse Groups Modal */}
      {isBrowseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsBrowseOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet)]/30">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Community Groups & DAOs</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Browse onchain groups on GIWA Sepolia. Select a group to filter proposals or self-join open DAOs.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsBrowseOpen(false);
                  setIsCreateOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#7B4FF2] hover:bg-[#683CD4] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {groupIds.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  No groups registered yet onchain. Create the first community group!
                </div>
              ) : (
                groupIds.map((gId) => (
                  <GroupListItem
                    key={gId.toString()}
                    groupId={gId}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={onSelectGroup}
                    onCloseModal={() => setIsBrowseOpen(false)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGroupCreated={() => {
          setIsCreateOpen(false);
          setIsBrowseOpen(true);
        }}
      />
    </>
  );
}
