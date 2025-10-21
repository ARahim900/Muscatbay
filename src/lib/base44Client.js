import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client - authentication disabled for development
export const base44 = createClient({
  appId: "68ab9ed97412dcfe330813a6",
  requiresAuth: false // Changed to false to prevent auth redirect loop
});
