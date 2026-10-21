import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // Obligatorio para que drizzle-kit genere drizzle/migrations.js
  driver: 'expo',
} satisfies Config;
