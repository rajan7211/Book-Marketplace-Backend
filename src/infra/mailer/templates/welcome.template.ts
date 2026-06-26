/**
 * Welcome email template.
 * Sent right AFTER the user successfully verifies their OTP and
 * their account is created.
 *
 * Inputs:
 *   - firstName: the user's name
 *   - role:      'CUSTOMER' or 'SELLER' (so we can tailor the message)
 */
export function buildWelcomeEmail(
  firstName: string,
  role: 'CUSTOMER' | 'SELLER',
): string {
  const isSeller = role === 'SELLER';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome, ${firstName}!</h2>
      <p>Your Book Marketplace account is ready.</p>
      ${
        isSeller
          ? `
            <p><strong>What's next:</strong></p>
            <ul>
              <li>Your seller account is now <strong>pending admin approval</strong>.</li>
              <li>You'll receive an email once an admin reviews your application.</li>
              <li>After approval you can list books and start selling.</li>
            </ul>
          `
          : `
            <p><strong>You can now:</strong></p>
            <ul>
              <li>Browse thousands of books</li>
              <li>Save favourites to your wishlist</li>
              <li>Order from multiple sellers in one checkout</li>
            </ul>
          `
      }
      <p>Happy reading!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #888; font-size: 12px;">Book Marketplace Team</p>
    </div>
  `;
}
