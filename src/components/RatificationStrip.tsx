"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, CheckCircle2, Terminal } from "lucide-react";

const REAL_TX_HASH = "0x55a2ee3abb836b47fbbe17061e2aa7792ad4901e4db7bcff0fcd863233f5e915";
const SHORT_TX_HASH = "0x55a2...e915";
const PROMPT_TEXT = "fund a community art grant for 2000 usdc";

export function RatificationStrip() {
  const [typedText, setTypedText] = useState("");
  const [stage, setStage] = useState<"typing" | "tearing" | "fields" | "stamped">("typing");
  const [fieldStep, setFieldStep] = useState(0);

  useEffect(() => {
    // Check prefers-reduced-motion or mobile screens for instant end state
    if (typeof window !== "undefined") {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        setTypedText(PROMPT_TEXT);
        setStage("stamped");
        setFieldStep(3);
        return;
      }
    }

    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < PROMPT_TEXT.length) {
        setTypedText(PROMPT_TEXT.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setStage("tearing"), 200);
      }
    }, 20);

    return () => clearInterval(typeInterval);
  }, []);

  useEffect(() => {
    if (stage === "tearing") {
      const timer = setTimeout(() => setStage("fields"), 300);
      return () => clearTimeout(timer);
    }

    if (stage === "fields") {
      const fieldTimer = setInterval(() => {
        setFieldStep((prev) => {
          if (prev < 3) return prev + 1;
          clearInterval(fieldTimer);
          setTimeout(() => setStage("stamped"), 200);
          return prev;
        });
      }, 200);
      return () => clearInterval(fieldTimer);
    }
  }, [stage]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 font-receipt-mono text-left">
      {/* Step 1: Input Chat Strip */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 sm:p-4 shadow-sm flex items-center gap-3 transition-all duration-300">
        <Terminal className="w-4 h-4 text-[var(--accent-violet)] shrink-0" />
        <div className="flex-1 font-receipt-mono text-xs sm:text-sm text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
          <span>{typedText}</span>
          {stage === "typing" && (
            <span className="inline-block w-2 h-4 bg-[var(--accent-violet)] ml-1 animate-pulse align-middle" />
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet-border)]">
          Prompt
        </span>
      </div>

      {/* Signature Element: Torn Paper Ballot Receipt */}
      <div
        className={`relative transition-all duration-700 transform ${
          stage === "typing"
            ? "opacity-40 scale-95 translate-y-2 pointer-events-none"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        {/* Soft Drop Shadow Layer */}
        <div className="relative rounded-b-xl filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.65)]">
          
          {/* Irregular Torn Edge SVG Header */}
          <div className="w-full overflow-hidden leading-none text-[var(--bg-card)] -mb-[1px]">
            <svg
              className="w-full h-4 sm:h-5 block fill-current"
              viewBox="0 0 500 20"
              preserveAspectRatio="none"
            >
              {/* Irregular tooth spacing and depth */}
              <path d="M0,0 L0,16 L12,3 L27,18 L41,2 L59,17 L74,1 L92,15 L108,3 L126,18 L142,4 L161,16 L178,2 L195,17 L212,3 L229,18 L246,2 L264,16 L281,4 L298,17 L315,2 L333,18 L349,3 L366,16 L383,2 L402,17 L418,4 L436,18 L452,2 L470,16 L487,4 L500,15 L500,0 Z" />
            </svg>
          </div>

          {/* Receipt Body */}
          <div className="bg-[var(--bg-card)] border-x border-b border-[var(--border-card)] rounded-b-xl p-5 sm:p-6 space-y-4 relative overflow-hidden">
            {/* Header / Meta */}
            <div className="flex items-center justify-between border-b border-dashed border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] font-receipt-mono">
                  BALLOT RECEIPT #001
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-receipt-mono">
                GIWA-SEPOLIA :: 91342
              </span>
            </div>

            {/* Field 1: Title */}
            <div
              className={`transition-all duration-300 ${
                fieldStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              <div className="text-[10px] font-serif-headline uppercase tracking-wider text-[var(--text-muted)] font-bold mb-0.5">
                Proposal Title
              </div>
              <div className="text-base sm:text-lg font-serif-headline font-bold text-[var(--text-primary)]">
                Community Art Grant
              </div>
            </div>

            {/* Field 2: Summary */}
            <div
              className={`transition-all duration-300 ${
                fieldStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              <div className="text-[10px] font-serif-headline uppercase tracking-wider text-[var(--text-muted)] font-bold mb-0.5">
                Summary & Impact
              </div>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card-subtle)] p-2.5 rounded-lg border border-[var(--border-color)]">
                Fund local digital art workshops and community mural grants for GIWA creators.
              </p>
            </div>

            {/* Field 3: Amount + Ratified Stamp (inline, no absolute positioning) */}
            <div
              className={`flex items-center justify-between pt-1 border-t border-dashed border-[var(--border-color)] transition-all duration-300 ${
                fieldStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-serif-headline font-bold text-[var(--text-muted)] shrink-0">
                  Grant Requested:
                </span>
                <span className="text-xs sm:text-sm font-bold font-receipt-mono text-[var(--accent-violet)] bg-[var(--accent-violet-bg)] px-2.5 py-1 rounded border border-[var(--accent-violet-border)]">
                  2,000 USDC
                </span>
              </div>

              {/* Ratified Stamp — flows inline to the right of the amount, zero overlap risk */}
              {stage === "stamped" && (
                <div className="pointer-events-none animate-stamp shrink-0">
                  <div className="border-2 border-[#00D9B5] rounded-lg px-2 py-0.5 transform -rotate-6 bg-[#00D9B5]/15 shadow-md shadow-[#00D9B5]/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00D9B5] shrink-0" />
                    <span className="text-[10px] sm:text-xs font-black font-receipt-mono tracking-widest text-[#00D9B5] uppercase whitespace-nowrap">
                      RATIFIED
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Verified Onchain Tx Hash Footer */}
            <div
              className={`pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-receipt-mono transition-all duration-500 ${
                stage === "stamped" ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse" />
                <span>Status: Live Onchain</span>
              </div>
              <a
                href={`https://sepolia-explorer.giwa.io/tx/${REAL_TX_HASH}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent-violet)] hover:underline font-semibold"
                title={`View tx ${REAL_TX_HASH} on GIWA Sepolia Explorer`}
              >
                <span>Tx: {SHORT_TX_HASH}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
