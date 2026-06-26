export const MESSAGES = {
  COMMON: {
    OK: 'Success',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    NOT_FOUND: 'Resource not found',
    FORBIDDEN: 'You do not have permission to perform this action',
    UNAUTHORIZED: 'Authentication required',
    INTERNAL_ERROR: 'Something went wrong. Please try again later',
  },

  VALIDATION: {
    FAILED: 'Validation failed',
    INVALID_ID: 'Invalid identifier format',
  },

  AUTH: {
    REGISTERED: 'Registration successful',
    LOGGED_IN: 'Login successful',
    LOGGED_OUT: 'Logged out successfully',
    TOKEN_REFRESHED: 'Token refreshed',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_TAKEN: 'Email already registered. Please login instead',
    INVALID_TOKEN: 'Invalid or expired token',
    ACCOUNT_DISABLED: 'This account has been disabled',
  },

  SELLER: {
    APPROVED: 'Seller approved successfully',
    REJECTED: 'Seller rejected successfully',
    NOT_APPROVED: 'Your seller account must be approved to perform this action',
    PENDING_LOGIN:
      'Your seller account is pending admin approval. Please wait until an administrator approves your account.',
    REJECTED_LOGIN:
      'Your seller account has been rejected. Please contact support for assistance.',
  },

  BOOK: {
    CREATED: 'Book submitted for approval',
    DUPLICATE_ISBN: 'A book with this ISBN already exists',
    APPROVED: 'Book approved successfully',
    REJECTED: 'Book rejected successfully',
  },

  CART: {
    ITEM_ADDED: 'Item added to cart',
    ITEM_REMOVED: 'Item removed from cart',
    CLEARED: 'Cart cleared',
    EMPTY: 'Your cart is empty',
  },

  ORDER: {
    PLACED: 'Order placed successfully',
    STATUS_UPDATED: 'Order status updated',
  },
} as const;
