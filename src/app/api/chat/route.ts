import { NextRequest, NextResponse } from "next/server";
import { securityCheck } from "@/lib/security/api-security";

/**
 * POST /api/chat
 *
 * AI-powered chat assistant using the z-ai-web-dev-sdk.
 * Answers questions about NetLodge — booking, payments, verification,
 * accommodation search, landlord operations, and more.
 *
 * Rate-limited via securityCheck. No authentication required (public).
 */
const SYSTEM_PROMPT = `You are NetLodge's AI assistant — a friendly, concise helper for Nigerian student accommodation.

NetLodge (netlodge.vercel.app) is a marketplace where students find and book verified rooms around Nigerian universities (currently UNILAG and UNN).

Key facts you know:
- Students browse verified properties, view individual rooms with photos, and book online.
- Booking creates a 24-hour hold; payment is via Paystack (NGN, kobo).
- Every property is verified: identity, address, ownership, on-site inspection.
- Landlords list properties, manage rooms by floor, and receive payouts.
- Roles: student, landlord, property_manager, agent, verification_officer, finance_admin, super_admin.
- Pricing is server-computed: base rent + caution deposit + service fee + additional charges = total.
- Payments are backend-confirmed — the app never trusts a client-side "payment success" claim.
- Support: /help (FAQs), /contact (support tickets), /safety (trust & verification).

Rules:
- Be concise (2-3 sentences max unless the user asks for detail).
- Be warm and conversational, not robotic.
- If you don't know something, say so and point to /help or /contact.
- Never make up prices, availability, or specific property details.
- Never collect PII (emails, phone numbers, passwords).
- Respond in the user's language (English, Igbo, Yoruba, or Hausa if they write in it).`;

export async function POST(request: NextRequest) {
  // Rate limit: failClosed=false so chat works even if Redis is unreachable
  const sec = await securityCheck(request, "chat", { capacity: 20, refillPerSecond: 0.5, failClosed: false });
  if (sec) return sec;

  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== "string" || message.length > 1000) {
      return NextResponse.json({ error: "Valid message required (max 1000 chars)" }, { status: 400 });
    }

    // Build conversation messages
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history.slice(-8).map((h: any) => ({
        role: (h.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: String(h.content).slice(0, 500),
      })) : []),
      { role: "user", content: message },
    ];

    // Call z-ai-web-dev-sdk
    let ZAI;
    try {
      ZAI = (await import("z-ai-web-dev-sdk")).default;
    } catch (importErr) {
      console.error("[api/chat] SDK import failed:", importErr instanceof Error ? importErr.message : String(importErr));
      throw new Error("AI service unavailable");
    }

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({ messages });

    const reply = response.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("Empty response from AI");
    }

    return NextResponse.json({ response: reply });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[api/chat] Error:", errMsg);

    // Provide helpful fallback based on error type
    let fallback = "I'm having trouble right now. ";
    if (errMsg.includes("unavailable") || errMsg.includes("import")) {
      fallback += "The AI service is starting up. Please try again in a moment.";
    } else if (errMsg.includes("rate") || errMsg.includes("limit")) {
      fallback += "You're sending messages too fast. Please slow down a bit.";
    } else {
      fallback += "Please try again or visit /help for common questions.";
    }

    return NextResponse.json({ response: fallback }, { status: 200 });
  }
}
