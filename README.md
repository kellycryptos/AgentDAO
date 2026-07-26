# AgentDAO 🤖🏛️

**AgentDAO** is an AI-powered governance proposal drafting engine built for decentralized organizations. It transforms plain-language community ideas into structured, formal DAO governance proposals ready for review, voting, and execution.

---

## 🚀 Live Demo

- **Live URL**: [https://agent-dao-gilt.vercel.app](https://agent-dao-gilt.vercel.app)
- **GitHub Repository**: [https://github.com/kellycryptos/AgentDAO](https://github.com/kellycryptos/AgentDAO)

---

## ✨ Features

- **Natural Language Proposal Generator**: Enter a simple request (e.g. *"draft a proposal to fund a community art grant for 2000 USDC"*), and AgentDAO's AI constructs a complete proposal.
- **Structured Proposal Cards**: Displays formatted proposal components including Title, Requested Amount, Executive Summary, and Rationale/ROI.
- **Anthropic LLM Integration**: Powered by Claude (`claude-3-5-sonnet`) when `ANTHROPIC_API_KEY` is configured.
- **Dynamic Mock Fallback**: Zero-dependency mock proposal generator built-in so the demo works seamlessly out-of-the-box even without an API key.
- **Modern Dark Violet UI**: Styled with a dark indigo palette (`#12102B`), violet accents (`#7B4FF2`), and mint highlights (`#00E5C7`).

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kellycryptos/AgentDAO.git
   cd AgentDAO
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Set your `ANTHROPIC_API_KEY` if you wish to use live LLM calls:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
   *Note: If left unset, AgentDAO automatically uses the built-in mock proposal generator.*

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Deployment

AgentDAO is built with standard Next.js (App Router) and requires zero custom configuration to deploy on Vercel:

1. Import `kellycryptos/AgentDAO` into [Vercel](https://vercel.com).
2. (Optional) Set `ANTHROPIC_API_KEY` in Environment Variables.
3. Click **Deploy**.
