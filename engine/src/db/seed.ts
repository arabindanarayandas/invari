import { db } from './index';
import { users, agents, apiSchemas } from './schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SEED_PASSWORD = 'flux@1234';

// Helper to create comprehensive OpenAPI specs with many endpoints
const createPaymentSpec = () => ({
  openapi: '3.0.0',
  info: {
    title: 'Payment Gateway API',
    version: '2.1.0',
    description: 'Comprehensive payment processing platform with support for multiple payment methods, subscriptions, and fraud detection'
  },
  paths: {
    '/api/payments': {
      post: { summary: 'Create Payment', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' }, currency: { type: 'string', default: 'USD' }, userId: { type: 'string' }, method: { type: 'string', enum: ['card', 'bank', 'wallet'] } }, required: ['amount', 'userId', 'method'] } } } }, responses: { '200': { description: 'Payment successful' } } },
      get: { summary: 'List Payments', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Payment list' } } }
    },
    '/api/payments/{id}': {
      get: { summary: 'Get Payment Details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment details' } } },
      patch: { summary: 'Update Payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } } } } }, responses: { '200': { description: 'Payment updated' } } }
    },
    '/api/payments/{id}/refund': {
      post: { summary: 'Refund Payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' }, reason: { type: 'string' } }, required: ['amount'] } } } }, responses: { '200': { description: 'Refund processed' } } }
    },
    '/api/payments/{id}/capture': {
      post: { summary: 'Capture Authorized Payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment captured' } } }
    },
    '/api/payments/{id}/cancel': {
      post: { summary: 'Cancel Payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment cancelled' } } }
    },
    '/api/subscriptions': {
      post: { summary: 'Create Subscription', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, planId: { type: 'string' }, billingCycle: { type: 'string', enum: ['monthly', 'yearly'] } }, required: ['userId', 'planId'] } } } }, responses: { '201': { description: 'Subscription created' } } },
      get: { summary: 'List Subscriptions', responses: { '200': { description: 'Subscription list' } } }
    },
    '/api/subscriptions/{id}': {
      get: { summary: 'Get Subscription', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Subscription details' } } },
      patch: { summary: 'Update Subscription', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Subscription updated' } } },
      delete: { summary: 'Cancel Subscription', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Subscription cancelled' } } }
    },
    '/api/payment-methods': {
      post: { summary: 'Add Payment Method', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, type: { type: 'string' }, token: { type: 'string' } }, required: ['userId', 'type', 'token'] } } } }, responses: { '201': { description: 'Payment method added' } } },
      get: { summary: 'List Payment Methods', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Payment methods' } } }
    },
    '/api/payment-methods/{id}': {
      delete: { summary: 'Remove Payment Method', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Payment method removed' } } }
    },
    '/api/invoices': {
      get: { summary: 'List Invoices', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Invoice list' } } }
    },
    '/api/invoices/{id}': {
      get: { summary: 'Get Invoice', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Invoice details' } } }
    },
    '/api/invoices/{id}/pay': {
      post: { summary: 'Pay Invoice', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { paymentMethodId: { type: 'string' } }, required: ['paymentMethodId'] } } } }, responses: { '200': { description: 'Invoice paid' } } }
    },
    '/api/disputes': {
      get: { summary: 'List Disputes', responses: { '200': { description: 'Dispute list' } } }
    },
    '/api/disputes/{id}': {
      get: { summary: 'Get Dispute', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Dispute details' } } }
    },
    '/api/disputes/{id}/respond': {
      post: { summary: 'Respond to Dispute', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { evidence: { type: 'string' } }, required: ['evidence'] } } } }, responses: { '200': { description: 'Response submitted' } } }
    },
    '/api/webhooks': {
      post: { summary: 'Register Webhook', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, events: { type: 'array', items: { type: 'string' } } }, required: ['url', 'events'] } } } }, responses: { '201': { description: 'Webhook registered' } } },
      get: { summary: 'List Webhooks', responses: { '200': { description: 'Webhook list' } } }
    },
    '/api/webhooks/{id}': {
      delete: { summary: 'Delete Webhook', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Webhook deleted' } } }
    },
    '/api/balance': {
      get: { summary: 'Get Account Balance', responses: { '200': { description: 'Balance details' } } }
    },
    '/api/payouts': {
      post: { summary: 'Create Payout', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' }, currency: { type: 'string' }, destination: { type: 'string' } }, required: ['amount', 'destination'] } } } }, responses: { '201': { description: 'Payout created' } } },
      get: { summary: 'List Payouts', responses: { '200': { description: 'Payout list' } } }
    },
    '/api/fraud/check': {
      post: { summary: 'Check for Fraud', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { paymentId: { type: 'string' } }, required: ['paymentId'] } } } }, responses: { '200': { description: 'Fraud check result' } } }
    },
    '/api/reports/transactions': {
      get: { summary: 'Transaction Report', parameters: [{ name: 'startDate', in: 'query', schema: { type: 'string' } }, { name: 'endDate', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Transaction report' } } }
    }
  }
});

const createEcommerceSpec = () => ({
  openapi: '3.0.0',
  info: {
    title: 'E-Commerce Platform API',
    version: '3.2.0',
    description: 'Complete e-commerce solution with product catalog, inventory, orders, and customer management'
  },
  paths: {
    '/api/products': {
      get: { summary: 'List Products', parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }], responses: { '200': { description: 'Product list' } } },
      post: { summary: 'Create Product', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, stock: { type: 'integer' }, category: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'price', 'stock'] } } } }, responses: { '201': { description: 'Product created' } } }
    },
    '/api/products/{id}': {
      get: { summary: 'Get Product', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product details' } } },
      put: { summary: 'Update Product', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product updated' } } },
      delete: { summary: 'Delete Product', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product deleted' } } }
    },
    '/api/products/{id}/variants': {
      get: { summary: 'Get Product Variants', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product variants' } } },
      post: { summary: 'Add Product Variant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Variant added' } } }
    },
    '/api/products/{id}/reviews': {
      get: { summary: 'Get Product Reviews', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product reviews' } } },
      post: { summary: 'Add Review', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'integer' }, comment: { type: 'string' }, userId: { type: 'string' } }, required: ['rating', 'userId'] } } } }, responses: { '201': { description: 'Review added' } } }
    },
    '/api/categories': {
      get: { summary: 'List Categories', responses: { '200': { description: 'Category list' } } },
      post: { summary: 'Create Category', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name'] } } } }, responses: { '201': { description: 'Category created' } } }
    },
    '/api/categories/{id}': {
      get: { summary: 'Get Category', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category details' } } },
      put: { summary: 'Update Category', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category updated' } } },
      delete: { summary: 'Delete Category', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category deleted' } } }
    },
    '/api/cart': {
      get: { summary: 'Get Cart', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Cart contents' } } },
      post: { summary: 'Add to Cart', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, productId: { type: 'string' }, quantity: { type: 'integer' } }, required: ['userId', 'productId', 'quantity'] } } } }, responses: { '200': { description: 'Item added to cart' } } }
    },
    '/api/cart/{itemId}': {
      patch: { summary: 'Update Cart Item', parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } }, required: ['quantity'] } } } }, responses: { '200': { description: 'Cart item updated' } } },
      delete: { summary: 'Remove from Cart', parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Item removed from cart' } } }
    },
    '/api/orders': {
      post: { summary: 'Create Order', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, items: { type: 'array' }, shippingAddress: { type: 'object' }, paymentMethod: { type: 'string' } }, required: ['userId', 'items'] } } } }, responses: { '201': { description: 'Order created' } } },
      get: { summary: 'List Orders', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Order list' } } }
    },
    '/api/orders/{id}': {
      get: { summary: 'Get Order', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order details' } } },
      patch: { summary: 'Update Order Status', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } } }, responses: { '200': { description: 'Order updated' } } }
    },
    '/api/orders/{id}/cancel': {
      post: { summary: 'Cancel Order', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order cancelled' } } }
    },
    '/api/orders/{id}/track': {
      get: { summary: 'Track Order', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Tracking info' } } }
    },
    '/api/customers': {
      get: { summary: 'List Customers', responses: { '200': { description: 'Customer list' } } },
      post: { summary: 'Create Customer', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' } }, required: ['email', 'name'] } } } }, responses: { '201': { description: 'Customer created' } } }
    },
    '/api/customers/{id}': {
      get: { summary: 'Get Customer', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Customer details' } } },
      put: { summary: 'Update Customer', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Customer updated' } } }
    },
    '/api/customers/{id}/addresses': {
      get: { summary: 'Get Customer Addresses', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Address list' } } },
      post: { summary: 'Add Address', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Address added' } } }
    },
    '/api/inventory/{productId}': {
      get: { summary: 'Get Inventory', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Inventory details' } } },
      patch: { summary: 'Update Inventory', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } }, required: ['quantity'] } } } }, responses: { '200': { description: 'Inventory updated' } } }
    },
    '/api/wishlist': {
      get: { summary: 'Get Wishlist', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Wishlist items' } } },
      post: { summary: 'Add to Wishlist', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, productId: { type: 'string' } }, required: ['userId', 'productId'] } } } }, responses: { '200': { description: 'Item added to wishlist' } } }
    },
    '/api/wishlist/{itemId}': {
      delete: { summary: 'Remove from Wishlist', parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Item removed' } } }
    },
    '/api/coupons': {
      get: { summary: 'List Coupons', responses: { '200': { description: 'Coupon list' } } },
      post: { summary: 'Create Coupon', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, discount: { type: 'number' }, type: { type: 'string' } }, required: ['code', 'discount'] } } } }, responses: { '201': { description: 'Coupon created' } } }
    },
    '/api/coupons/validate': {
      post: { summary: 'Validate Coupon', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } } } }, responses: { '200': { description: 'Coupon validation result' } } }
    },
    '/api/shipping/rates': {
      post: { summary: 'Calculate Shipping', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { destination: { type: 'object' }, items: { type: 'array' } }, required: ['destination'] } } } }, responses: { '200': { description: 'Shipping rates' } } }
    },
    '/api/search': {
      get: { summary: 'Search Products', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'category', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Search results' } } }
    }
  }
});

// Create more specs with 10-50 endpoints each...
const createSocialSpec = () => ({
  openapi: '3.0.0',
  info: {
    title: 'Social Media Platform API',
    version: '4.0.0',
    description: 'Full-featured social networking platform with posts, comments, messaging, and user connections'
  },
  paths: {
    '/api/users/{id}': { get: { summary: 'Get User Profile', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User profile' } } }, patch: { summary: 'Update Profile', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Profile updated' } } } },
    '/api/users/{id}/follow': { post: { summary: 'Follow User', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Followed' } } } },
    '/api/users/{id}/unfollow': { post: { summary: 'Unfollow User', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Unfollowed' } } } },
    '/api/users/{id}/followers': { get: { summary: 'Get Followers', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Follower list' } } } },
    '/api/users/{id}/following': { get: { summary: 'Get Following', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Following list' } } } },
    '/api/posts': { get: { summary: 'Get Feed', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Post feed' } } }, post: { summary: 'Create Post', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, content: { type: 'string' }, mediaUrls: { type: 'array' }, visibility: { type: 'string' } }, required: ['userId', 'content'] } } } }, responses: { '201': { description: 'Post created' } } } },
    '/api/posts/{id}': { get: { summary: 'Get Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post details' } } }, patch: { summary: 'Update Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post updated' } } }, delete: { summary: 'Delete Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post deleted' } } } },
    '/api/posts/{id}/like': { post: { summary: 'Like Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post liked' } } } },
    '/api/posts/{id}/unlike': { post: { summary: 'Unlike Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post unliked' } } } },
    '/api/posts/{id}/share': { post: { summary: 'Share Post', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Post shared' } } } },
    '/api/posts/{id}/comments': { get: { summary: 'Get Comments', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comment list' } } }, post: { summary: 'Add Comment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' }, text: { type: 'string' } }, required: ['userId', 'text'] } } } }, responses: { '201': { description: 'Comment added' } } } },
    '/api/comments/{id}': { patch: { summary: 'Update Comment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comment updated' } } }, delete: { summary: 'Delete Comment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comment deleted' } } } },
    '/api/messages': { get: { summary: 'Get Conversations', responses: { '200': { description: 'Conversation list' } } }, post: { summary: 'Send Message', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { recipientId: { type: 'string' }, content: { type: 'string' } }, required: ['recipientId', 'content'] } } } }, responses: { '201': { description: 'Message sent' } } } },
    '/api/messages/{conversationId}': { get: { summary: 'Get Messages', parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Message list' } } } },
    '/api/notifications': { get: { summary: 'Get Notifications', responses: { '200': { description: 'Notification list' } } } },
    '/api/notifications/{id}/read': { post: { summary: 'Mark as Read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Marked as read' } } } },
    '/api/search/users': { get: { summary: 'Search Users', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Search results' } } } },
    '/api/search/posts': { get: { summary: 'Search Posts', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Search results' } } } },
    '/api/groups': { get: { summary: 'List Groups', responses: { '200': { description: 'Group list' } } }, post: { summary: 'Create Group', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name'] } } } }, responses: { '201': { description: 'Group created' } } } },
    '/api/groups/{id}': { get: { summary: 'Get Group', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Group details' } } } },
    '/api/groups/{id}/join': { post: { summary: 'Join Group', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Joined group' } } } },
    '/api/groups/{id}/leave': { post: { summary: 'Leave Group', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Left group' } } } },
    '/api/groups/{id}/members': { get: { summary: 'Get Group Members', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Member list' } } } },
    '/api/trending': { get: { summary: 'Get Trending Topics', responses: { '200': { description: 'Trending topics' } } } },
    '/api/hashtags/{tag}': { get: { summary: 'Get Posts by Hashtag', parameters: [{ name: 'tag', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Tagged posts' } } } }
  }
});

// Fake server URL - all agents will use this for testing
const FAKE_SERVER_URL = 'http://localhost:3000/api/fake-server';

// Seed users with their agents
const seedUsers = [
  {
    email: 'alice@fluxguard.dev',
    name: 'Alice Johnson',
    agents: [
      { name: 'Payment Gateway', spec: createPaymentSpec(), url: FAKE_SERVER_URL },
      { name: 'E-Commerce Platform', spec: createEcommerceSpec(), url: FAKE_SERVER_URL },
      { name: 'Social Network', spec: createSocialSpec(), url: FAKE_SERVER_URL }
    ]
  },
  {
    email: 'bob@fluxguard.dev',
    name: 'Bob Smith',
    agents: [
      { name: 'Payment Processor', spec: createPaymentSpec(), url: FAKE_SERVER_URL },
      { name: 'Online Store', spec: createEcommerceSpec(), url: FAKE_SERVER_URL }
    ]
  },
  {
    email: 'charlie@fluxguard.dev',
    name: 'Charlie Davis',
    agents: [
      { name: 'Marketplace API', spec: createEcommerceSpec(), url: FAKE_SERVER_URL },
      { name: 'Community Platform', spec: createSocialSpec(), url: FAKE_SERVER_URL },
      { name: 'Billing System', spec: createPaymentSpec(), url: FAKE_SERVER_URL }
    ]
  },
  {
    email: 'diana@fluxguard.dev',
    name: 'Diana Martinez',
    agents: [
      { name: 'Social Hub', spec: createSocialSpec(), url: FAKE_SERVER_URL },
      { name: 'Shopping Cart', spec: createEcommerceSpec(), url: FAKE_SERVER_URL }
    ]
  },
  {
    email: 'eve@fluxguard.dev',
    name: 'Eve Wilson',
    agents: [
      { name: 'Checkout API', spec: createPaymentSpec(), url: FAKE_SERVER_URL },
      { name: 'Product Catalog', spec: createEcommerceSpec(), url: FAKE_SERVER_URL },
      { name: 'Messaging Platform', spec: createSocialSpec(), url: FAKE_SERVER_URL }
    ]
  }
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await db.delete(apiSchemas);
  await db.delete(agents);
  await db.delete(users);
  console.log('   ✓ Database cleared\n');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const userData of seedUsers) {
    console.log(`👤 Creating user: ${userData.email}`);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
      })
      .returning();

    console.log(`   ✓ User created: ${user.id}`);

    // Create agents for this user
    for (const projectData of userData.agents) {
      const invariApiKey = crypto.randomBytes(32).toString('hex');

      const [project] = await db
        .insert(agents)
        .values({
          userId: user.id,
          name: projectData.name,
          targetBaseUrl: projectData.url,
          invariApiKey,
        })
        .returning();

      const endpointCount = Object.keys(projectData.spec.paths).length;
      console.log(`   📦 Project created: ${projectData.name} (${endpointCount} endpoints)`);

      // Create API schema for this project
      await db.insert(apiSchemas).values({
        agentId: project.id,
        version: projectData.spec.info.version,
        schemaSpec: projectData.spec,
        isActive: true,
      });

      console.log(`   ✓ Schema uploaded for ${projectData.name}`);
    }

    console.log('');
  }

  console.log('✅ Seed completed successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                   SEED USER CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Password for ALL users: flux@1234');
  console.log('');
  console.log('User Emails:');
  seedUsers.forEach((user, idx) => {
    console.log(`  ${idx + 1}. ${user.email} (${user.agents.length} agents)`);
  });
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

seed()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
