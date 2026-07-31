import { z } from "zod";
import homeSource from "../../../data/hub-home-stats.json";
import deliverySource from "../../../data/delivery-tracker.json";
import monthlySource from "../../../scripts/performance-dashboard/monthly_data.json";

const homeSchema = z.object({
  generated_at: z.string(),
  as_of_date: z.string(),
  as_of_note: z.string(),
  stats: z.object({
    cash_on_hand: z.number(),
    buffer_target: z.number(),
    buffer_gap: z.number(),
    ytd_revenue: z.number(),
    ytd_net_income: z.number(),
    active_clients_count: z.number().int(),
    pipeline_total: z.number(),
    pipeline_count: z.number().int(),
    pipeline_hot_count: z.number().int(),
    pipeline_verified_date: z.string().date()
  }),
  active_clients: z.array(z.object({
    name: z.string(),
    owner: z.string(),
    phase: z.string(),
    next_milestone: z.string(),
    at_risk: z.boolean(),
    risk_note: z.string()
  }).passthrough())
}).passthrough();

const deliverySchema = z.object({
  generated_at: z.string().datetime(),
  gantt: z.object({
    clients: z.array(z.object({
      client: z.string(),
      items: z.array(z.object({
        name: z.string(),
        phase: z.string(),
        owner: z.string().nullable(),
        due: z.string().date().nullable(),
        status: z.string(),
        updated_at: z.string().date()
      }).passthrough())
    }))
  }),
  velocity: z.object({
    current_sprint: z.object({
      number: z.number(),
      goal: z.string(),
      status: z.string()
    }).passthrough(),
    history: z.array(z.object({
      sprint: z.number(),
      committed: z.number(),
      completed: z.number(),
      reliability: z.number(),
      health: z.string()
    }).passthrough())
  }).passthrough()
});

const monthSchema = z.object({
  rev: z.number(),
  exp: z.number(),
  net: z.number(),
  wonN: z.number(),
  wonV: z.number()
}).passthrough();

const monthlySchema = z.object({
  generated: z.string().date(),
  months: z.array(z.string()),
  data: z.record(monthSchema),
  pipeline: z.array(z.object({
    n: z.string(),
    a: z.number(),
    stage: z.string(),
    o: z.string()
  }))
}).passthrough();

export const homeSnapshot = homeSchema.parse(homeSource);
export const deliverySnapshot = deliverySchema.parse(deliverySource);
export const monthlySnapshot = monthlySchema.parse(monthlySource);

export const proofDate = new Date().toISOString().slice(0, 10);
export const proofDateLabel = new Date(`${proofDate}T12:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

export function money(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard"
  }).format(value);
}

export function percent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}
