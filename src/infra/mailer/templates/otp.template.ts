/**
 * OTP email template.
 *
 * Returns HTML that gets sent as the email body.
 * Used for: registration verification, forgot-password reset.
 *
 * Inputs:
 *   - firstName: the user's name (for personalization)
 *   - otp:      the 6-digit code (as STRING — leading zeros must survive)
 *
 * Output: HTML string with inline styles.
 *
 * Why inline styles? Many email clients (Gmail mobile, Outlook desktop)
 * strip <style> blocks. Inline styles are the only universally safe
 * approach for HTML emails.
 */
export function buildOtpEmail(firstName: string, otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hi ${firstName},</h2>
      <p>Your verification code is:</p>
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
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #888; font-size: 12px;">Book Marketplace Team</p>
    </div>
  `;
}
