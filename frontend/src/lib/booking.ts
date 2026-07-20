import { sendAppointmentNotification } from "@/lib/email";

export type BookingStep = "idle" | "collect_contact" | "collect_service_datetime" | "awaiting_confirmation";

export type BookingState = {
  bookingStep: BookingStep;
  bookingData: Partial<{
    name: string;
    phone: string;
    email: string;
    service: string;
    appointmentDate: string;
    appointmentTime: string;
  }>;
  awaitingConfirmation: boolean;
};

export function parseAppointmentDate(input: string) {
  const value = input.trim();
  if (!value) throw new Error("Invalid appointment date");
  const lower = value.toLowerCase();
  const now = new Date();
  if (lower === "tomorrow") {
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    return next;
  }
  const nextWeekday = lower.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextWeekday) {
    const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
      nextWeekday[1]
    );
    const current = now.getDay();
    const daysAhead = ((target - current + 7) % 7) + 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysAhead);
    return next;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const monthMatch = value.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i
  );
  if (monthMatch) {
    const monthIndex = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].findIndex((month) => month.startsWith(monthMatch[1].slice(0, 3).toLowerCase()));
    const year = monthMatch[3] ? Number(monthMatch[3]) : now.getFullYear();
    return new Date(year, monthIndex, Number(monthMatch[2]));
  }
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    return new Date(year, month, day);
  }
  throw new Error("Invalid appointment date");
}

export function parseAppointmentTime(input: string) {
  const value = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!value) throw new Error("Invalid appointment time");
  const ampm = value.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (ampm) {
    let hour = Number(ampm[1]) % 12;
    if (ampm[3] === "PM") hour += 12;
    return `${hour.toString().padStart(2, "0")}:${(ampm[2] ?? "00").padStart(2, "0")}`;
  }
  const twentyFour = value.match(/^(\d{2}):(\d{2})$/);
  if (twentyFour) return `${twentyFour[1]}:${twentyFour[2]}`;
  throw new Error("Invalid appointment time");
}

const memory = new Map<string, BookingState>();

export function getBookingState(clientId: number, sessionId: string): BookingState {
  const key = `${clientId}:${sessionId}`;
  const current = memory.get(key);
  if (current) return current;
  const initial: BookingState = { bookingStep: "idle", bookingData: {}, awaitingConfirmation: false };
  memory.set(key, initial);
  return initial;
}

export function saveBookingState(clientId: number, sessionId: string, state: BookingState) {
  memory.set(`${clientId}:${sessionId}`, state);
}

export function resetBookingState(clientId: number, sessionId: string) {
  saveBookingState(clientId, sessionId, {
    bookingStep: "idle",
    bookingData: {},
    awaitingConfirmation: false,
  });
}

export async function createAppointmentAndNotify(clientId: number, clinicName: string, state: BookingState) {
  const { prisma } = await import("@/lib/prisma");
  const appointment = await prisma.appointment.create({
    data: {
      clientId,
      name: state.bookingData.name ?? "",
      phone: state.bookingData.phone ?? "",
      email: state.bookingData.email ?? "",
      service: state.bookingData.service ?? "",
      appointmentDate: parseAppointmentDate(state.bookingData.appointmentDate ?? new Date().toISOString()),
      appointmentTime: parseAppointmentTime(state.bookingData.appointmentTime ?? ""),
      status: "pending",
    },
  });
  await sendAppointmentNotification({
    clinicName,
    patientName: appointment.name,
    patientEmail: appointment.email,
    patientPhone: appointment.phone,
    service: appointment.service,
    appointmentDate: appointment.appointmentDate.toISOString().slice(0, 10),
    appointmentTime: appointment.appointmentTime,
  });
  return appointment;
}
