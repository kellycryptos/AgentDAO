"use client";

import React, { useEffect, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Wallet, AlertTriangle, ChevronDown } from "lucide-react";
import { giwaSepolia } from "@/app/providers";

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-[var(--bg-card)] text-[var(--text-muted)] text-xs font-semibold rounded-xl border border-[var(--border-color)] opacity-50"
      >
        Loading...
      </button>
    );
  }

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => open()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7B4FF2] to-[#956BFB] hover:from-[#956BFB] hover:to-[#7B4FF2] text-white text-xs font-bold tracking-wide shadow-md shadow-[#7B4FF2]/20 hover:shadow-[#7B4FF2]/40 transition-all cursor-pointer"
      >
        <Wallet className="w-4 h-4 text-emerald-300 dark:text-[#00E5C7]" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  const isWrongNetwork = chainId !== giwaSepolia.id;

  if (isWrongNetwork) {
    return (
      <button
        onClick={() =>
          switchChain
            ? switchChain({ chainId: giwaSepolia.id })
            : open({ view: "Networks" })
        }
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer"
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
        <span>Switch to GIWA Sepolia</span>
      </button>
    );
  }

  const truncatedAddress = `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;

  return (
    <div className="flex items-center gap-2">
      {/* Network Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent-mint-bg)] border border-[var(--accent-mint)]/30 text-[var(--accent-mint)] text-xs font-mono font-medium">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-mint)] animate-pulse" />
        <span>GIWA Sepolia</span>
      </div>

      {/* Connected Account Button */}
      <button
        onClick={() => open()}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] text-[var(--text-primary)] text-xs font-mono font-semibold border border-[var(--border-color)] hover:border-[var(--accent-violet)] transition-all cursor-pointer shadow-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 sm:hidden" />
        <span>{truncatedAddress}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </button>
    </div>
  );
}
