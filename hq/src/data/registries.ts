import { z } from "zod";
import pagesSource from "../../../data/registry/pages.json";
import offersSource from "../../../data/registry/offers.json";
import targetsSource from "../../../data/registry/targets.json";
import repositoriesSource from "../../../data/registry/repositories.json";

const lifecycleSchema = z.enum([
  "canonical",
  "live",
  "draft",
  "proposed",
  "historical",
  "archived"
]);

const pageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().min(1),
  section: z.string().min(1),
  page_type: z.string().min(1),
  owner: z.string().min(1),
  status: lifecycleSchema,
  confidentiality: z.string().min(1),
  source_of_truth: z.string().min(1),
  last_verified: z.string().date(),
  freshness_days: z.number().int().positive().nullable(),
  external_publish: z.boolean()
}).passthrough();

const pagesRegistrySchema = z.object({
  schema_version: z.literal(1),
  generated_at: z.string().datetime({ offset: true }),
  source: z.string().min(1),
  pages: z.array(pageSchema).min(1)
});

const offerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["approved", "proposed", "historical", "archived"]),
  price_label: z.string().min(1),
  timeline: z.string().min(1),
  primary_icp: z.string().min(1),
  effective_date: z.string().date().nullable(),
  source_decision: z.string().min(1)
}).passthrough();

const offersRegistrySchema = z.object({
  schema_version: z.literal(1),
  last_verified: z.string().date(),
  source: z.string().min(1),
  currency: z.literal("USD"),
  offers: z.array(offerSchema).min(1)
});

const targetSchema = z.object({
  metric_id: z.string().min(1),
  period: z.string().min(1),
  scenario: z.string().min(1),
  value: z.number(),
  status: lifecycleSchema,
  source_plan: z.string().min(1),
  effective_date: z.string().date()
}).passthrough();

const targetsRegistrySchema = z.object({
  schema_version: z.literal(1),
  last_verified: z.string().date(),
  source: z.string().min(1),
  targets: z.array(targetSchema).min(1)
});

const repositorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  classification: z.enum([
    "business-brain",
    "internal-hq",
    "ai-capabilities",
    "public-growth",
    "governance",
    "reusable-delivery",
    "experimental",
    "client-implementation"
  ]),
  importance: z.enum(["essential", "important", "supporting", "limited", "experimental", "client-specific"]),
  status: z.enum(["active", "deprioritized", "review"]),
  visibility: z.enum(["public", "private"]),
  origin: z.enum(["bpp-built", "upstream-fork", "client-project"]),
  business_owner: z.string().min(1),
  technical_owner: z.string().min(1),
  purpose: z.string().min(1),
  contains: z.array(z.string().min(1)).min(1),
  client_value: z.string().min(1),
  next_action: z.string().min(1)
});

const repositoriesRegistrySchema = z.object({
  schema_version: z.literal(1),
  last_verified: z.string().date(),
  source: z.string().min(1),
  repositories: z.array(repositorySchema).length(12)
});

export const pagesRegistry = pagesRegistrySchema.parse(pagesSource);
export const offersRegistry = offersRegistrySchema.parse(offersSource);
export const targetsRegistry = targetsRegistrySchema.parse(targetsSource);
export const repositoriesRegistry = repositoriesRegistrySchema.parse(repositoriesSource);

const aiJumpstart = offersRegistry.offers.find((offer) => offer.id === "ai-jumpstart");
if (
  !aiJumpstart ||
  aiJumpstart.standard_price !== 699 ||
  aiJumpstart.current_price !== 599 ||
  aiJumpstart.launch_discount !== 100 ||
  aiJumpstart.stackable_discount !== false
) {
  throw new Error("AI Jumpstart registry terms do not match the approved pricing decision.");
}

const operatorSystem = offersRegistry.offers.find((offer) => offer.id === "operator-system");
if (
  !operatorSystem ||
  operatorSystem.status !== "approved" ||
  operatorSystem.standard_price !== 5500 ||
  operatorSystem.current_price !== 5500 ||
  operatorSystem.effective_date !== "2026-07-22"
) {
  throw new Error("Operator System registry terms do not match the ratified July 22 pricing decision.");
}

const businessPlan = pagesRegistry.pages.find((page) => page.id === "business-plan");
const strategicPlan = pagesRegistry.pages.find((page) => page.id === "strategic-plan-v9");
if (businessPlan?.status !== "canonical" || strategicPlan?.status !== "historical") {
  throw new Error("Plan authority is unresolved in the shared page registry.");
}

export type PageRecord = z.infer<typeof pageSchema>;
export type OfferRecord = z.infer<typeof offerSchema>;
export type TargetRecord = z.infer<typeof targetSchema>;
export type RepositoryRecord = z.infer<typeof repositorySchema>;
