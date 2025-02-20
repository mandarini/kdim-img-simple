export const config = {
  // Set to true to use real Supabase auth, false for mock auth
  useRealAuth: false,
  
  // Mock user data (used when useRealAuth is false)
  mockUser: {
    id: 'mock-user-id',
    email: 'mock@example.com'
  }
} as const;