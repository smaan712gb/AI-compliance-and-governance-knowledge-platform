import { z } from "zod";

export const createConnectorSchema = z.object({
  name: z.string().min(1, "Connector name is required").max(100),
  erpType: z.enum([
    "SAP_S4HANA_CLOUD",
    "SAP_S4HANA_ONPREM",
    "SAP_ECC",
    "MOCK",
    "DYNAMICS_365",
    "WORKDAY",
    "ORACLE_CLOUD",
    "NETSUITE",
  ]),
  config: z.record(z.string(), z.unknown()),
  syncFrequency: z.string().default("6h"),
});

export const updateConnectorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  syncFrequency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const triggerSyncSchema = z.object({
  domain: z.enum(["SOX_CONTROLS", "AML_KYC", "ACCESS_CONTROL", "AUDIT_TRAIL", "ALL"]).default("ALL"),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});
