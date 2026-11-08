import { Platform } from 'react-native';
import { z } from 'zod';

const decimal = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform(Number)
  .pipe(z.number());
const slider = z
  .object({
    initial: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
  })
  .refine(
    ({ initial, min, max }) => min < max && initial >= min && initial <= max
  );
const impact = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const snapshot = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      nickname: z.string().nullable(),
      balance: decimal.nullable(),
    })
  ),
  asOf: z.iso.date(),
  dailyChanges: z.record(z.iso.date(), decimal),
  historyStart: z.iso.date().nullable(),
  income: decimal.nullable(),
  cashFlow: decimal.nullable(),
  runway: decimal.nullable(),
  liquidReserves: decimal.nullable(),
  inputs: z.object({
    accounts: z
      .record(
        z.string(),
        z.object({ balance: z.number(), rate: z.number().optional() })
      )
      .optional(),
    cashFlow: z
      .object({
        income: z.number(),
        spending: z.number(),
        priorMonthlyGrowth: z.number(),
      })
      .optional(),
    goals: z
      .record(
        z.string(),
        z.object({
          saved: z.number(),
          target: z.number().positive(),
          eta: z.iso.date(),
          change: z.number().optional(),
        })
      )
      .optional(),
    risk: z
      .object({
        inflation: z.number(),
        monthlyFees: z.number(),
        incomeReduction: z.number(),
        rangeMargin: z.number().min(0).max(100),
      })
      .optional(),
    simulation: z
      .object({
        monthly: slider,
        years: slider,
        rate: slider,
        growthPremium: z.number(),
      })
      .optional(),
    impact: z.record(z.string(), impact).optional(),
    display: z
      .object({
        accountRates: z.record(z.string(), z.number()),
        defaultImpact: impact,
      })
      .optional(),
  }),
});

export type NessieSnapshot = z.infer<typeof snapshot>;

export async function fetchNessieSnapshot(
  signal: AbortSignal
): Promise<NessieSnapshot> {
  const base =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://127.0.0.1:8000');
  const customer = process.env.EXPO_PUBLIC_NESSIE_CUSTOMER_ID;
  const query = customer ? `?customer_id=${encodeURIComponent(customer)}` : '';
  const response = await fetch(
    `${base.replace(/\/$/, '')}/api/canopy${query}`,
    { signal }
  );
  if (!response.ok) throw new Error('Could not load Nessie data.');
  return snapshot.parse(await response.json());
}
