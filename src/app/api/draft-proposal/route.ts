import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export interface ProposalDraft {
  title: string;
  summary: string;
  amount: string;
  rationale: string;
  isMock?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt || "";

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey && apiKey.trim() !== "") {
      try {
        const groq = new Groq({ apiKey });
        const chatCompletion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_completion_tokens: 1024,
          messages: [
            {
              role: "system",
              content: `You are AgentDAO's proposal generation assistant. Analyze the user's request and draft a structured DAO proposal.
Return ONLY valid JSON without any markdown formatting or commentary. The JSON object must strictly match this TypeScript interface:
{
  "title": "Clear, concise title for the proposal",
  "summary": "2-3 sentence overview of what is being requested and why",
  "amount": "The exact requested amount with token denomination (e.g. '2,000 USDC')",
  "rationale": "Logical explanation of benefits, milestones, and ROI for the DAO"
}`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const textResponse = chatCompletion.choices[0]?.message?.content || "";

        // Clean JSON string in case model wraps with ```json ... ```
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ProposalDraft;
          return NextResponse.json({ ...parsed, isMock: false });
        }
      } catch (err) {
        console.error("Groq API error, falling back to mock:", err);
      }
    }

    // Stub mock response when GROQ_API_KEY is unset or fails
    const mockDraft = generateMockProposal(prompt);
    return NextResponse.json(mockDraft);
  } catch (error) {
    console.error("Error in draft-proposal route:", error);
    return NextResponse.json(
      { error: "Failed to generate proposal draft" },
      { status: 500 }
    );
  }
}

function generateMockProposal(prompt: string): ProposalDraft {
  const lower = prompt.toLowerCase();

  // Extract amount if present in prompt
  const amountMatch = prompt.match(/(\$?[\d,]+(?:\.\d+)?\s*(?:USDC|ETH|GIWA|DAI|tokens)?)/i);
  let detectedAmount = amountMatch ? amountMatch[1].toUpperCase() : "2,000 USDC";
  if (!detectedAmount.includes("USDC") && !detectedAmount.includes("ETH") && !detectedAmount.includes("GIWA")) {
    detectedAmount += " USDC";
  }

  if (lower.includes("art") || lower.includes("grant")) {
    return {
      title: "Community Art & Cultural Grant Initiative",
      summary: "Funding grant to host an interactive digital art exhibition and commission community artists to create custom AgentDAO themed artwork and NFTs.",
      amount: detectedAmount,
      rationale: "Fosters brand engagement, expands DAO visibility, and incentivizes creative contributions from community artists with measurable milestone deliverables.",
      isMock: true,
    };
  }

  if (lower.includes("audit") || lower.includes("security")) {
    return {
      title: "Smart Contract Security Audit Sponsorship",
      summary: "Allocation for a comprehensive third-party smart contract audit of AgentDAO core voting and treasury modules prior to mainnet launch.",
      amount: detectedAmount,
      rationale: "Mitigates protocol vulnerability risks, increases institutional investor trust, and guarantees safety of treasury funds.",
      isMock: true,
    };
  }

  if (lower.includes("developer") || lower.includes("bounty") || lower.includes("hackathon")) {
    return {
      title: "Ecosystem Developer Growth & Bounty Fund",
      summary: "Establishment of a developer bounty fund to reward open-source contributors building integrations, SDKs, and analytics tools for AgentDAO.",
      amount: detectedAmount,
      rationale: "Accelerates technical ecosystem adoption, improves developer documentation, and incentivizes top Web3 talent to build on AgentDAO infrastructure.",
      isMock: true,
    };
  }

  // Fallback generic mock draft
  return {
    title: `AgentDAO Proposal: ${prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt}`,
    summary: `A structured community proposal initiating funding and execution for: "${prompt}".`,
    amount: detectedAmount,
    rationale: "Directly aligns with AgentDAO strategic expansion goals, incentivizing community growth and decentralized governance execution.",
    isMock: true,
  };
}
