import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export interface DiscussionSummaryResponse {
  decision: string;
  summary: string;
  consensus: string;
  isMock?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "Discussion text is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey && apiKey.trim() !== "") {
      try {
        const groq = new Groq({ apiKey });
        
        // Try llama-3.3-70b-versatile first, fallback to qwen/qwen3.6-27b if needed
        let chatCompletion;
        try {
          chatCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_completion_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `You are AgentDAO's community discussion summarizer. Analyze the provided raw discussion thread (from Discord, Telegram, or governance forums) and extract key insights.
Return ONLY valid JSON without any markdown formatting, commentary, or thinking tags. The JSON object must strictly match this TypeScript interface:
{
  "decision": "1 sentence describing the core decision, proposal, or question being discussed",
  "summary": "2-3 sentences summarizing main arguments for and against, or key viewpoints raised",
  "consensus": "1 sentence detailing whether clear consensus was reached, split, or remains unresolved"
}`,
              },
              {
                role: "user",
                content: text,
              },
            ],
          });
        } catch (mErr) {
          console.warn("Primary model failed, trying fallback model:", mErr);
          chatCompletion = await groq.chat.completions.create({
            model: "qwen/qwen3.6-27b",
            temperature: 0.3,
            max_completion_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `You are AgentDAO's community discussion summarizer. Analyze the provided raw discussion thread and return JSON with keys: "decision", "summary", "consensus".`,
              },
              {
                role: "user",
                content: text,
              },
            ],
          });
        }

        let textResponse = chatCompletion.choices[0]?.message?.content || "";

        // Strip thinking blocks if present
        if (textResponse.includes("</think>")) {
          textResponse = textResponse.split("</think>").pop() || "";
        } else {
          textResponse = textResponse.replace(/<think>[\s\S]*?$/gi, "");
        }

        textResponse = textResponse.trim();

        // Extract JSON block cleanly
        const firstOpen = textResponse.indexOf("{");
        const lastClose = textResponse.lastIndexOf("}");
        if (firstOpen !== -1 && lastClose > firstOpen) {
          const jsonStr = textResponse.slice(firstOpen, lastClose + 1);
          try {
            const parsed = JSON.parse(jsonStr) as DiscussionSummaryResponse;
            if (parsed.decision && parsed.summary && parsed.consensus) {
              return NextResponse.json({ ...parsed, isMock: false });
            }
          } catch (e) {
            console.warn("Direct JSON parse failed:", e);
          }
        }
      } catch (err) {
        console.error("Groq API error, falling back to mock:", err);
      }
    }

    // Stub mock response when GROQ_API_KEY is unset or fails
    const mockSummary = generateMockSummary(text);
    return NextResponse.json(mockSummary);
  } catch (error) {
    console.error("Error in summarize-discussion route:", error);
    return NextResponse.json(
      { error: "Failed to summarize discussion" },
      { status: 500 }
    );
  }
}

function generateMockSummary(text: string): DiscussionSummaryResponse {
  const lower = text.toLowerCase();

  if (lower.includes("art") || lower.includes("mural") || lower.includes("gallery")) {
    return {
      decision: "Proposal to allocate 2,000 USDC from the treasury for community art grants and digital mural workshops.",
      summary: "Community members enthusiastically supported empowering local creators and expanding DAO branding. Minor questions were raised about milestone verification before releasing funds.",
      consensus: "Strong consensus in favor (approx. 85%), contingent on establishing a 2-stage milestone payout.",
      isMock: true,
    };
  }

  if (lower.includes("audit") || lower.includes("security") || lower.includes("code")) {
    return {
      decision: "Requesting 5,000 USDC to contract a third-party smart contract security audit before mainnet deployment.",
      summary: "Core developers highlighted critical security assurance requirements prior to handling live funds. Community members debated whether to audit now or after upcoming UI updates.",
      consensus: "Consensus reached to prioritize security audit immediately before any mainnet asset migration.",
      isMock: true,
    };
  }

  if (lower.includes("hackathon") || lower.includes("dev") || lower.includes("bounty")) {
    return {
      decision: "Proposal to set aside 3,500 USDC for developer bounties and hackathon rewards.",
      summary: "Developers advocated for rewarding open-source integrations and SDK tools. Community members requested a dedicated committee to evaluate submission quality.",
      consensus: "General agreement on funding, pending approval of a 3-member review panel.",
      isMock: true,
    };
  }

  // Generic fallback mock
  const snippet = text.length > 60 ? text.substring(0, 60) + "..." : text;
  return {
    decision: `Discussion regarding governance initiative: "${snippet}"`,
    summary: "Participants discussed core objectives, resource allocation, and implementation timelines. Key arguments focused on maximizing community ROI while maintaining protocol security.",
    consensus: "Broad consensus to proceed with drafting a formal structured proposal for onchain voting.",
    isMock: true,
  };
}
