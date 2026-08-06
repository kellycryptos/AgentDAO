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
} from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { SubmitOnchainButton } from "@/components/SubmitOnchainButton";
import { ProposalList } from "@/components/ProposalList";


interface ProposalData {
  title: string;
  summary: string;
  amount: string;
  rationale: string;
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

export default function Home() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                isLoading: false,
                error:
                  err?.message ||
                  "An unexpected error occurred while drafting the proposal.",
              }
            : msg
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#12102B] text-[#F1F0FB] flex flex-col font-sans selection:bg-[#7B4FF2] selection:text-white">
      {/* ── HEADER ── */}
      <header className="border-b border-[#2E265C] bg-[#12102B]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7B4FF2] to-[#00E5C7] p-[1px] shadow-lg shadow-[#7B4FF2]/20">
              <div className="w-full h-full bg-[#12102B] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00E5C7]" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                AgentDAO{" "}
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#7B4FF2]/20 border border-[#7B4FF2]/40 text-[#00E5C7] font-mono">
                  v0.1
                </span>
              </h1>
              <p className="text-xs text-[#9E9BB9]">
                AI assistant for simple community DAOs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-[#1B173E] px-3 py-1.5 rounded-lg border border-[#2E265C]">
              <ShieldCheck className="w-4 h-4 text-[#00E5C7]" />
              <span className="text-[#9E9BB9]">Mode:</span>
              <span className="text-[#00E5C7]">Proposal Generator</span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden border-b border-[#2E265C]">
        {/* Ambient glow orbs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#7B4FF2]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-[#00E5C7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-[#7B4FF2]/10 border border-[#7B4FF2]/30 text-[#00E5C7] text-xs font-mono tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Governance
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            AgentDAO
          </h2>
          <p className="text-lg sm:text-xl font-medium text-[#00E5C7] mb-4">
            AI assistant for simple community DAOs
          </p>
          <p className="text-base sm:text-lg text-[#9E9BB9] max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe your idea in plain language.
            <br className="hidden sm:block" />
            Get a clear, structured governance proposal in seconds.
          </p>

          <button
            id="hero-cta"
            onClick={scrollToChat}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B4FF2] to-[#956BFB] hover:from-[#956BFB] hover:to-[#7B4FF2] text-white font-semibold px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-[#7B4FF2]/30 hover:shadow-[#7B4FF2]/50 hover:scale-105 active:scale-100 text-base cursor-pointer"
          >
            Start generating
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section className="border-b border-[#2E265C]">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-5">
            What is AgentDAO?
          </h3>
          <p className="text-[#9E9BB9] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-4">
            AgentDAO helps everyday groups and communities run simple DAOs
            without complex tools.
          </p>
          <p className="text-[#9E9BB9] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-4">
            Just talk to the AI. It turns your ideas into proper proposals,
            ready for discussion and voting.
          </p>
          <p className="text-[#00E5C7] font-medium text-base sm:text-lg">
            Built for real communities — not just crypto natives.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-b border-[#2E265C]">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
            How it works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Describe your idea",
                desc: "Tell the AI what you want in plain language — no technical jargon needed.",
                icon: <Bot className="w-6 h-6 text-[#7B4FF2]" />,
              },
              {
                step: "02",
                title: "AI generates a proposal",
                desc: "AgentDAO structures your request into a clear title, summary, amount, and rationale.",
                icon: <Sparkles className="w-6 h-6 text-[#00E5C7]" />,
              },
              {
                step: "03",
                title: "Share and vote",
                desc: "Share the polished proposal with your group and move to discussion or voting.",
                icon: <CheckCircle2 className="w-6 h-6 text-[#7B4FF2]" />,
              },
            ].map(({ step, title, desc, icon }) => (
              <div
                key={step}
                className="relative bg-[#1B173E] border border-[#2E265C] hover:border-[#7B4FF2]/50 rounded-2xl p-6 transition-all group"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7B4FF2] to-[#00E5C7] opacity-0 group-hover:opacity-100 rounded-t-2xl transition-opacity" />
                <span className="text-[10px] font-mono text-[#9E9BB9]/60 uppercase tracking-widest mb-3 block">
                  {step}
                </span>
                <div className="mb-3">{icon}</div>
                <h4 className="font-semibold text-white mb-2">{title}</h4>
                <p className="text-sm text-[#9E9BB9] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-b border-[#2E265C]">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Current Features */}
            <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-5 h-5 text-[#00E5C7]" />
                <h4 className="font-semibold text-white text-lg">
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
                    className="flex items-center gap-2.5 text-sm text-[#F1F0FB]/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5C7] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Coming Next */}
            <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <ArrowRight className="w-5 h-5 text-[#7B4FF2]" />
                <h4 className="font-semibold text-white text-lg">
                  Coming Next
                </h4>
              </div>
              <ul className="space-y-3">
                {["Agent Treasury", "Group management", "Automated AI delegates"].map(
                  (f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-[#9E9BB9]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B4FF2]/60 shrink-0" />
                      {f}
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROPOSAL GENERATOR (Chat) ── */}
      <div ref={chatSectionRef} className="scroll-mt-20" />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-6 pt-2">
          <Sparkles className="w-5 h-5 text-[#7B4FF2]" />
          <span className="text-sm font-semibold text-white">
            Proposal Generator
          </span>
          <span className="text-xs text-[#9E9BB9] font-mono">
            — describe your request below
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
                <div className="w-9 h-9 rounded-xl bg-[#1B173E] border border-[#2E265C] flex items-center justify-center shrink-0 mt-1 shadow-md">
                  <Bot className="w-5 h-5 text-[#00E5C7]" />
                </div>
              )}

              {/* Message Content */}
              <div
                className={`max-w-2xl w-full ${
                  msg.sender === "user" ? "flex flex-col items-end" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-medium text-[#9E9BB9]">
                    {msg.sender === "user" ? "You" : "AgentDAO AI"}
                  </span>
                  <span className="text-[10px] text-[#9E9BB9]/60">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Plain Text Message */}
                {msg.text && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#7B4FF2] text-white rounded-tr-none shadow-lg shadow-[#7B4FF2]/20"
                        : "bg-[#1B173E] border border-[#2E265C] text-[#F1F0FB] rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Loading Indicator */}
                {msg.isLoading && (
                  <div className="bg-[#1B173E] border border-[#2E265C] rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-[#00E5C7] animate-spin" />
                    <span className="text-sm text-[#9E9BB9] animate-pulse">
                      Analyzing intent &amp; drafting proposal structure...
                    </span>
                  </div>
                )}

                {/* Error Box */}
                {msg.error && (
                  <div className="bg-red-950/40 border border-red-500/30 text-red-200 rounded-2xl rounded-tl-none p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-300">
                        Drafting Failed
                      </p>
                      <p className="text-xs text-red-300/80 mt-1">
                        {msg.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Structured Proposal Card */}
                {msg.proposal && (
                  <div className="bg-[#1B173E] border border-[#2E265C] hover:border-[#7B4FF2]/60 transition-all rounded-2xl rounded-tl-none p-5 sm:p-6 shadow-xl space-y-5 relative overflow-hidden group">
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7B4FF2] via-[#00E5C7] to-[#7B4FF2]" />

                    {/* Proposal Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2E265C]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#00E5C7]/10 text-[#00E5C7] border border-[#00E5C7]/30 flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3" /> Draft Proposal
                          </span>
                          {msg.proposal.isMock && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Mock Response
                            </span>
                          )}
                        </div>
                        <h2 className="font-bold text-lg text-white group-hover:text-[#00E5C7] transition-colors">
                          {msg.proposal.title}
                        </h2>
                      </div>

                      <div className="bg-[#12102B] px-4 py-2 rounded-xl border border-[#2E265C] flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-inner">
                        <DollarSign className="w-4 h-4 text-[#00E5C7]" />
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-[#9E9BB9] font-mono">
                            Requested
                          </div>
                          <div className="text-sm font-bold font-mono text-[#00E5C7]">
                            {msg.proposal.amount}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Body */}
                    <div className="space-y-4 text-sm">
                      {/* Summary */}
                      <div>
                        <h3 className="text-xs uppercase font-mono text-[#9E9BB9] tracking-wider mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#7B4FF2]" />{" "}
                          Executive Summary
                        </h3>
                        <p className="text-[#F1F0FB]/90 leading-relaxed bg-[#12102B]/50 p-3.5 rounded-xl border border-[#2E265C]/60">
                          {msg.proposal.summary}
                        </p>
                      </div>

                      {/* Rationale */}
                      <div>
                        <h3 className="text-xs uppercase font-mono text-[#9E9BB9] tracking-wider mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5C7]" />{" "}
                          Rationale &amp; ROI
                        </h3>
                        <p className="text-[#F1F0FB]/90 leading-relaxed bg-[#12102B]/50 p-3.5 rounded-xl border border-[#2E265C]/60">
                          {msg.proposal.rationale}
                        </p>
                      </div>

                      {/* Onchain Submission Layer */}
                      <SubmitOnchainButton
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
                <div className="w-9 h-9 rounded-xl bg-[#7B4FF2] flex items-center justify-center shrink-0 mt-1 shadow-md shadow-[#7B4FF2]/30">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Sample Prompt Chips */}
        <div className="mb-4">
          <p className="text-xs text-[#9E9BB9] mb-2 font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#7B4FF2]" /> Try an example
            request:
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isSubmitting}
                className="text-xs bg-[#1B173E] hover:bg-[#231E4F] hover:border-[#7B4FF2] border border-[#2E265C] text-[#F1F0FB]/80 hover:text-white px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 text-left cursor-pointer"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-[#00E5C7] shrink-0" />
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
          className="relative bg-[#1B173E] border border-[#2E265C] focus-within:border-[#7B4FF2] rounded-2xl p-2 shadow-2xl transition-all"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="e.g. Draft a proposal to fund a community art grant for 2000 USDC..."
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-[#9E9BB9]/60 px-3 py-2.5 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isSubmitting}
              className="bg-[#7B4FF2] hover:bg-[#956BFB] text-white p-3 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-[#7B4FF2] cursor-pointer flex items-center justify-center shrink-0 shadow-lg shadow-[#7B4FF2]/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>

      {/* ── ONCHAIN PROPOSALS LIST ── */}
      <ProposalList />
    </div>
  );
}
