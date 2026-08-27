import { NextResponse } from "next/server";

const HF_URL = "https://router.huggingface.co/v1/chat/completions";
/** Small instruct model via HF router — override with HELP_HF_MODEL if needed. */
const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct:fastest";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: Request) {
  try {
    const token = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Help AI is not configured on the server (missing HF_TOKEN)." },
        { status: 503, headers: cors }
      );
    }

    const body = (await req.json()) as {
      question?: string;
      guide?: string;
    };
    const question = (body.question || "").trim().slice(0, 500);
    if (!question) {
      return NextResponse.json({ error: "question required" }, { status: 400, headers: cors });
    }

    const guide = (body.guide || "").trim().slice(0, 8000);
    const model = (process.env.HELP_HF_MODEL || DEFAULT_MODEL).trim();

    const system = [
      "You are the in-app help assistant for SMS Register, an offline school attendance and results app (desktop).",
      "Answer only about how to use this app. Be short (2–5 sentences). Use plain language for school staff.",
      "If the guide below covers the topic, follow it. Name the menu numbers when helpful (e.g. Students 02, Mark 04).",
      "Do not invent features. If unsure, say what screens to open and suggest trying offline guide topics.",
      "",
      "PRODUCT GUIDE:",
      guide || "(no guide provided)",
    ].join("\n");

    const res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        max_tokens: 280,
        temperature: 0.2,
      }),
    });

    const raw = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      error?: string | { message?: string };
    };

    if (!res.ok) {
      const msg =
        typeof raw.error === "string"
          ? raw.error
          : raw.error?.message || `Hugging Face error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 502, headers: cors });
    }

    const answer = (raw.choices?.[0]?.message?.content || "").trim();
    if (!answer) {
      return NextResponse.json({ error: "Empty AI reply" }, { status: 502, headers: cors });
    }

    return NextResponse.json({ answer, source: "ai" }, { headers: cors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: cors }
    );
  }
}
