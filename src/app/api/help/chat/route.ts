import { NextResponse } from "next/server";

const HF_URL = "https://router.huggingface.co/v1/chat/completions";
/** Small instruct model via HF router — override with HELP_HF_MODEL if needed. */
const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct:fastest";

const MAX_PER_MINUTE = Number(process.env.HELP_AI_MAX_PER_MIN || 6);
const BLOCK_MS = Number(process.env.HELP_AI_BLOCK_MS || 3 * 60 * 1000);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Bucket = { hits: number[]; blockedUntil: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: Request, bodyKey?: string): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const extra = (bodyKey || "").trim().slice(0, 80);
  return extra ? `${ip}|${extra}` : ip;
}

function checkRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], blockedUntil: 0 };
    buckets.set(key, b);
  }
  if (b.blockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }
  b.hits = b.hits.filter((t) => now - t < 60_000);
  if (b.hits.length >= MAX_PER_MINUTE) {
    b.blockedUntil = now + BLOCK_MS;
    b.hits = [];
    return { ok: false, retryAfterSec: Math.ceil(BLOCK_MS / 1000) };
  }
  b.hits.push(now);
  return { ok: true };
}

const OFF_TOPIC =
  /\b(joke|jokes|funny|meme|poem|poetry|story|song|lyrics|riddle|weather|recipe|cook|homework math|who is|celebrity|cricket score|football|movie|chatgpt|girlfriend|boyfriend|flirt|hack|password|nsfw|sex)\b/i;

const SMS_HINT =
  /\b(student|students|attendance|mark|absent|present|late|result|results|marks|exam|report|progress|staff|teacher|subject|backup|license|promote|class|section|gr|sheet|import|export|sms|register|settings|dashboard)\b/i;

function looksOffTopic(question: string): boolean {
  if (OFF_TOPIC.test(question) && !SMS_HINT.test(question)) return true;
  if (question.length > 20 && !SMS_HINT.test(question) && /^(tell me|write|make|sing|act as)\b/i.test(question)) {
    return true;
  }
  return false;
}

const SMS_ONLY_REFUSAL =
  "I only help with SMS Register (students, attendance, results, staff, backup, and related screens). Ask how to use the app — for example: how to add a student, or where to mark attendance.";

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
      clientId?: string;
    };
    const question = (body.question || "").trim().slice(0, 500);
    if (!question) {
      return NextResponse.json({ error: "question required" }, { status: 400, headers: cors });
    }

    const key = clientKey(req, body.clientId);
    const limit = checkRateLimit(key);
    if (!limit.ok) {
      const mins = Math.max(1, Math.ceil(limit.retryAfterSec / 60));
      return NextResponse.json(
        {
          error: `Too many AI help requests. Please wait about ${mins} minute${mins === 1 ? "" : "s"} before trying AI again. You can still use the built-in guide.`,
          code: "rate_limited",
          retryAfterSec: limit.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            ...cors,
            "Retry-After": String(limit.retryAfterSec),
          },
        }
      );
    }

    if (looksOffTopic(question)) {
      return NextResponse.json(
        { answer: SMS_ONLY_REFUSAL, source: "policy", code: "sms_only" },
        { headers: cors }
      );
    }

    const guide = (body.guide || "").trim().slice(0, 8000);
    const model = (process.env.HELP_HF_MODEL || DEFAULT_MODEL).trim();

    const system = [
      "You are the in-app help assistant for SMS Register only — a school attendance and results desktop app.",
      "STRICT SCOPE: answer only how to use SMS Register (students, attendance, results, staff, subjects, progress, promote, backup, license, settings).",
      "If the user asks for jokes, stories, poems, general chat, news, homework unrelated to this app, or anything outside SMS Register, reply with exactly this sentence and nothing else:",
      `"${SMS_ONLY_REFUSAL}"`,
      "Be short (2–5 sentences). Plain language for school staff.",
      "Say screens as left-menu names only, e.g. “On the left menu, open Students”. Never say numbers like 02 or Students (02).",
      "Follow the product guide below. Do not invent features.",
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
        max_tokens: 220,
        temperature: 0.1,
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
