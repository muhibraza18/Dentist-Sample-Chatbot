import { Resend } from "resend";

function clinicOwnerEmail() {
  return process.env.CLINIC_OWNER_EMAIL ?? "owner@example.com";
}

function fromEmail() {
  return process.env.EMAIL_FROM ?? "Dental Receptionist <onboarding@resend.dev>";
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function sendLeadNotification(payload: {
  clinicName: string;
  name: string;
  email: string;
  phone: string;
  serviceRequested: string;
}) {
  const resend = getResendClient();
  if (!resend) return { skipped: true };
  return resend.emails.send({
    from: fromEmail(),
    to: [clinicOwnerEmail()],
    subject: `New lead for ${payload.clinicName}`,
    html: `
      <h2>New Lead</h2>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Phone:</strong> ${payload.phone}</p>
      <p><strong>Service:</strong> ${payload.serviceRequested}</p>
    `,
  });
}

export async function sendAppointmentNotification(payload: {
  clinicName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const resend = getResendClient();
  if (!resend) return { skipped: true };
  return resend.emails.send({
    from: fromEmail(),
    to: [clinicOwnerEmail()],
    subject: `New appointment request for ${payload.clinicName}`,
    html: `
      <h2>New Appointment Request</h2>
      <p><strong>Patient:</strong> ${payload.patientName}</p>
      <p><strong>Email:</strong> ${payload.patientEmail}</p>
      <p><strong>Phone:</strong> ${payload.patientPhone}</p>
      <p><strong>Service:</strong> ${payload.service}</p>
      <p><strong>Date:</strong> ${payload.appointmentDate}</p>
      <p><strong>Time:</strong> ${payload.appointmentTime}</p>
    `,
  });
}

