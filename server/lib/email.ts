import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not configured");
    resend = new Resend(key);
  }
  return resend;
}

export async function sendInviteEmail(params: {
  to: string;
  inviteeName: string;
  dealershipName: string;
  inviteUrl: string;
}) {
  const r = getResend();
  return r.emails.send({
    from: "Quantum Connect AI <noreply@automotivesales.ai>",
    to: params.to,
    subject: `You've been invited to join ${params.dealershipName} on Quantum Connect AI`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0A0A0B; padding: 40px 20px; color: #FAFAFA;">
        <div style="max-width: 500px; margin: 0 auto; background: #111113; border-radius: 12px; padding: 32px; border: 1px solid #27272A;">
          <h1 style="margin: 0 0 8px; font-size: 24px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Quantum Connect AI
          </h1>
          <p style="color: #A1A1AA; margin: 0 0 24px;">You're invited to join the team</p>
          <p style="margin: 0 0 16px;">Hi ${params.inviteeName},</p>
          <p style="margin: 0 0 24px; color: #A1A1AA;">
            <strong style="color: #FAFAFA;">${params.dealershipName}</strong> has invited you to join their sales team on Quantum Connect AI.
          </p>
          <a href="${params.inviteUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Accept Invitation
          </a>
          <p style="margin: 24px 0 0; color: #71717A; font-size: 13px;">
            This invite expires in 7 days. If you didn't expect this, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendAlertEmail(params: {
  to: string;
  subject: string;
  body: string;
}) {
  const r = getResend();
  return r.emails.send({
    from: "Quantum Connect AI <alerts@automotivesales.ai>",
    to: params.to,
    subject: params.subject,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0A0A0B; padding: 40px 20px; color: #FAFAFA;">
        <div style="max-width: 500px; margin: 0 auto; background: #111113; border-radius: 12px; padding: 32px; border: 1px solid #27272A;">
          <h2 style="margin: 0 0 16px; color: #FAFAFA;">${params.subject}</h2>
          <div style="color: #A1A1AA;">${params.body}</div>
        </div>
      </div>
    `,
  });
}
