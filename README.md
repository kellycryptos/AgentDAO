<div align="center">

# AgentDAO

**Run a DAO the way you'd run a group chat.**

An AI agent that helps everyday communities create proposals, discuss, vote, and manage a shared treasury — in plain language, no crypto expertise required.

[![Live Demo](https://img.shields.io/badge/demo-live-00E5C7?style=flat-square)](https://agent-dao-gilt.vercel.app/)
[![Status](https://img.shields.io/badge/status-beta-7B4FF2?style=flat-square)]()
[![Built for](https://img.shields.io/badge/built%20for-GIWA%20%2F%20GASOK-12102B?style=flat-square)](https://giwa.io/gasok)
[![License](https://img.shields.io/badge/license-MIT-gray?style=flat-square)](#license)

[Live Demo](https://agent-dao-gilt.vercel.app/) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

</div>

---

## Overview

Running a DAO is still too hard for everyday groups. Wallets, gas, and governance dashboards assume a crypto-native user. Writing a clear, votable proposal takes time most people don't have. Long discussion threads bury the actual decision that needs a vote. Shared treasuries need clear rules that most small communities never set.

**AgentDAO** puts an AI agent between your community and the chain. Members talk to it in plain language, and the agent turns that conversation into structured proposals, clear summaries, onchain votes, and (eventually) treasury actions.

## Status

> **This project is in beta.** The current build demonstrates the core AI proposal-generation flow end to end. Onchain voting and the Agent Treasury are in active development — see [Roadmap](#roadmap).

## Features

| | |
|---|---|
| 💬 **Natural language interface** | Create groups, ask questions, and take action through plain conversation |
| ✍️ **AI proposal writer** | Turns a plain-language request into a structured, votable proposal |
| 🧵 **Discussion summarizer** | Condenses long threads into a short, decision-ready summary |
| 🗳️ **Simple onchain voting** *(in progress)* | One-tap voting on structured proposals |
| 💰 **Agent Treasury** *(planned)* | AI-assisted fund management against member-set rules |

## Live Demo

**[agent-dao-gilt.vercel.app](https://agent-dao-gilt.vercel.app/)**

Try a prompt like:
```
Draft a proposal to fund a community art grant for 2000 USDC
```

The agent will return a structured proposal card with a title, summary, requested amount, and rationale.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **AI:** Groq API (`llama-3.3-70b-versatile`) for proposal drafting and summarization
- **Chain** *(planned)*: GIWA Sepolia testnet, Solidity, Hardhat
- **Wallet** *(planned)*: Privy, Wagmi, Viem
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js v18+
- A [Groq API key](https://console.groq.com/) (optional — the app runs on a mock fallback without one)

### Installation

```bash
git clone https://github.com/kellycryptos/AgentDAO.git
cd AgentDAO
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=your_api_key_here
```

> If this is unset, the app falls back to a mock response so the chat flow still works for local development and demos.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Roadmap

| Phase | Target | Scope |
|---|---|---|
| **Phase 1** | Now → Q3 2026 | Core AI chat + proposal creation + basic onchain voting on GIWA testnet |
| **Phase 2** | Q4 2026 | Full voting system + Agent Treasury + private mainnet testing |
| **Phase 3** | 2027 | Public mainnet launch on GIWA + advanced agent features |

## Why GIWA

AgentDAO is built for the [GIWA](https://docs.giwa.io/giwa-chain/en) ecosystem — a high-performance L2 well suited to a chat-driven, high-frequency governance tool, with the [GASOK](https://giwa.io/gasok) program offering infrastructure support and access to an established user base.

## Team

| Name | Role | Location |
|---|---|---|
| Kelvin Mba | Founder & Lead Developer | Abuja, Nigeria |
| Godsreward Ginikanwa | Co-Founder | Casablanca-Settat, Morocco |
| Okorie Kosisochukwu | Product Lead | Lagos, Nigeria |
| Austine Ndukwe | Community Lead | Lagos, Nigeria |

## Contributing

This project is in early, active development. Issues and pull requests are welcome — please open an issue first to discuss any significant change.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<sub>Built for the GIWA / GASOK Builder Program</sub>
</div>
