import dotenv from 'dotenv';
dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  llmProvider: process.env.LLM_PROVIDER || 'gemini',
  llmModel: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  opencodeApiKey: process.env.OPENCODE_API_KEY || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // IAM Configuration
  jwtSecret: process.env.JWT_SECRET || '',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),
};

// Validate critical config at startup
if (!config.jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
}
