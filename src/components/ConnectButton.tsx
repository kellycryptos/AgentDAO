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
        className="px-4 py-2 bg-[#1B173E] text-[#9E9BB9] text-xs font-semibold rounded-xl border border-[#2E265C] opacity-50"
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
        <Wallet className="w-4 h-4 text-[#00E5C7]" />
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
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
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
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00E5C7]/10 border border-[#00E5C7]/30 text-[#00E5C7] text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-[#00E5C7] animate-pulse" />
        <span>GIWA Sepolia</span>
      </div>

      {/* Connected Account Button */}
      <button
        onClick={() => open()}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1B173E] hover:bg-[#252054] text-[#F1F0FB] text-xs font-mono font-semibold border border-[#2E265C] hover:border-[#7B4FF2]/50 transition-all cursor-pointer shadow-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 sm:hidden" />
        <span>{truncatedAddress}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#9E9BB9]" />
      </button>
    </div>
  );
}
