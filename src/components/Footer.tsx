"use client";

import React from "react";
import { Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { PROPOSAL_REGISTRY_ADDRESS } from "@/lib/abi";

export function Footer() {
  const contractExplorerUrl = `https://sepolia-explorer.giwa.io/address/${PROPOSAL_REGISTRY_ADDRESS}`;

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors">
      <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="AgentDAO Logo" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">
                AgentDAO
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Run a DAO the way you'd run a group chat. AI governance assistant building on GIWA Sepolia.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="#chat-section"
                  className="hover:text-[var(--accent-violet)] transition-colors"
                >
                  AI Proposal Draft
                </a>
              </li>
              <li>
                <a
                  href="#proposals-list"
                  className="hover:text-[var(--accent-violet)] transition-colors"
                >
                  Onchain Proposals
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/kellycryptos/AgentDAO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent-violet)] transition-colors inline-flex items-center gap-1"
                >
                  GitHub Repository
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-[var(--text-muted)] opacity-60">
                  Docs (coming soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono mb-4">
              Community
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="text-[var(--text-muted)] opacity-60">
                  Twitter / X (coming soon)
                </span>
              </li>
              <li>
                <span className="text-[var(--text-muted)] opacity-60">
                  Discord (coming soon)
                </span>
              </li>
              <li>
                <span className="text-[var(--text-muted)] opacity-60">
                  Telegram (coming soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Legal / Smart Contract */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono mb-4">
              Verified Smart Contract
            </h4>
            <div className="bg-[var(--bg-card-subtle)] border border-[var(--border-color)] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--accent-mint)] font-semibold font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>GIWA Sepolia (91342)</span>
              </div>
              <p className="font-mono text-[11px] text-[var(--text-muted)] break-all">
                {PROPOSAL_REGISTRY_ADDRESS}
              </p>
              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent-violet)] hover:underline text-[11px] font-medium pt-1"
              >
                View on Blockscout Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} AgentDAO. MIT License.</p>
          <div className="text-xs font-mono text-[var(--accent-mint)]">
            Built for the GIWA Ecosystem
          </div>
        </div>
      </div>
    </footer>
  );
}
