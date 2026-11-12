import { z } from "zod";
import { env } from "../config/env.js";
import {
  sendContactInquiryEmail,
  type ContactInquiryEmailInput,
} from "../utils/email.js";
import { logger } from "../utils/logger.js";

export const CONTACT_INQUIRY_TYPES = [
  "SCHOOL_REGISTRATION",
  "PRICING",
  "DEMO",
  "ATHLETE_SUPPORT",
  "PRIVACY_COMPLIANCE",
  "OTHER",
] as const;

export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];

export const CONTACT_INQUIRY_LABELS: Record<ContactInquiryType, string> = {
  SCHOOL_REGISTRATION: "School registration",
  PRICING: "Pricing",
  DEMO: "Demo request",
  ATHLETE_SUPPORT: "Athlete or parent support",
  PRIVACY_COMPLIANCE: "Privacy or compliance",
  OTHER: "General question",
};

export const contactInquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
  inquiryType: z.enum(CONTACT_INQUIRY_TYPES, {
    errorMap: () => ({ message: "Please select an inquiry type" }),
  }),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message cannot exceed 5,000 characters"),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export type SendContactEmail = (
  to: string,
  inquiry: ContactInquiryEmailInput
) => Promise<boolean>;

export interface ContactInquiryResult {
  recipient: string;
  delivered: boolean;
  inquiryType: ContactInquiryType;
}

/**
 * Every inquiry type is intentionally delivered to the same MVP 4.18 inbox.
 * The label is included in the email subject/body so the owner can triage it
 * without pretending the message was routed to a separate department.
 */
export function getContactInquiryInbox(): string {
  return env.CONTACT_INBOX_EMAIL || env.EMAIL_FROM;
}

export async function submitContactInquiry(
  input: ContactInquiryInput,
  sendEmail: SendContactEmail = sendContactInquiryEmail
): Promise<ContactInquiryResult> {
  const recipient = getContactInquiryInbox();
  const inquiryLabel = CONTACT_INQUIRY_LABELS[input.inquiryType];

  let delivered = false;

  try {
    delivered = await sendEmail(recipient, {
      name: input.name,
      email: input.email,
      inquiryLabel,
      message: input.message,
    });
  } catch (error) {
    logger.error("CONTACT", "Failed to deliver contact inquiry email.", error);
  }

  if (delivered) {
    logger.info(
      "CONTACT",
      `Contact inquiry delivered to inbox: ${input.inquiryType} from ${input.email}`
    );
  } else {
    logger.warn(
      "CONTACT",
      `Contact inquiry was not delivered: ${input.inquiryType} from ${input.email}`
    );
  }

  return {
    recipient,
    delivered,
    inquiryType: input.inquiryType,
  };
}
