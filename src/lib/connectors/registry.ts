import type { ERPType } from "@prisma/client";
import type { ERPConnector } from "./types";
import type { ConnectorConfig } from "./config-schema";

type ConnectorFactory = (config: ConnectorConfig) => ERPConnector;

const CONNECTOR_REGISTRY: Partial<Record<ERPType, ConnectorFactory>> = {};

// Lazy registration to avoid circular imports
let registered = false;

function ensureRegistered() {
  if (registered) return;
  registered = true;

  // SAP connectors all use the same implementation
  const sapFactory: ConnectorFactory = (config) => {
    // Dynamic import to avoid loading SAP code when not needed
    const { SAPConnector } = require("./sap/sap-connector");
    return new SAPConnector(config);
  };

  const mockFactory: ConnectorFactory = (config) => {
    const { MockConnector } = require("./mock/mock-connector");
    return new MockConnector(config);
  };

  CONNECTOR_REGISTRY.SAP_S4HANA_CLOUD = sapFactory;
  CONNECTOR_REGISTRY.SAP_S4HANA_ONPREM = sapFactory;
  CONNECTOR_REGISTRY.SAP_ECC = sapFactory;
  CONNECTOR_REGISTRY.MOCK = mockFactory;
}

/**
 * Creates a connector instance for the given ERP type and config.
 */
export function createConnector(
  connectorType: ERPType,
  config: ConnectorConfig
): ERPConnector {
  ensureRegistered();
  const factory = CONNECTOR_REGISTRY[connectorType];
  if (!factory) {
    throw new Error(
      `No connector registered for type: ${connectorType}. ` +
        `Available: ${getSupportedConnectorTypes().join(", ")}`
    );
  }
  return factory(config);
}

/**
 * Returns the list of currently supported connector types.
 */
export function getSupportedConnectorTypes(): ERPType[] {
  ensureRegistered();
  return Object.keys(CONNECTOR_REGISTRY) as ERPType[];
}

/**
 * Checks if a connector type is supported.
 */
export function isConnectorTypeSupported(type: ERPType): boolean {
  ensureRegistered();
  return type in CONNECTOR_REGISTRY;
}
