import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Recruiting Standard | Build your next chapter",
    template: "%s | The Recruiting Standard",
  },
  description:
    "A clearer path from athletic potential to the right school. Connect student-athletes and school programs.",
};

// Navigation and Footer live in app/(public)/layout.tsx.
// This root layout is intentionally minimal — just the html/body shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
