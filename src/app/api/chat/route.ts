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
  // Rate limit: 20 requests per minute for chat
  const sec = await securityCheck(request, "chat", { capacity: 20, refillPerSecond: 0.5, failClosed: true });
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
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({ messages });

    const reply = response.choices?.[0]?.message?.content ?? "I'm not sure how to help with that. Try browsing our help centre at /help or contact us at /contact.";

    return NextResponse.json({ response: reply });
  } catch (err) {
    console.error("[api/chat] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      response: "I'm having trouble responding right now. Please try again or visit /help for answers to common questions.",
    }, { status: 200 }); // Return 200 with fallback message so the UI doesn't show an error
  }
}
