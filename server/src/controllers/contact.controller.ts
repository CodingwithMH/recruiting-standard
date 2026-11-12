import { Request, Response, NextFunction } from "express";
import {
  contactInquirySchema,
  submitContactInquiry,
} from "../services/contact.service.js";

/**
 * POST /api/v1/contact
 * Public contact-form endpoint. All inquiry types are delivered to the
 * configured MVP 4.18 inbox and the visitor receives a clear confirmation.
 */
export async function handleContactInquiry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = contactInquirySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed. Please verify all required fields.",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await submitContactInquiry(parsed.data);

    if (!result.delivered) {
      res.status(503).json({
        success: false,
        error: `We could not deliver your message right now. Please email ${result.recipient} directly.`,
        data: { recipient: result.recipient },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(201).json({
      success: true,
      message:
        "Your message has been received. We aim to respond within 1–2 business days.",
      data: {
        recipient: result.recipient,
        inquiryType: result.inquiryType,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
