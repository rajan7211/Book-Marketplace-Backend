/**
 * Reset-password email template.
 * Sent when a user requests to reset their forgotten password.
 *
 * Uses the same OTP pattern as registration — the user enters the code
 * on the reset-password page and then sets a new password.
 */
export function buildResetPasswordEmail(firstName: string, otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hi ${firstName},</h2>
      <p>We received a request to reset your Book Marketplace password.</p>
      <p>Use this code to set a new password:</p>
      <div style="
        background: #f4f4f4;
        padding: 20px;
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        color: #2c3e50;
        margin: 20px 0;
      ">
        ${otp}
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color: #c0392b;">
        If you didn't request this, please secure your account immediately —
        someone may be trying to access it.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #888; font-size: 12px;">Book Marketplace Team</p>
    </div>
  `;
}
