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

/**
 * Invites a newly added school staff member to set their password and access
 * the institution's recruiting portal.
 */
export async function sendSchoolMemberInvitationEmail(
  to: string,
  schoolName: string,
  setupUrl: string
): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    logger.warn(
      "AUTH",
      "SMTP is not configured. School member invitation email was not sent."
    );
    return false;
  }

  const safeSchoolName = schoolName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  await client.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `You have been invited to ${schoolName} on The Recruiting Standard`,
    text: [
      `You have been added to ${schoolName} on The Recruiting Standard.`,
      "",
      `Set your password to activate your account (link valid for 1 hour): ${setupUrl}`,
      "",
      "If you were not expecting this invitation, please contact your school administrator.",
    ].join("\n"),
    html: `
      <p>You have been added to <strong>${safeSchoolName}</strong> on The Recruiting Standard.</p>
      <p><a href="${setupUrl}">Set your password and activate your account</a> (link valid for 1 hour).</p>
      <p>If you were not expecting this invitation, please contact your school administrator.</p>
    `,
  });

  return true;
}

/**
 * Notifies an athlete that a parent/guardian has requested access to their
 * account. The athlete must approve the request before any access is granted.
 */
export async function sendGuardianLinkRequestEmail(
  to: string,
  parentName: string,
  athleteFirstName: string
): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    logger.warn(
      "AUTH",
      "SMTP is not configured. Guardian link request email was not sent."
    );
    return false;
  }

  const portalUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/portal/athlete`;

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const safeParentName = escapeHtml(parentName);
  const safeAthleteFirstName = escapeHtml(athleteFirstName);

  await client.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "New guardian link request",
    text: [
      `Hi ${athleteFirstName},`,
      "",
      `${parentName} has requested permission to link to your recruiting account.`,
      "",
      "No access has been granted yet. Sign in to your athlete portal to approve or reject the request:",
      portalUrl,
      "",
      "If you do not recognize this person, reject the request and contact support.",
    ].join("\n"),
    html: `
      <p>Hi ${safeAthleteFirstName},</p>
      <p><strong>${safeParentName}</strong> has requested permission to link to your recruiting account.</p>
      <p>No access has been granted yet. Sign in to your athlete portal to approve or reject the request:</p>
      <p><a href="${portalUrl}">Review guardian link request</a></p>
      <p>If you do not recognize this person, reject the request and contact support.</p>
    `,
  });

  return true;
}

/**
 * Sends a confirmation that a school registration was received and is awaiting
 * Platform Admin review. Never blocks registration when email is unavailable.
 */
export async function sendSchoolRegistrationEmail(
  to: string,
  schoolName: string
): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    logger.warn(
      "AUTH",
      "SMTP is not configured. School registration confirmation email was not sent."
    );
    return false;
  }

  const safeSchoolName = schoolName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  await client.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "School registration received",
    text: [
      `Thank you for registering ${schoolName} with The Recruiting Standard.`,
      "",
      "Your registration is currently Pending review by Platform Administration.",
      "Once approved, your permanent School ID will be issued and portal access will unlock.",
      "",
      "If you did not submit this registration, please contact support.",
    ].join("\n"),
    html: `
      <p>Thank you for registering <strong>${safeSchoolName}</strong> with The Recruiting Standard.</p>
      <p>Your registration is currently <strong>Pending</strong> review by Platform Administration.</p>
      <p>Once approved, your permanent School ID will be issued and portal access will unlock.</p>
      <p>If you did not submit this registration, please contact support.</p>
    `,
  });

  return true;
}
