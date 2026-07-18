export type Client = {
  id: number;
  clinic_name: string;
  slug: string;
  email: string;
  phone: string;
};

export type Lead = {
  id: number;
  client_id: number;
  name: string;
  email: string;
  phone: string;
  service_requested: string;
};

export type Appointment = {
  id: number;
  client_id: number;
  name: string;
  phone: string;
  email: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at?: string;
};

export type Conversation = {
  id: number;
  client_id: number;
  session_id: string;
  message: string;
  role: string;
  created_at?: string;
};

export type KnowledgeDocument = {
  id: number;
  client_id: number;
  content: string;
  embedding: number[];
};
