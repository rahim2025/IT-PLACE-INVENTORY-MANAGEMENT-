import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Gmail app-password transport. Optional — if EMAIL_USER/APP_PASSWORD aren't
// set, sendEmail becomes a no-op instead of crashing whatever called it.
const transporter =
  env.email.user && env.email.appPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: env.email.user, pass: env.email.appPassword },
      })
    : null;

export async function sendEmail({ to, subject, text }) {
  if (!transporter) {
    console.warn(`Email not configured — skipped "${subject}" to ${to}`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.email.user, to, subject, text });
  } catch (err) {
    // Never let an email failure break the request that triggered it.
    console.error("Failed to send email:", err.message);
  }
}
