import { z } from 'zod';

/** A Deal Brief: what to remember from an exercise. The same schema checks server output. */
export const DealBriefSchema = z.object({
  rule: z.string().trim().min(8).max(140),
  trap: z.string().trim().min(8).max(140),
  realWorld: z.string().trim().min(8).max(180),
  formula: z.string().trim().min(1).max(80).optional(),
});
export type DealBrief = z.infer<typeof DealBriefSchema>;

/** A valid brief, or null (never throws). */
export function parseBrief(input: unknown): DealBrief | null {
  const r = DealBriefSchema.safeParse(input);
  return r.success ? r.data : null;
}
