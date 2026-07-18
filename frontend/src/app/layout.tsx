import "./globals.css";

export const metadata = {
  title: "Dental AI Receptionist",
  description: "Multi-tenant AI receptionist for dental clinics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
