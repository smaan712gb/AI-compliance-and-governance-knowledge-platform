"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  Plus,
  ChevronRight,
  Globe,
  User,
  Building2,
  MapPin,
  Factory,
  Route,
  BarChart3,
  Package,
  Shield,
  Link2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---- Types ----

interface EntityResult {
  id: string;
  name: string;
  type: string;
  countryCode: string | null;
  aliases: string[];
  _count: {
    outgoingRelations: number;
    incomingRelations: number;
    eventLinks: number;
  };
}

interface RelationDetail {
  id: string;
  type: string;
  weight: number;
  confidence: number;
  source: string | null;
  from?: { id: string; name: string; type: string; countryCode: string | null };
  to?: { id: string; name: string; type: string; countryCode: string | null };
}

interface LinkedEvent {
  id: string;
  role: string;
  event: {
    id: string;
    headline: string;
    severity: string;
    category: string;
    countryCode: string | null;
    processedAt: string;
  };
}

interface EntityDetail {
  id: string;
  name: string;
  type: string;
  countryCode: string | null;
  aliases: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  outgoingRelations: RelationDetail[];
  incomingRelations: RelationDetail[];
  eventLinks: LinkedEvent[];
}

interface NetworkNode {
  id: string;
  name: string;
  type: string;
  countryCode: string | null;
  aliases: string[];
}

interface NetworkEdge {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  weight: number;
  confidence: number;
}

interface GraphStats {
  totalEntities: number;
  totalRelations: number;
  totalEventLinks: number;
  entitiesByType: Record<string, number>;
  relationsByType: Record<string, number>;
}

// ---- Constants ----

const ENTITY_TYPES = [
  "PERSON",
  "ORGANIZATION",
  "COUNTRY",
  "CITY",
  "INFRASTRUCTURE",
  "ROUTE",
  "SECTOR",
  "COMMODITY",
  "WEAPON_SYSTEM",
];

const RELATION_TYPES = [
  "OPERATES_IN",
  "ALLY_OF",
  "RIVAL_OF",
  "SUPPLIES",
  "SANCTIONS",
  "CONTROLS",
  "TRADES",
  "LOCATED_IN",
  "LEADS",
  "MEMBER_OF",
  "CAUSED_BY",
  "AFFECTS",
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PERSON: <User className="h-4 w-4" />,
  ORGANIZATION: <Building2 className="h-4 w-4" />,
  COUNTRY: <Globe className="h-4 w-4" />,
  CITY: <MapPin className="h-4 w-4" />,
  INFRASTRUCTURE: <Factory className="h-4 w-4" />,
  ROUTE: <Route className="h-4 w-4" />,
  SECTOR: <BarChart3 className="h-4 w-4" />,
  COMMODITY: <Package className="h-4 w-4" />,
  WEAPON_SYSTEM: <Shield className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  PERSON: "bg-blue-100 text-blue-800",
  ORGANIZATION: "bg-purple-100 text-purple-800",
  COUNTRY: "bg-emerald-100 text-emerald-800",
  CITY: "bg-teal-100 text-teal-800",
  INFRASTRUCTURE: "bg-orange-100 text-orange-800",
  ROUTE: "bg-amber-100 text-amber-800",
  SECTOR: "bg-indigo-100 text-indigo-800",
  COMMODITY: "bg-yellow-100 text-yellow-800",
  WEAPON_SYSTEM: "bg-red-100 text-red-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  SENTINEL_CRITICAL: "text-red-600",
  SENTINEL_HIGH: "text-orange-600",
  SENTINEL_MEDIUM: "text-yellow-600",
  SENTINEL_LOW: "text-green-600",
  SENTINEL_INFO: "text-gray-500",
};

// ---- Component ----

export default function GraphExplorerPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchResults, setSearchResults] = useState<EntityResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Detail state
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Network state
  const [networkData, setNetworkData] = useState<{
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  } | null>(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);

  // Stats
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Forms
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showAddRelation, setShowAddRelation] = useState(false);

  // Add entity form
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("PERSON");
  const [newEntityCountry, setNewEntityCountry] = useState("");
  const [newEntityAliases, setNewEntityAliases] = useState("");
  const [savingEntity, setSavingEntity] = useState(false);

  // Add relation form
  const [relFromSearch, setRelFromSearch] = useState("");
  const [relToSearch, setRelToSearch] = useState("");
  const [relFromId, setRelFromId] = useState("");
  const [relToId, setRelToId] = useState("");
  const [relFromName, setRelFromName] = useState("");
  const [relToName, setRelToName] = useState("");
  const [relType, setRelType] = useState("OPERATES_IN");
  const [relConfidence, setRelConfidence] = useState(0.8);
  const [relSuggestions, setRelSuggestions] = useState<{
    field: "from" | "to";
    results: EntityResult[];
  } | null>(null);
  const [savingRelation, setSavingRelation] = useState(false);

  // Error
  const [error, setError] = useState("");

  // ---- API Calls ----

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (searchType) params.set("type", searchType);
      const res = await fetch(`/api/sentinel/graph?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      setSearchResults(data.data || []);
    } catch {
      setError("Failed to search entities");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType]);

  async function loadEntityDetail(id: string) {
    setLoadingDetail(true);
    setError("");
    setNetworkData(null);
    try {
      const res = await fetch(`/api/sentinel/graph/${id}?events=true`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load entity");
        return;
      }
      setSelectedEntity(data.data.entity);
    } catch {
      setError("Failed to load entity details");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadNetwork(id: string) {
    setLoadingNetwork(true);
    setError("");
    try {
      const res = await fetch(`/api/sentinel/graph/${id}?depth=2`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load network");
        return;
      }
      setNetworkData(data.data);
    } catch {
      setError("Failed to load network");
    } finally {
      setLoadingNetwork(false);
    }
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/sentinel/graph?view=stats");
      const data = await res.json();
      if (res.ok) setStats(data.data);
    } catch {
      /* ignore */
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleCreateEntity() {
    if (!newEntityName.trim()) return;
    setSavingEntity(true);
    setError("");
    try {
      const res = await fetch("/api/sentinel/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_entity",
          name: newEntityName.trim(),
          type: newEntityType,
          countryCode: newEntityCountry.trim() || undefined,
          aliases: newEntityAliases
            ? newEntityAliases.split(",").map((a) => a.trim()).filter(Boolean)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create entity");
        return;
      }
      setNewEntityName("");
      setNewEntityCountry("");
      setNewEntityAliases("");
      setShowAddEntity(false);
      // Reload search
      if (searchQuery) handleSearch();
    } catch {
      setError("Failed to create entity");
    } finally {
      setSavingEntity(false);
    }
  }

  async function searchRelationEntities(query: string, field: "from" | "to") {
    if (query.length < 2) {
      setRelSuggestions(null);
      return;
    }
    try {
      const res = await fetch(`/api/sentinel/graph?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setRelSuggestions({ field, results: data.data || [] });
      }
    } catch {
      /* ignore */
    }
  }

  function selectRelationEntity(entity: EntityResult, field: "from" | "to") {
    if (field === "from") {
      setRelFromId(entity.id);
      setRelFromName(entity.name);
      setRelFromSearch(entity.name);
    } else {
      setRelToId(entity.id);
      setRelToName(entity.name);
      setRelToSearch(entity.name);
    }
    setRelSuggestions(null);
  }

  async function handleCreateRelation() {
    if (!relFromId || !relToId) return;
    setSavingRelation(true);
    setError("");
    try {
      const res = await fetch("/api/sentinel/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_relation",
          fromId: relFromId,
          toId: relToId,
          type: relType,
          confidence: relConfidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create relation");
        return;
      }
      setRelFromId("");
      setRelToId("");
      setRelFromName("");
      setRelToName("");
      setRelFromSearch("");
      setRelToSearch("");
      setShowAddRelation(false);
      // Reload selected entity if applicable
      if (selectedEntity) loadEntityDetail(selectedEntity.id);
    } catch {
      setError("Failed to create relation");
    } finally {
      setSavingRelation(false);
    }
  }

  // ---- Render Helpers ----

  function renderTypeBadge(type: string) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] || "bg-gray-100 text-gray-800"}`}
      >
        {TYPE_ICONS[type]}
        {type.replace(/_/g, " ")}
      </span>
    );
  }

  function renderNetworkTree() {
    if (!networkData || !selectedEntity) return null;

    const nodeMap = new Map(networkData.nodes.map((n) => [n.id, n]));
    const rootId = selectedEntity.id;

    // Build adjacency
    const children = new Map<string, Array<{ nodeId: string; relation: string; direction: string }>>();

    for (const edge of networkData.edges) {
      if (edge.fromId === rootId) {
        const existing = children.get(rootId) || [];
        const target = nodeMap.get(edge.toId);
        if (target) {
          existing.push({
            nodeId: target.id,
            relation: edge.type.replace(/_/g, " "),
            direction: "->",
          });
        }
        children.set(rootId, existing);
      } else if (edge.toId === rootId) {
        const existing = children.get(rootId) || [];
        const source = nodeMap.get(edge.fromId);
        if (source) {
          existing.push({
            nodeId: source.id,
            relation: edge.type.replace(/_/g, " "),
            direction: "<-",
          });
        }
        children.set(rootId, existing);
      }
    }

    // Level 2: for each direct neighbor, find their connections
    const level1 = children.get(rootId) || [];
    const level2Map = new Map<string, Array<{ nodeId: string; relation: string; direction: string }>>();

    for (const l1 of level1) {
      const l2Children: Array<{ nodeId: string; relation: string; direction: string }> = [];
      for (const edge of networkData.edges) {
        if (edge.fromId === l1.nodeId && edge.toId !== rootId) {
          const target = nodeMap.get(edge.toId);
          if (target) {
            l2Children.push({
              nodeId: target.id,
              relation: edge.type.replace(/_/g, " "),
              direction: "->",
            });
          }
        } else if (edge.toId === l1.nodeId && edge.fromId !== rootId) {
          const source = nodeMap.get(edge.fromId);
          if (source) {
            l2Children.push({
              nodeId: source.id,
              relation: edge.type.replace(/_/g, " "),
              direction: "<-",
            });
          }
        }
      }
      if (l2Children.length > 0) {
        level2Map.set(l1.nodeId, l2Children);
      }
    }

    return (
      <div className="space-y-1 font-mono text-sm">
        <div className="font-bold text-emerald-400">
          {selectedEntity.name} ({selectedEntity.type})
        </div>
        {level1.length === 0 && (
          <div className="pl-4 text-gray-500">No connections found</div>
        )}
        {level1.map((l1, i) => {
          const node = nodeMap.get(l1.nodeId);
          if (!node) return null;
          const l2 = level2Map.get(l1.nodeId) || [];
          return (
            <div key={`${l1.nodeId}-${i}`}>
              <div className="pl-4 text-gray-300">
                <span className="text-emerald-600">{l1.direction === "->" ? "-->" : "<--"}</span>{" "}
                <span className="text-gray-500">[{l1.relation}]</span>{" "}
                <button
                  onClick={() => loadEntityDetail(node.id)}
                  className="text-emerald-400 hover:underline"
                >
                  {node.name}
                </button>{" "}
                <span className="text-gray-600 text-xs">({node.type})</span>
              </div>
              {l2.map((l2Item, j) => {
                const l2Node = nodeMap.get(l2Item.nodeId);
                if (!l2Node) return null;
                return (
                  <div key={`${l2Item.nodeId}-${j}`} className="pl-12 text-gray-400">
                    <span className="text-emerald-700">
                      {l2Item.direction === "->" ? "-->" : "<--"}
                    </span>{" "}
                    <span className="text-gray-600 text-xs">[{l2Item.relation}]</span>{" "}
                    <button
                      onClick={() => loadEntityDetail(l2Node.id)}
                      className="text-emerald-500 hover:underline"
                    >
                      {l2Node.name}
                    </button>{" "}
                    <span className="text-gray-700 text-xs">({l2Node.type})</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="pt-2 text-xs text-gray-600">
          {networkData.nodes.length} nodes, {networkData.edges.length} edges
        </div>
      </div>
    );
  }

  // ---- Main Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
          <p className="text-gray-400 mt-1">
            Explore entity relationships: actors, regions, infrastructure, companies, and sectors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadStats();
              setShowAddEntity(false);
              setShowAddRelation(false);
            }}
            className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Stats
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddEntity(!showAddEntity);
              setShowAddRelation(false);
            }}
            className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            Entity
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddRelation(!showAddRelation);
              setShowAddEntity(false);
            }}
            className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
          >
            <Link2 className="h-4 w-4 mr-1" />
            Relation
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Panel */}
      {loadingStats && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stats...
        </div>
      )}
      {stats && !loadingStats && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Graph Statistics</h3>
            <button onClick={() => setStats(null)} className="text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded bg-gray-800/50 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.totalEntities}</div>
              <div className="text-xs text-gray-400">Entities</div>
            </div>
            <div className="rounded bg-gray-800/50 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.totalRelations}</div>
              <div className="text-xs text-gray-400">Relations</div>
            </div>
            <div className="rounded bg-gray-800/50 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.totalEventLinks}</div>
              <div className="text-xs text-gray-400">Event Links</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase">By Entity Type</h4>
              {Object.entries(stats.entitiesByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">{type.replace(/_/g, " ")}</span>
                  <span className="text-sm font-medium text-emerald-400">{count}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase">By Relation Type</h4>
              {Object.entries(stats.relationsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">{type.replace(/_/g, " ")}</span>
                  <span className="text-sm font-medium text-emerald-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Entity Form */}
      {showAddEntity && (
        <div className="rounded-lg border border-emerald-800/50 bg-gray-900/50 p-4 space-y-3">
          <h3 className="font-semibold text-white">Add Entity</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                placeholder="e.g. Vladimir Putin"
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Country Code</label>
              <input
                type="text"
                value={newEntityCountry}
                onChange={(e) => setNewEntityCountry(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="US"
                maxLength={2}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Aliases (comma-separated)</label>
              <input
                type="text"
                value={newEntityAliases}
                onChange={(e) => setNewEntityAliases(e.target.value)}
                placeholder="V. Putin, Putin"
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateEntity}
              disabled={savingEntity || !newEntityName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingEntity && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Entity
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddEntity(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Relation Form */}
      {showAddRelation && (
        <div className="rounded-lg border border-emerald-800/50 bg-gray-900/50 p-4 space-y-3">
          <h3 className="font-semibold text-white">Add Relation</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* From Entity */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">From Entity *</label>
              <input
                type="text"
                value={relFromSearch}
                onChange={(e) => {
                  setRelFromSearch(e.target.value);
                  setRelFromId("");
                  setRelFromName("");
                  searchRelationEntities(e.target.value, "from");
                }}
                placeholder="Search entity..."
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              {relFromName && (
                <div className="text-xs text-emerald-400 mt-1">Selected: {relFromName}</div>
              )}
              {relSuggestions?.field === "from" && relSuggestions.results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg max-h-40 overflow-y-auto">
                  {relSuggestions.results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectRelationEntity(r, "from")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      {renderTypeBadge(r.type)}
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* To Entity */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">To Entity *</label>
              <input
                type="text"
                value={relToSearch}
                onChange={(e) => {
                  setRelToSearch(e.target.value);
                  setRelToId("");
                  setRelToName("");
                  searchRelationEntities(e.target.value, "to");
                }}
                placeholder="Search entity..."
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              {relToName && (
                <div className="text-xs text-emerald-400 mt-1">Selected: {relToName}</div>
              )}
              {relSuggestions?.field === "to" && relSuggestions.results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg max-h-40 overflow-y-auto">
                  {relSuggestions.results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectRelationEntity(r, "to")}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      {renderTypeBadge(r.type)}
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Relation Type */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Relation Type *</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidence */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Confidence: {Math.round(relConfidence * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(relConfidence * 100)}
                onChange={(e) => setRelConfidence(Number(e.target.value) / 100)}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateRelation}
              disabled={savingRelation || !relFromId || !relToId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingRelation && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Relation
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddRelation(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search entities by name..."
            className="w-full rounded-md border border-gray-700 bg-gray-800 pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content: Results + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            {searchResults.length > 0
              ? `${searchResults.length} Result${searchResults.length !== 1 ? "s" : ""}`
              : "Search Results"}
          </h3>
          {searchResults.length === 0 && !searching && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 text-center text-sm text-gray-500">
              Search for entities to explore the knowledge graph
            </div>
          )}
          {searching && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Searching...
            </div>
          )}
          {searchResults.map((entity) => (
            <button
              key={entity.id}
              onClick={() => loadEntityDetail(entity.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedEntity?.id === entity.id
                  ? "border-emerald-600 bg-emerald-950/30"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white text-sm">{entity.name}</span>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {renderTypeBadge(entity.type)}
                {entity.countryCode && (
                  <span className="text-xs text-gray-500">{entity.countryCode}</span>
                )}
                <span className="text-xs text-gray-600">
                  {entity._count.outgoingRelations + entity._count.incomingRelations} relations
                </span>
                <span className="text-xs text-gray-600">
                  {entity._count.eventLinks} events
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Entity Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          {loadingDetail && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading entity...
            </div>
          )}

          {!loadingDetail && !selectedEntity && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-500">
              <Globe className="h-12 w-12 mx-auto mb-3 text-gray-700" />
              <p>Select an entity from search results to view details</p>
            </div>
          )}

          {!loadingDetail && selectedEntity && (
            <>
              {/* Entity Info */}
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">{selectedEntity.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadNetwork(selectedEntity.id)}
                    disabled={loadingNetwork}
                    className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                  >
                    {loadingNetwork ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-1" />
                    )}
                    Network View
                  </Button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {renderTypeBadge(selectedEntity.type)}
                  {selectedEntity.countryCode && (
                    <span className="text-sm text-gray-400">
                      <Globe className="inline h-3 w-3 mr-1" />
                      {selectedEntity.countryCode}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    Created {new Date(selectedEntity.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {selectedEntity.aliases.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Aliases: </span>
                    {selectedEntity.aliases.map((a, i) => (
                      <span key={i} className="text-xs text-gray-400 bg-gray-800 rounded px-1.5 py-0.5 mr-1">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                {selectedEntity.metadata && Object.keys(selectedEntity.metadata).length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Metadata: </span>
                    <pre className="text-xs text-gray-400 bg-gray-800 rounded p-2 mt-1 overflow-x-auto">
                      {JSON.stringify(selectedEntity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Relations */}
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold text-white mb-3">
                  Relations ({selectedEntity.outgoingRelations.length + selectedEntity.incomingRelations.length})
                </h3>

                {selectedEntity.outgoingRelations.length === 0 &&
                  selectedEntity.incomingRelations.length === 0 && (
                    <p className="text-sm text-gray-500">No relations found</p>
                  )}

                {/* Group outgoing by type */}
                {selectedEntity.outgoingRelations.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Outgoing</h4>
                    <div className="space-y-1">
                      {selectedEntity.outgoingRelations.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800/50"
                        >
                          <span className="text-xs text-emerald-600 font-mono w-28 shrink-0">
                            {rel.type.replace(/_/g, " ")}
                          </span>
                          <ChevronRight className="h-3 w-3 text-gray-600 shrink-0" />
                          <button
                            onClick={() => rel.to && loadEntityDetail(rel.to.id)}
                            className="text-sm text-emerald-400 hover:underline"
                          >
                            {rel.to?.name}
                          </button>
                          {rel.to?.countryCode && (
                            <span className="text-xs text-gray-600">{rel.to.countryCode}</span>
                          )}
                          <span className="ml-auto text-xs text-gray-600">
                            {Math.round(rel.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group incoming by type */}
                {selectedEntity.incomingRelations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Incoming</h4>
                    <div className="space-y-1">
                      {selectedEntity.incomingRelations.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800/50"
                        >
                          <button
                            onClick={() => rel.from && loadEntityDetail(rel.from.id)}
                            className="text-sm text-emerald-400 hover:underline"
                          >
                            {rel.from?.name}
                          </button>
                          {rel.from?.countryCode && (
                            <span className="text-xs text-gray-600">{rel.from.countryCode}</span>
                          )}
                          <ChevronRight className="h-3 w-3 text-gray-600 shrink-0" />
                          <span className="text-xs text-emerald-600 font-mono">
                            {rel.type.replace(/_/g, " ")}
                          </span>
                          <span className="ml-auto text-xs text-gray-600">
                            {Math.round(rel.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Linked Events */}
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold text-white mb-3">
                  Linked Events ({selectedEntity.eventLinks?.length || 0})
                </h3>
                {(!selectedEntity.eventLinks || selectedEntity.eventLinks.length === 0) && (
                  <p className="text-sm text-gray-500">No linked intelligence events</p>
                )}
                <div className="space-y-2">
                  {selectedEntity.eventLinks?.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-start gap-3 py-2 px-2 rounded hover:bg-gray-800/50"
                    >
                      <span
                        className={`text-xs font-medium mt-0.5 ${
                          SEVERITY_COLORS[link.event.severity] || "text-gray-400"
                        }`}
                      >
                        {link.event.severity.replace("SENTINEL_", "")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{link.event.headline}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="uppercase">{link.event.category}</span>
                          {link.event.countryCode && <span>{link.event.countryCode}</span>}
                          <span>{new Date(link.event.processedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 shrink-0">
                        {link.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network View */}
              {(loadingNetwork || networkData) && (
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="font-semibold text-white mb-3">Network View (2 levels deep)</h3>
                  {loadingNetwork ? (
                    <div className="flex items-center gap-2 py-4 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Building network graph...
                    </div>
                  ) : (
                    <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto">
                      {renderNetworkTree()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
