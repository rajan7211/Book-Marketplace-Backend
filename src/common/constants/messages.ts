/**
 * Centralized, human-readable response messages.
 * Every controller/service references these — no inline strings.
 */
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
    EMAIL_AVAILABLE: 'Email is available',
    INVALID_TOKEN: 'Invalid or expired token',
    ACCOUNT_DISABLED: 'This account has been disabled',
  },

  SELLER: {
    PENDING: 'Your seller account is pending admin approval',
    APPROVED: 'Seller approved successfully',
    REJECTED: 'Seller rejected successfully',
    NOT_APPROVED: 'Your seller account must be approved to perform this action',
  },

  BOOK: {
    CREATED: 'Book submitted for approval',
    DUPLICATE_ISBN: 'A book with this ISBN already exists',
    APPROVED: 'Book approved successfully',
    REJECTED: 'Book rejected successfully',
    NOT_APPROVED: 'This book is pending approval and cannot be listed yet',
  },

  LISTING: {
    CREATED: 'Listing created successfully',
    DUPLICATE: 'You already have a listing for this book. Update it instead',
    NOT_OWNER: "You cannot modify another seller's listing",
    NEGATIVE_STOCK: 'Stock cannot be negative',
    INVALID_PRICE: 'Price must be greater than zero',
  },

  CART: {
    ITEM_ADDED: 'Item added to cart',
    ITEM_REMOVED: 'Item removed from cart',
    CLEARED: 'Cart cleared',
    INSUFFICIENT_STOCK: 'Requested quantity exceeds available stock',
    EMPTY: 'Your cart is empty',
  },

  ORDER: {
    PLACED: 'Order placed successfully',
    INSUFFICIENT_STOCK: 'Insufficient stock for one or more items',
    NOT_OWNER: 'This order belongs to another account',
    INVALID_TRANSITION: 'This order status change is not allowed',
    STATUS_UPDATED: 'Order status updated',
  },

  REVIEW: {
    CREATED: 'Review submitted',
    ALREADY_REVIEWED: 'You have already reviewed this book',
  },
} as const;


