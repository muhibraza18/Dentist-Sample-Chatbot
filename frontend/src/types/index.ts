export type Client = {
  id: number;
  clientSlug: string;
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
};

export type Lead = {
  id: number;
  clientId: number;
  name: string;
  email: string;
  phone: string;
  serviceRequested: string;
  createdAt?: string;
};

export type Appointment = {
  id: number;
  clientId: number;
  name: string;
  phone: string;
  email: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  createdAt?: string;
};

export type Conversation = {
  id: number;
  clientId: number;
  sessionId: string;
  message: string;
  role: "user" | "assistant" | "system";
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type KnowledgeDocument = {
  id: number;
  clientId: number;
  fileName?: string | null;
  content: string;
  embedding: number[];
  sourceType: string;
  createdAt?: string;
};

export type ChatRequest = {
  clientSlug: string;
  sessionId: string;
  message: string;
};

export type ChatResponse = {
  reply: string;
  sessionId: string;
  bookingState?: BookingStateSnapshot;
};

export type BookingStateSnapshot = {
  bookingStep: "idle" | "collect_contact" | "collect_service_datetime" | "awaiting_confirmation";
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

