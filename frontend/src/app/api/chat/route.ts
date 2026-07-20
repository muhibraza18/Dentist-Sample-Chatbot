import { NextResponse } from "next/server";
import { z } from "zod";

import { getClinicBySlug, ensureDefaultClinic } from "@/lib/clinic";
import { createAppointmentAndNotify, getBookingState, resetBookingState, saveBookingState } from "@/lib/booking";
import { searchKnowledge } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  clientSlug: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

const bookingIntentPatterns = [
  "appointment",
  "book an appointment",
  "book appointment",
  "schedule a consultation",
  "schedule consultation",
  "see a dentist",
  "book a visit",
  "need to see a dentist",
  "schedule a visit",
];

const successMessage =
  "Thank you. Your appointment request has been submitted successfully. Our team will contact you shortly.";

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function isAppointmentIntent(text: string) {
  const normalized = normalize(text);
  return bookingIntentPatterns.some((pattern) => normalized.includes(pattern));
}

function extractEmail(text: string) {
  return text.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)?.[1] ?? "";
}

function extractPhone(text: string) {
  return text.match(/(\+?\d[\d\s().-]{6,}\d)/)?.[1].replace(/\s+/g, "") ?? "";
}

function extractDate(text: string) {
  const patterns = [
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b/i,
    /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:,\s*\d{4})?\b/i,
    /\b\d{4}-\d{2}-\d{2}\b/,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    /\btomorrow\b/i,
    /\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return "";
}

function extractTime(text: string) {
  return text.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)?.[0].toUpperCase() ?? text.match(/\b\d{2}:\d{2}\b/)?.[0] ?? "";
}

function guessName(text: string) {
  if (isAppointmentIntent(text)) return "";
  let cleaned = text;
  const email = extractEmail(cleaned);
  if (email) cleaned = cleaned.replace(email, " ");
  const phone = extractPhone(cleaned);
  if (phone) cleaned = cleaned.replace(phone, " ");
  cleaned = cleaned
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b/gi, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ");
  const words = cleaned.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const firstWord = words[0]?.toLowerCase() ?? "";
  if (!words.length || ["appointment", "book", "schedule", "consult", "visit"].includes(firstWord)) return "";
  const candidate = words.slice(0, 4).join(" ").trim();
  return candidate.split(" ").length >= 2 ? candidate : "";
}

function collectContactInfo(message: string) {
  return { name: guessName(message), phone: extractPhone(message), email: extractEmail(message) };
}

function collectAppointmentDetails(message: string) {
  const dateValue = extractDate(message);
  const timeValue = extractTime(message);
  let cleaned = message;
  if (dateValue) cleaned = cleaned.replace(dateValue, " ");
  if (timeValue) cleaned = cleaned.replace(timeValue, " ").replace(timeValue.replace(" ", ""), " ");
  const service = cleaned.replace(/\b(?:am|pm)\b/gi, " ").replace(/\s+/g, " ").trim();
  return { service, appointmentDate: dateValue, appointmentTime: timeValue };
}

function bookingPrompt(step: string) {
  if (step === "collect_contact") return "Please provide your full name, phone number, and email address.";
  if (step === "collect_service_datetime") return "What service do you need and what date/time would you prefer?";
  if (step === "awaiting_confirmation") return "Confirm? (yes/no)";
  return "";
}

function missingFieldMessage(fields: string[]) {
  const labels: Record<string, string> = {
    name: "name",
    phone: "phone number",
    email: "email address",
    service: "service",
    appointmentDate: "appointment date",
    appointmentTime: "appointment time",
  };
  if (!fields.length) return "";
  if (fields.length === 1) return `I could not detect your ${labels[fields[0]]}.`;
  if (fields.length === 2) return `I could not detect your ${labels[fields[0]]} and ${labels[fields[1]]}.`;
  return `I could not detect your ${fields.slice(0, -1).map((field) => labels[field]).join(", ")}, and ${labels[fields.at(-1)!]}.`;
}

export async function POST(request: Request) {
  const { prisma } = await import("@/lib/prisma");
  const { default: OpenAI } = await import("openai");
  const payload = schema.parse(await request.json());
  const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const clinic = (await getClinicBySlug(payload.clientSlug)) ?? (await ensureDefaultClinic());
  const bookingState = getBookingState(clinic.id, payload.sessionId);

  await prisma.conversation.create({
    data: { clientId: clinic.id, sessionId: payload.sessionId, message: payload.message, role: "user" },
  });

  if (isAppointmentIntent(payload.message) && bookingState.bookingStep === "idle") {
    bookingState.bookingStep = "collect_contact";
    saveBookingState(clinic.id, payload.sessionId, bookingState);
    const reply = bookingPrompt("collect_contact");
    await prisma.conversation.create({
      data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
    });
    return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
  }

  if (bookingState.bookingStep !== "idle") {
    const normalized = normalize(payload.message);

    if (bookingState.awaitingConfirmation) {
      if (["yes", "y", "confirm", "confirmed", "ok", "okay"].includes(normalized)) {
        try {
          const appointment = await createAppointmentAndNotify(clinic.id, clinic.clinicName, bookingState);
          resetBookingState(clinic.id, payload.sessionId);
          await prisma.conversation.create({
            data: { clientId: clinic.id, sessionId: payload.sessionId, message: successMessage, role: "assistant" },
          });
          return NextResponse.json({ reply: successMessage, sessionId: payload.sessionId, bookingState: getBookingState(clinic.id, payload.sessionId), appointment });
        } catch {
          const reply = "I couldn't submit the appointment request. Please check the date and time format and try again.";
          await prisma.conversation.create({
            data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
          });
          return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
        }
      }
      if (["no", "n", "cancel", "stop"].includes(normalized)) {
        resetBookingState(clinic.id, payload.sessionId);
        const reply = "Appointment booking canceled.";
        await prisma.conversation.create({
          data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
        });
        return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState: getBookingState(clinic.id, payload.sessionId) });
      }
      const reply = "Please reply yes or no.";
      await prisma.conversation.create({
        data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
      });
      return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
    }

    if (bookingState.bookingStep === "collect_contact") {
      const extracted = collectContactInfo(payload.message);
      bookingState.bookingData = {
        ...bookingState.bookingData,
        name: extracted.name || bookingState.bookingData.name,
        phone: extracted.phone || bookingState.bookingData.phone,
        email: extracted.email || bookingState.bookingData.email,
      };
      if (extracted.name && extracted.phone && extracted.email) {
        bookingState.bookingStep = "collect_service_datetime";
        saveBookingState(clinic.id, payload.sessionId, bookingState);
        const reply = bookingPrompt("collect_service_datetime");
        await prisma.conversation.create({
          data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
        });
        return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
      }
      const missing = [
        !extracted.name ? "name" : "",
        !extracted.phone ? "phone" : "",
        !extracted.email ? "email" : "",
      ].filter(Boolean);
      const reply = missingFieldMessage(missing);
      saveBookingState(clinic.id, payload.sessionId, bookingState);
      await prisma.conversation.create({
        data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
      });
      return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
    }

    if (bookingState.bookingStep === "collect_service_datetime") {
      const extracted = collectAppointmentDetails(payload.message);
      const missing = [
        !extracted.service ? "service" : "",
        !extracted.appointmentDate ? "appointmentDate" : "",
        !extracted.appointmentTime ? "appointmentTime" : "",
      ].filter(Boolean);
      if (missing.length) {
        const reply = missingFieldMessage(missing);
        await prisma.conversation.create({
          data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
        });
        return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
      }
      bookingState.bookingData = { ...bookingState.bookingData, ...extracted };
      bookingState.bookingStep = "awaiting_confirmation";
      bookingState.awaitingConfirmation = true;
      saveBookingState(clinic.id, payload.sessionId, bookingState);
      const reply = [
        "Appointment Summary",
        "",
        `Name: ${bookingState.bookingData.name ?? ""}`,
        `Phone: ${bookingState.bookingData.phone ?? ""}`,
        `Email: ${bookingState.bookingData.email ?? ""}`,
        `Service: ${bookingState.bookingData.service ?? ""}`,
        `Date: ${bookingState.bookingData.appointmentDate ?? ""}`,
        `Time: ${bookingState.bookingData.appointmentTime ?? ""}`,
        "",
        "Confirm? (yes/no)",
      ].join("\n");
      await prisma.conversation.create({
        data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
      });
      return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
    }
  }

  const history = await prisma.conversation.findMany({
    where: { clientId: clinic.id, sessionId: payload.sessionId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const context = await searchKnowledge(clinic.id, payload.message, 5);
  const retrievedContext = context.map((row: { content: string }) => row.content).join("\n\n");

  const reply =
    context.length === 0
      ? "I don't have that information in my knowledge base."
      : client
        ? (
            await client.chat.completions.create({
              model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a friendly dental receptionist. Use only the clinic knowledge provided. Be concise and helpful." },
                ...history.slice(-8).map((item: { role: string; message: string }) => ({
                  role: item.role as "user" | "assistant",
                  content: item.message,
                })),
                { role: "system", content: `Clinic knowledge:\n${retrievedContext}` },
                { role: "user", content: payload.message },
              ],
            })
          ).choices[0]?.message?.content?.trim() ?? "I'm here to help with clinic questions."
        : "I'm here to help with clinic questions.";

  await prisma.conversation.create({
    data: { clientId: clinic.id, sessionId: payload.sessionId, message: reply, role: "assistant" },
  });

  return NextResponse.json({ reply, sessionId: payload.sessionId, bookingState });
}
