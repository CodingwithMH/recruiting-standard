export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mvp418.recruiting@gmail.com";

export const CONTACT_RESPONSE_TIME = "We aim to respond within 1–2 business days.";

export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;

export const INQUIRY_OPTIONS = [
  { value: "SCHOOL_REGISTRATION", label: "School registration" },
  { value: "PRICING", label: "Pricing and plans" },
  { value: "DEMO", label: "Request a demo" },
  { value: "ATHLETE_SUPPORT", label: "Athlete or parent support" },
  { value: "PRIVACY_COMPLIANCE", label: "Privacy or compliance" },
  { value: "OTHER", label: "Something else" },
] as const;

export type InquiryType = (typeof INQUIRY_OPTIONS)[number]["value"];

export function getInquiryLabel(value: string): string {
  return INQUIRY_OPTIONS.find((option) => option.value === value)?.label ?? "General question";
}
