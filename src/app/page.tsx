"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Coins,
  Award,
  ExternalLink,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { SubmitOnchainButton } from "@/components/SubmitOnchainButton";
import { ProposalList } from "@/components/ProposalList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { RatificationStrip } from "@/components/RatificationStrip";
import { GroupSelector } from "@/components/GroupSelector";
import { PROPOSAL_REGISTRY_ADDRESS } from "@/lib/abi";

interface ProposalData {
  title: string;
  summary: string;
  amount: string;
  rationale: string;
  isMock?: boolean;
}

interface DiscussionSummaryData {
  decision: string;
  summary: string;
  consensus: string;
  isMock?: boolean;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  timestamp: string;
  text?: string;
  proposal?: ProposalData;
  isLoading?: boolean;
  error?: string;
}

const SAMPLE_PROMPTS = [
  "Draft a proposal to fund a community art grant for 2000 USDC",
  "Draft a proposal for a smart contract security audit for 5000 USDC",
  "Draft a proposal to allocate 3500 USDC for developer hackathon bounties",
];

const SAMPLE_DISCUSSIONS = [
  {
    label: "Art Grant Debate",
    text: `Kelvin: Hey team, I want to propose allocating 2,000 USDC from the treasury to fund local digital art workshops and community mural grants for GIWA ecosystem creators.\nGodsreward: I support this! Art grants boost DAO visibility and bring in new creators.\nOkorie: I like the idea, but can we split it into 2 milestone payouts (1,000 USDC upfront, 1,000 USDC after the mural is finished)?\nAustine: Agreed with Okorie. Milestone payout protects treasury funds.\nKelvin: Sounds fair! Let's do 2 milestone payouts of 1,000 USDC each.`,
  },
  {
    label: "Audit vs Marketing",
    text: `Okorie: We need to allocate 5,000 USDC for a smart contract audit before mainnet launch.\nAustine: 5,000 USDC is a lot. Shouldn't we spend 2,500 USDC on marketing first to get users?\nKelvin: Without a security audit, users won't deposit funds safely. Audit must come first.\nGodsreward: Agreed. Security is non-negotiable before live mainnet deployment. Let's do the audit.`,
  },
];

export default function Home() {
  const [activeMode, setActiveMode] = useState<"proposal" | "summarizer">("proposal");
  const [discussionInput, setDiscussionInput] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [discussionSummary, setDiscussionSummary] = useState<DiscussionSummaryData | null>(null);
  const [summarizerError, setSummarizerError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: "Welcome to AgentDAO. Describe your governance idea or funding request in plain language, and I will generate a structured proposal draft for you.",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<bigint>(BigInt(0));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const summarizerSectionRef = useRef<HTMLDivElement>(null);

  const handleSummarize = async (textToUse?: string) => {
    const textToSummarize = (textToUse || discussionInput).trim();
    if (!textToSummarize || isSummarizing) return;

    setIsSummarizing(true);
    setSummarizerError(null);
    setDiscussionSummary(null);

    try {
      const response = await fetch("/api/summarize-discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSummarize }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to summarize discussion`);
      }

      const data: DiscussionSummaryData = await response.json();
      setDiscussionSummary(data);
    } catch (err: any) {
      setSummarizerError(
        err?.message || "An unexpected error occurred while summarizing the discussion."
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDraftFromSummary = () => {
    if (!discussionSummary) return;
    const combined = `Draft a proposal based on this discussion summary:\nTitle: ${discussionSummary.decision}\nSummary: ${discussionSummary.summary}\nConsensus: ${discussionSummary.consensus}`;
    setActiveMode("proposal");
    setInputPrompt(combined);
    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isSubmitting) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      timestamp: currentTime,
      text: promptText,
    };

    const loadingMessage: Message = {
      id: aiMsgId,
      sender: "ai",
      timestamp: currentTime,
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputPrompt("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/draft-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to generate draft`);
      }

      const proposalData: ProposalData = await response.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, isLoading: false, proposal: proposalData }
            : msg
        )
      );
    } catch (err: any) {
      const friendlyError =
        err?.message?.includes("HTTP") || err?.message?.includes("fetch")
          ? "Unable to reach the AI drafting service right now. Please try again in a moment."
          : err?.message || "An unexpected error occurred while drafting the proposal.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                isLoading: false,
                error: friendlyError,
              }
            : msg
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[#7B4FF2] selection:text-white transition-colors duration-200">
      {/* HEADER */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-header)] backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="AgentDAO Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md shrink-0" />
            <div>
              <h1 className="font-bold text-xl tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                AgentDAO{" "}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-violet-bg)] border border-[var(--accent-violet-border)] text-[var(--accent-violet)] font-mono font-semibold">
                  v0.1
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                AI assistant for simple community DAOs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)] text-xs font-receipt-mono shadow-sm">
              <button
                onClick={() => setActiveMode("proposal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeMode === "proposal"
                    ? "bg-[#7B4FF2] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Proposal Generator</span>
              </button>
              <button
                onClick={() => setActiveMode("summarizer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeMode === "summarizer"
                    ? "bg-[#7B4FF2] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion Summarizer</span>
              </button>
            </div>
            <GroupSelector selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-hero)] transition-colors py-12 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* LEFT COLUMN (55% width) */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Eyebrow badge with thin 1px border */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--accent-violet-border)] text-[var(--accent-violet)] text-xs font-receipt-mono tracking-wider uppercase font-semibold bg-[var(--accent-violet-bg)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-violet)]" />
                AI-Powered Governance on GIWA Sepolia
              </div>

              {/* Headline - Solid color, bold serif, monospace wink for group chat */}
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] font-serif-headline leading-[1.12]">
                Run a DAO <br className="hidden sm:inline" />
                the way you'd <br className="hidden sm:inline" />
                run a{" "}
                <span className="font-receipt-mono text-[var(--accent-violet)] font-bold">
                  group chat
                </span>
              </h2>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] font-sans max-w-xl leading-relaxed">
                Describe your governance idea or funding request in plain language. AgentDAO structures it into a clear, validated proposal in seconds — ready for live onchain voting on GIWA Sepolia.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  id="hero-cta"
                  onClick={scrollToChat}
                  className="inline-flex items-center justify-center gap-2 bg-[#7B4FF2] hover:bg-[#683CD4] text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
                >
                  Start generating
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={`https://sepolia-explorer.giwa.io/address/${PROPOSAL_REGISTRY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-[var(--text-primary)] hover:text-[var(--accent-violet)] font-semibold text-sm transition-colors py-2 group"
                >
                  <span>View contract on GIWA Sepolia</span>
                  <ArrowRight className="w-4 h-4 text-[var(--accent-violet)] transform group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* RIGHT COLUMN (45% width) — Signature Ratification Strip */}
            <div className="lg:col-span-5 w-full pt-4 lg:pt-0">
              <RatificationStrip />
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS STRIP */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-card-subtle)] py-3.5 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-around gap-4 text-xs font-receipt-mono text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-mint)] animate-pulse" />
            <span className="font-bold text-[var(--text-primary)] font-receipt-mono">2 Proposals Live</span>
            <span className="text-[var(--text-muted)] font-receipt-mono">on ProposalRegistry</span>
          </div>

          <div className="hidden sm:block text-[var(--border-color)]">|</div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-violet)]" />
            <span className="font-bold text-[var(--text-primary)] font-receipt-mono">GIWA Sepolia</span>
            <span className="text-[var(--text-muted)] font-receipt-mono">Chain ID: 91342</span>
          </div>

          <div className="hidden sm:block text-[var(--border-color)]">|</div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-mint)]" />
            <span className="font-bold text-[var(--text-primary)] font-receipt-mono">Powered by Groq</span>
          </div>
        </div>
      </div>

      {/* ABOUT SECTION */}
      <section className="border-b border-[var(--border-color)] transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-5">
            What is AgentDAO?
          </h3>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-4">
            AgentDAO helps everyday groups and communities run simple DAOs
            without complex web3 tools.
          </p>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-4">
            Just talk to the AI. It turns plain language ideas into proper proposals,
            ready for discussion and live onchain voting on GIWA Sepolia.
          </p>
          <p className="text-[var(--accent-mint)] font-semibold text-base sm:text-lg">
            Built for real communities — not just crypto natives.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-[var(--border-color)] transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            How it works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Describe your idea",
                desc: "Tell the AI what you want in plain language — no technical jargon needed.",
                icon: <Bot className="w-6 h-6 text-[var(--accent-violet)]" />,
              },
              {
                step: "02",
                title: "AI generates a proposal",
                desc: "AgentDAO structures your request into a clear title, summary, amount, and rationale.",
                icon: <Sparkles className="w-6 h-6 text-[var(--accent-mint)]" />,
              },
              {
                step: "03",
                title: "Submit and vote onchain",
                desc: "Register your proposal on GIWA Sepolia in one click and cast Yes/No votes directly.",
                icon: <CheckCircle2 className="w-6 h-6 text-[var(--accent-violet)]" />,
              },
            ].map(({ step, title, desc, icon }) => (
              <div
                key={step}
                className="relative bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-violet)] rounded-2xl p-6 transition-all group shadow-sm"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7B4FF2] to-[#00E5C7] opacity-0 group-hover:opacity-100 rounded-t-2xl transition-opacity" />
                <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-70 uppercase tracking-widest mb-3 block">
                  {step}
                </span>
                <div className="mb-3">{icon}</div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">{title}</h4>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY GIWA SECTION */}
      <section className="border-b border-[var(--border-color)] transition-colors bg-[var(--bg-card-subtle)]">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-violet)] px-3 py-1 rounded-full bg-[var(--accent-violet-bg)] border border-[var(--accent-violet)]/30 font-semibold mb-3 inline-block">
              Ecosystem Integration
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
              Why Built on GIWA?
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              AgentDAO leverages GIWA's high-performance Ethereum Layer 2 to deliver instant, low-cost chat governance for everyday communities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-violet-bg)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--accent-violet)]" />
              </div>
              <h4 className="font-bold text-base text-[var(--text-primary)]">Sub-Second Finality</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Fast execution allows members to submit proposals and cast votes without waiting minutes for chain confirmation.
              </p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-mint-bg)] flex items-center justify-center">
                <Coins className="w-5 h-5 text-[var(--accent-mint)]" />
              </div>
              <h4 className="font-bold text-base text-[var(--text-primary)]">Near-Zero Gas Fees</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Micro transaction costs mean every group member can participate in governance without financial friction.
              </p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-violet-bg)] flex items-center justify-center">
                <Award className="w-5 h-5 text-[var(--accent-violet)]" />
              </div>
              <h4 className="font-bold text-base text-[var(--text-primary)]">GASOK Ecosystem</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Backed by the GIWA / GASOK Builder Program to support scalable smart contract architecture and community growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-[var(--border-color)] transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Current Features */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-5 h-5 text-[var(--accent-mint)]" />
                <h4 className="font-semibold text-[var(--text-primary)] text-lg">
                  Current Features
                </h4>
              </div>
              <ul className="space-y-3">
                {[
                  "AI proposal generator",
                  "Clean, structured output",
                  "GIWA Sepolia onchain voting",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-mint)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Coming Next */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ArrowRight className="w-5 h-5 text-[var(--accent-violet)]" />
                <h4 className="font-semibold text-[var(--text-primary)] text-lg">
                  Coming Next
                </h4>
              </div>
              <ul className="space-y-3">
                {["Agent Treasury", "Group management", "Automated AI delegates"].map(
                  (f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-violet)]/60 shrink-0" />
                      {f}
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PROPOSAL GENERATOR / SUMMARIZER SECTION */}
      <div id="chat-section" ref={chatSectionRef} className="scroll-mt-20" />

      {activeMode === "proposal" && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
          {/* Section label */}
          <div className="flex items-center gap-2 mb-6 pt-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-violet)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Proposal Generator
            </span>
            <span className="text-xs text-[var(--text-muted)] font-receipt-mono">
              (describe your request below)
            </span>
          </div>

          {/* Messages List */}
          <div className="flex-1 space-y-6 mb-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* AI Avatar */}
                {msg.sender === "ai" && (
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-5 h-5 text-[var(--accent-mint)]" />
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={`max-w-2xl w-full ${
                    msg.sender === "user" ? "flex flex-col items-end" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {msg.sender === "user" ? "You" : "AgentDAO AI"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] opacity-60">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Plain Text Message */}
                  {msg.text && (
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#7B4FF2] text-white rounded-tr-none shadow-md"
                          : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Loading State */}
                  {msg.isLoading && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl rounded-tl-none p-5 shadow-sm space-y-3 w-full">
                      <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-violet)]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Drafting structured proposal with AI...</span>
                      </div>
                      <div className="space-y-2 animate-pulse">
                        <div className="h-4 bg-[var(--bg-card-subtle)] rounded w-3/4" />
                        <div className="h-3 bg-[var(--bg-card-subtle)] rounded w-full" />
                        <div className="h-3 bg-[var(--bg-card-subtle)] rounded w-5/6" />
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {msg.error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl rounded-tl-none p-4 text-xs flex items-start gap-2.5 w-full">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Drafting Error</p>
                        <p className="opacity-90">{msg.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Generated Proposal Card */}
                  {msg.proposal && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 sm:p-6 shadow-[var(--card-hover-shadow)] space-y-5 w-full transition-all">
                      {/* Proposal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet-border)] font-bold">
                              AI Draft Proposal
                            </span>
                            {msg.proposal.isMock && (
                              <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-color)] px-2 py-0.5 rounded">
                                Mock Mode
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {msg.proposal.title}
                          </h2>
                        </div>

                        {/* Amount Pill */}
                        <div className="bg-[var(--accent-mint-bg)] border border-[var(--accent-mint)]/30 px-3.5 py-1.5 rounded-xl text-right">
                          <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                            Requested Amount
                          </div>
                          <div className="text-sm font-bold font-mono text-[var(--accent-mint)]">
                            {msg.proposal.amount}
                          </div>
                        </div>
                      </div>

                      {/* Proposal Body */}
                      <div className="space-y-4 text-sm">
                        {/* Summary */}
                        <div>
                          <h3 className="text-xs uppercase font-mono text-[var(--text-muted)] tracking-wider mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[var(--accent-violet)]" />{" "}
                            Executive Summary
                          </h3>
                          <p className="text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
                            {msg.proposal.summary}
                          </p>
                        </div>

                        {/* Rationale */}
                        <div>
                          <h3 className="text-xs uppercase font-mono text-[var(--text-muted)] tracking-wider mb-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-mint)]" />{" "}
                            Rationale &amp; ROI
                          </h3>
                          <p className="text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
                            {msg.proposal.rationale}
                          </p>
                        </div>

                        {/* Onchain Submission Layer */}
                        <SubmitOnchainButton
                          groupId={selectedGroupId}
                          title={msg.proposal.title}
                          summary={msg.proposal.summary}
                          amount={msg.proposal.amount}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="w-9 h-9 rounded-xl bg-[#7B4FF2] flex items-center justify-center shrink-0 mt-1 shadow-md shadow-[#7B4FF2]/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Sample Prompt Chips */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-2 font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-violet)]" /> Try an example
              request:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={isSubmitting}
                  className="text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] hover:border-[var(--accent-violet)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 text-left cursor-pointer shadow-sm font-sans"
                >
                  <span>{prompt}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--accent-mint)] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative bg-[var(--bg-card)] border border-[var(--border-color)] focus-within:border-[var(--accent-violet)] rounded-2xl p-2 shadow-lg transition-all"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="e.g. Draft a proposal to fund a community art grant for 2000 USDC..."
                disabled={isSubmitting}
                className="flex-1 bg-transparent border-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] px-3 py-2.5 focus:outline-none focus:ring-0 disabled:opacity-50 font-sans"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isSubmitting}
                className="bg-[#7B4FF2] hover:bg-[#683CD4] text-white p-3 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-[#7B4FF2] cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-[#7B4FF2]/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </main>
      )}

      {/* DISCUSSION SUMMARIZER MODE */}
      {activeMode === "summarizer" && (
        <main ref={summarizerSectionRef} className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--accent-violet)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-serif-headline">
                  Community Discussion Summarizer
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
                Paste a Discord thread, Telegram chat, or forum discussion to extract structured key decisions and consensus points.
              </p>
            </div>

            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-receipt-mono px-2.5 py-1 rounded bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] border border-[var(--accent-violet-border)] font-bold">
              AI Analysis
            </span>
          </div>

          {/* Quick Sample Discussion Chips */}
          <div className="space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-receipt-mono">Sample Threads for Quick Testing:</div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DISCUSSIONS.map((sd) => (
                <button
                  key={sd.label}
                  onClick={() => setDiscussionInput(sd.text)}
                  className="text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-receipt-mono"
                >
                  + {sd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-3">
            <textarea
              value={discussionInput}
              onChange={(e) => setDiscussionInput(e.target.value)}
              rows={7}
              placeholder="Paste unstructured discussion here (e.g. Kelvin: Hey team, I want to propose allocating 2,000 USDC...)"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#7B4FF2] rounded-xl p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all shadow-sm font-sans resize-y"
            />

            <div className="flex justify-end">
              <button
                onClick={() => handleSummarize()}
                disabled={isSummarizing || !discussionInput.trim()}
                className="inline-flex items-center gap-2 bg-[#7B4FF2] hover:bg-[#683CD4] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Summarizing discussion...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Summarize Discussion
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error state */}
          {summarizerError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{summarizerError}</span>
            </div>
          )}

          {/* Result Summary Card */}
          {discussionSummary && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 sm:p-6 shadow-[var(--card-hover-shadow)] space-y-5 relative">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-receipt-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[var(--accent-mint-bg)] text-[var(--accent-mint)] border border-[var(--accent-mint)]/30">
                    [ANALYSIS COMPLETE]
                  </span>
                  {discussionSummary.isMock && (
                    <span className="text-[10px] font-receipt-mono text-[var(--text-muted)] border border-[var(--border-color)] px-2 py-0.5 rounded">
                      Mock Mode
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)] font-receipt-mono">
                  llama-3.3-70b-versatile
                </span>
              </div>

              {/* DECISION */}
              <div className="space-y-1">
                <div className="text-[10px] font-receipt-mono font-bold text-[var(--accent-violet)] uppercase tracking-wider">
                  [DECISION / PROPOSAL SUBJECT]
                </div>
                <h4 className="text-base font-bold text-[var(--text-primary)] font-serif-headline">
                  {discussionSummary.decision}
                </h4>
              </div>

              {/* SUMMARY */}
              <div className="space-y-1">
                <div className="text-[10px] font-receipt-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  [SUMMARY OF KEY POINTS]
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed bg-[var(--bg-card-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]">
                  {discussionSummary.summary}
                </p>
              </div>

              {/* CONSENSUS */}
              <div className="space-y-1">
                <div className="text-[10px] font-receipt-mono font-bold text-[var(--accent-mint)] uppercase tracking-wider">
                  [CONSENSUS STATUS]
                </div>
                <div className="text-xs text-[var(--text-primary)] font-receipt-mono bg-[var(--accent-mint-bg)] p-3 rounded-xl border border-[var(--accent-mint)]/20">
                  {discussionSummary.consensus}
                </div>
              </div>

              {/* Handoff CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDraftFromSummary}
                  className="inline-flex items-center gap-2 bg-[var(--accent-violet-bg)] hover:bg-[#7B4FF2] text-[var(--accent-violet)] hover:text-white border border-[var(--accent-violet-border)] hover:border-[#7B4FF2] font-bold px-5 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm group"
                >
                  <span>Draft a proposal from this summary</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ONCHAIN PROPOSALS LIST */}
      <ProposalList selectedGroupId={selectedGroupId} />

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

