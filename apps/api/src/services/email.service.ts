import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

async function send(to: string, subject: string, html: string) {
  if (!env.SMTP_HOST || env.SMTP_HOST === 'smtp.mailtrap.io' && !env.SMTP_USER?.match(/^[a-f0-9]+$/)) {
    logger.info(`[Email] Would send to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
    logger.info(`[Email] Sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('[Email] Failed to send:', err);
  }
}

export const emailService = {
  async sendWelcome(to: string, name: string) {
    await send(
      to,
      'Welcome to FlowDesk!',
      `<h2>Welcome, ${name || 'there'}!</h2>
       <p>Your FlowDesk account is ready. Start collaborating with your team at <a href="${env.CLIENT_URL}">${env.CLIENT_URL}</a>.</p>`
    );
  },

  async sendTaskAssigned(to: string, assigneeName: string, taskTitle: string, taskUrl: string) {
    await send(
      to,
      `You've been assigned: ${taskTitle}`,
      `<h3>Hi ${assigneeName},</h3>
       <p>You've been assigned a new task: <strong>${taskTitle}</strong></p>
       <a href="${taskUrl}" style="background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">View Task</a>`
    );
  },

  async sendInvite(to: string, workspaceName: string, inviterName: string, inviteUrl: string) {
    await send(
      to,
      `${inviterName} invited you to ${workspaceName} on FlowDesk`,
      `<h3>You're invited!</h3>
       <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on FlowDesk.</p>
       <a href="${inviteUrl}" style="background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Accept Invite</a>`
    );
  },
};
