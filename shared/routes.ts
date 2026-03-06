import { z } from 'zod';
import { insertVerseSchema, verses, generateRequestSchema, generateResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  verses: {
    getDaily: {
      method: 'GET' as const,
      path: '/api/verses/daily' as const,
      responses: {
        200: z.custom<typeof verses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  ai: {
    generate: {
      method: 'POST' as const,
      path: '/api/ai/generate' as const,
      input: generateRequestSchema,
      responses: {
        200: generateResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type VerseResponse = z.infer<typeof api.verses.getDaily.responses[200]>;
export type GenerateRequestInput = z.infer<typeof api.ai.generate.input>;
export type GenerateResponseResult = z.infer<typeof api.ai.generate.responses[200]>;
