import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Sends a password reset link. Returns `false` when SMTP is not configured so
 * callers can still return a non-enumerating response to the client.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    logger.warn(
      "AUTH",
      "SMTP is not configured. Password reset email was not sent."
    );
    if (env.NODE_ENV === "development") {
      logger.info("AUTH", `Password reset link for ${to}: ${resetUrl}`);
    }
    return false;
  }

  await client.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your password",
    text: [
      "We received a request to reset the password for your account.",
      "",
      `Reset your password using this link (valid for 1 hour): ${resetUrl}`,
      "",
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a request to reset the password for your account.</p>
      <p>
        <a href="${resetUrl}">Reset your password</a>
        (valid for 1 hour)
      </p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    `,
  });

  return true;
}
