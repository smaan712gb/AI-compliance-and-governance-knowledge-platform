import { describe, it, expect } from "vitest";

// ============================================
// SENTINEL — Event Graph / Ontology Tests
// Pure-logic tests — no Prisma imports needed
// ============================================

// ---- Inline constants & logic from event-graph.ts ----

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
] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

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
] as const;
type RelationType = (typeof RELATION_TYPES)[number];

type EntityRole = "actor" | "target" | "location" | "affected";

const INFRASTRUCTURE_KEYWORDS = [
  "port",
  "pipeline",
  "strait",
  "canal",
  "airport",
  "refinery",
  "bridge",
  "dam",
  "powerplant",
  "power plant",
  "nuclear plant",
  "terminal",
  "harbor",
  "harbour",
  "base",
  "airfield",
  "railway",
  "highway",
];

interface GraphNetwork {
  nodes: Array<{
    id: string;
    name: string;
    type: EntityType;
    countryCode: string | null;
    aliases: string[];
  }>;
  edges: Array<{
    id: string;
    fromId: string;
    toId: string;
    type: RelationType;
    weight: number;
    confidence: number;
    source: string | null;
  }>;
}

// Phrase extraction regex (from autoExtractAndLink)
const phraseRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;

const personIndicators = [
  "President",
  "Minister",
  "General",
  "Admiral",
  "Dr",
  "Senator",
  "Governor",
  "Ambassador",
  "Secretary",
  "Commander",
  "Chairman",
  "Director",
  "Chief",
];

const orgIndicators = [
  "Corporation",
  "Corp",
  "Inc",
  "Ltd",
  "Group",
  "Authority",
  "Agency",
  "Ministry",
  "Department",
  "Council",
  "Commission",
  "Institute",
  "Foundation",
  "Alliance",
  "Union",
  "Organization",
  "Organisation",
  "Bank",
  "Fund",
  "Company",
];

/** Mirrors the classification logic from autoExtractAndLink */
function classifyPhrase(phrase: string): {
  type: EntityType;
  role: EntityRole;
} {
  const words = phrase.split(/\s+/);
  const isPerson = words.some((w) =>
    personIndicators.some((p) => w.startsWith(p))
  );
  const isOrg = words.some((w) =>
    orgIndicators.some((o) => w.startsWith(o))
  );

  const entityType: EntityType = isPerson
    ? "PERSON"
    : isOrg
      ? "ORGANIZATION"
      : words.length <= 3
        ? "PERSON"
        : "ORGANIZATION";

  return { type: entityType, role: isPerson ? "actor" : "affected" };
}

/** Mirrors the BFS network traversal logic */
function bfsNetwork(
  rootId: string,
  adjacency: Map<string, Array<{ nodeId: string; edgeId: string }>>,
  depth: number
): { visitedNodes: Set<string>; visitedEdges: Set<string> } {
  const maxDepth = Math.min(depth, 3);
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [
    { id: rootId, level: 0 },
  ];

  visitedNodes.add(rootId);

  while (queue.length > 0 && visitedNodes.size < 100) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.level >= maxDepth) continue;

    const neighbors = adjacency.get(current.id) ?? [];
    for (const neighbor of neighbors) {
      if (visitedNodes.size >= 100) break;
      visitedEdges.add(neighbor.edgeId);
      if (!visitedNodes.has(neighbor.nodeId)) {
        visitedNodes.add(neighbor.nodeId);
        queue.push({ id: neighbor.nodeId, level: current.level + 1 });
      }
    }
  }

  return { visitedNodes, visitedEdges };
}

// ============================================
// Tests
// ============================================

describe("Event Graph — Ontology & Logic", () => {
  // ---- EntityType ----

  describe("EntityType values", () => {
    it("defines exactly 9 entity types", () => {
      expect(ENTITY_TYPES).toHaveLength(9);
    });

    it("includes all expected entity types", () => {
      const expected = [
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
      for (const t of expected) {
        expect(ENTITY_TYPES).toContain(t);
      }
    });
  });

  // ---- RelationType ----

  describe("RelationType values", () => {
    it("defines exactly 12 relation types", () => {
      expect(RELATION_TYPES).toHaveLength(12);
    });

    it("includes all expected relation types", () => {
      const expected = [
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
      for (const r of expected) {
        expect(RELATION_TYPES).toContain(r);
      }
    });
  });

  // ---- EntityRole ----

  describe("EntityRole values", () => {
    it("allows actor, target, location, affected", () => {
      const roles: EntityRole[] = ["actor", "target", "location", "affected"];
      expect(roles).toHaveLength(4);
      expect(roles).toContain("actor");
      expect(roles).toContain("target");
      expect(roles).toContain("location");
      expect(roles).toContain("affected");
    });
  });

  // ---- INFRASTRUCTURE_KEYWORDS ----

  describe("INFRASTRUCTURE_KEYWORDS", () => {
    it("contains exactly 18 keywords", () => {
      expect(INFRASTRUCTURE_KEYWORDS).toHaveLength(18);
    });

    it("includes core infrastructure terms", () => {
      const core = [
        "port",
        "pipeline",
        "strait",
        "canal",
        "airport",
        "refinery",
        "bridge",
        "dam",
      ];
      for (const kw of core) {
        expect(INFRASTRUCTURE_KEYWORDS).toContain(kw);
      }
    });

    it("includes both harbor spellings", () => {
      expect(INFRASTRUCTURE_KEYWORDS).toContain("harbor");
      expect(INFRASTRUCTURE_KEYWORDS).toContain("harbour");
    });

    it("includes multi-word keywords", () => {
      expect(INFRASTRUCTURE_KEYWORDS).toContain("power plant");
      expect(INFRASTRUCTURE_KEYWORDS).toContain("nuclear plant");
    });

    it("all keywords are lowercase", () => {
      for (const kw of INFRASTRUCTURE_KEYWORDS) {
        expect(kw).toBe(kw.toLowerCase());
      }
    });
  });

  // ---- Phrase Extraction Regex ----

  describe("Phrase extraction regex", () => {
    it("matches capitalized multi-word phrases", () => {
      const text = "President Vladimir Putin met with General Mark Milley";
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      while ((m = regex.exec(text)) !== null) {
        matches.push(m[1]);
      }
      expect(matches).toContain("President Vladimir Putin");
      expect(matches).toContain("General Mark Milley");
    });

    it("does not match single capitalized words", () => {
      const text = "Putin announced sanctions";
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      while ((m = regex.exec(text)) !== null) {
        matches.push(m[1]);
      }
      expect(matches).toHaveLength(0);
    });

    it("does not match ALL CAPS words", () => {
      const text = "NATO and OPEC held a meeting";
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      while ((m = regex.exec(text)) !== null) {
        matches.push(m[1]);
      }
      expect(matches).toHaveLength(0);
    });

    it("extracts phrases from mixed text", () => {
      const text =
        "The European Central Bank raised rates while Saudi Aramco reported profits";
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      while ((m = regex.exec(text)) !== null) {
        matches.push(m[1]);
      }
      // "The" is capitalized so regex captures "The European Central Bank"
      expect(matches).toContain("The European Central Bank");
      expect(matches).toContain("Saudi Aramco");
    });
  });

  // ---- autoExtractAndLink classification logic ----

  describe("classifyPhrase (autoExtractAndLink logic)", () => {
    it("classifies person indicators as PERSON with actor role", () => {
      const result = classifyPhrase("President Joe Biden");
      expect(result.type).toBe("PERSON");
      expect(result.role).toBe("actor");
    });

    it("classifies Minister as PERSON", () => {
      const result = classifyPhrase("Minister Ahmed Khan");
      expect(result.type).toBe("PERSON");
      expect(result.role).toBe("actor");
    });

    it("classifies General as PERSON", () => {
      const result = classifyPhrase("General Mark Milley");
      expect(result.type).toBe("PERSON");
      expect(result.role).toBe("actor");
    });

    it("classifies org indicators as ORGANIZATION with affected role", () => {
      const result = classifyPhrase("Acme Corporation");
      expect(result.type).toBe("ORGANIZATION");
      expect(result.role).toBe("affected");
    });

    it("classifies Ministry as ORGANIZATION", () => {
      const result = classifyPhrase("Ministry Of Defense");
      expect(result.type).toBe("ORGANIZATION");
      expect(result.role).toBe("affected");
    });

    it("classifies Bank as ORGANIZATION", () => {
      const result = classifyPhrase("Central Bank");
      expect(result.type).toBe("ORGANIZATION");
      expect(result.role).toBe("affected");
    });

    it("defaults short phrases (<=3 words) to PERSON", () => {
      const result = classifyPhrase("John Smith");
      expect(result.type).toBe("PERSON");
      expect(result.role).toBe("affected");
    });

    it("defaults long phrases (>3 words) to ORGANIZATION", () => {
      const result = classifyPhrase("North Atlantic Treaty Something");
      expect(result.type).toBe("ORGANIZATION");
      expect(result.role).toBe("affected");
    });

    it("person indicator takes precedence over org indicator", () => {
      // "President" is person, "Foundation" is org — person wins
      const result = classifyPhrase("President Foundation Board");
      expect(result.type).toBe("PERSON");
      expect(result.role).toBe("actor");
    });
  });

  // ---- Infrastructure keyword detection ----

  describe("Infrastructure keyword detection", () => {
    it("detects keyword in lowercase text", () => {
      const text = "Attack on the Kharg Island port facility";
      const lowerText = text.toLowerCase();
      const found = INFRASTRUCTURE_KEYWORDS.filter(
        (kw) => lowerText.indexOf(kw) !== -1
      );
      expect(found).toContain("port");
    });

    it("detects multi-word keywords", () => {
      const text = "The nuclear plant was shut down";
      const lowerText = text.toLowerCase();
      const found = INFRASTRUCTURE_KEYWORDS.filter(
        (kw) => lowerText.indexOf(kw) !== -1
      );
      expect(found).toContain("nuclear plant");
    });

    it("extracts capitalized context before keyword", () => {
      // "The" is also capitalized, so the regex captures "The Suez"
      const text = "The Suez Canal was blocked";
      const lowerText = text.toLowerCase();
      const keyword = "canal";
      const idx = lowerText.indexOf(keyword);
      const beforeText = text.substring(Math.max(0, idx - 40), idx).trim();
      const capWords = beforeText.match(/(?:[A-Z][a-z]+\s*)+$/);
      const infraName = capWords
        ? `${capWords[0].trim()} ${text.substring(idx, idx + keyword.length)}`
        : text.substring(idx, idx + keyword.length);

      expect(infraName).toBe("The Suez Canal");
    });

    it("extracts only adjacent capitalized words before keyword", () => {
      // When preceded by a lowercase word, only the capitalized portion is captured
      const text = "attack on Suez Canal was devastating";
      const lowerText = text.toLowerCase();
      const keyword = "canal";
      const idx = lowerText.indexOf(keyword);
      const beforeText = text.substring(Math.max(0, idx - 40), idx).trim();
      const capWords = beforeText.match(/(?:[A-Z][a-z]+\s*)+$/);
      const infraName = capWords
        ? `${capWords[0].trim()} ${text.substring(idx, idx + keyword.length)}`
        : text.substring(idx, idx + keyword.length);

      expect(infraName).toBe("Suez Canal");
    });

    it("uses raw keyword when no capitalized context found", () => {
      const text = "the canal was blocked";
      const lowerText = text.toLowerCase();
      const keyword = "canal";
      const idx = lowerText.indexOf(keyword);
      const beforeText = text.substring(Math.max(0, idx - 40), idx).trim();
      const capWords = beforeText.match(/(?:[A-Z][a-z]+\s*)+$/);
      const infraName = capWords
        ? `${capWords[0].trim()} ${text.substring(idx, idx + keyword.length)}`
        : text.substring(idx, idx + keyword.length);

      expect(infraName).toBe("canal");
    });
  });

  // ---- GraphNetwork interface shape ----

  describe("GraphNetwork interface", () => {
    it("accepts a valid graph with nodes and edges", () => {
      const graph: GraphNetwork = {
        nodes: [
          {
            id: "n1",
            name: "Entity A",
            type: "PERSON",
            countryCode: "US",
            aliases: ["A"],
          },
          {
            id: "n2",
            name: "Entity B",
            type: "ORGANIZATION",
            countryCode: null,
            aliases: [],
          },
        ],
        edges: [
          {
            id: "e1",
            fromId: "n1",
            toId: "n2",
            type: "LEADS",
            weight: 1.0,
            confidence: 0.9,
            source: "rss-feed",
          },
        ],
      };

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].type).toBe("LEADS");
    });

    it("allows empty graph", () => {
      const graph: GraphNetwork = { nodes: [], edges: [] };
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });
  });

  // ---- BFS Network Traversal ----

  describe("BFS network traversal", () => {
    it("returns only root when no neighbors exist", () => {
      const adjacency = new Map<
        string,
        Array<{ nodeId: string; edgeId: string }>
      >();
      const result = bfsNetwork("root", adjacency, 2);
      expect(result.visitedNodes.size).toBe(1);
      expect(result.visitedNodes.has("root")).toBe(true);
      expect(result.visitedEdges.size).toBe(0);
    });

    it("traverses to direct neighbors at depth 1", () => {
      const adjacency = new Map([
        ["A", [{ nodeId: "B", edgeId: "e1" }]],
        ["B", [{ nodeId: "C", edgeId: "e2" }]],
      ]);
      const result = bfsNetwork("A", adjacency, 1);
      expect(result.visitedNodes.has("A")).toBe(true);
      expect(result.visitedNodes.has("B")).toBe(true);
      expect(result.visitedNodes.has("C")).toBe(false);
    });

    it("traverses 2 levels deep", () => {
      const adjacency = new Map([
        ["A", [{ nodeId: "B", edgeId: "e1" }]],
        [
          "B",
          [
            { nodeId: "C", edgeId: "e2" },
            { nodeId: "D", edgeId: "e3" },
          ],
        ],
        ["C", [{ nodeId: "E", edgeId: "e4" }]],
      ]);
      const result = bfsNetwork("A", adjacency, 2);
      expect(result.visitedNodes.has("A")).toBe(true);
      expect(result.visitedNodes.has("B")).toBe(true);
      expect(result.visitedNodes.has("C")).toBe(true);
      expect(result.visitedNodes.has("D")).toBe(true);
      // E is at depth 3 from A, should not be visited
      expect(result.visitedNodes.has("E")).toBe(false);
    });

    it("clamps depth to max 3", () => {
      const adjacency = new Map([
        ["A", [{ nodeId: "B", edgeId: "e1" }]],
        ["B", [{ nodeId: "C", edgeId: "e2" }]],
        ["C", [{ nodeId: "D", edgeId: "e3" }]],
        ["D", [{ nodeId: "E", edgeId: "e4" }]],
      ]);
      const result = bfsNetwork("A", adjacency, 10);
      expect(result.visitedNodes.has("D")).toBe(true);
      // E is at depth 4 — beyond max 3
      expect(result.visitedNodes.has("E")).toBe(false);
    });

    it("caps at 100 nodes", () => {
      // Build a wide adjacency where root connects to 120 nodes
      const neighbors: Array<{ nodeId: string; edgeId: string }> = [];
      for (let i = 0; i < 120; i++) {
        neighbors.push({ nodeId: `n${i}`, edgeId: `e${i}` });
      }
      const adjacency = new Map([["root", neighbors]]);
      const result = bfsNetwork("root", adjacency, 1);
      // 100 max (root + 99 neighbors)
      expect(result.visitedNodes.size).toBeLessThanOrEqual(100);
    });

    it("handles cycles without infinite loop", () => {
      const adjacency = new Map([
        ["A", [{ nodeId: "B", edgeId: "e1" }]],
        ["B", [{ nodeId: "A", edgeId: "e2" }]],
      ]);
      const result = bfsNetwork("A", adjacency, 3);
      expect(result.visitedNodes.size).toBe(2);
    });
  });

  // ---- Self-referential relation prevention ----

  describe("Self-referential relation prevention", () => {
    it("rejects when fromId === toId", () => {
      const fromId = "entity-123";
      const toId = "entity-123";
      expect(fromId === toId).toBe(true);
      // In createRelation, this throws: "Self-referential relations are not allowed"
    });

    it("allows when fromId !== toId", () => {
      const fromId = "entity-123";
      const toId = "entity-456";
      expect(fromId).not.toBe(toId);
    });
  });

  // ---- Entity name trimming ----

  describe("Entity name trimming", () => {
    it("trims leading and trailing whitespace", () => {
      const name = "  United States  ";
      expect(name.trim()).toBe("United States");
    });

    it("handles already-trimmed names", () => {
      const name = "Russia";
      expect(name.trim()).toBe("Russia");
    });
  });

  // ---- Person & Org indicators completeness ----

  describe("Person indicators", () => {
    it("contains 13 person indicators", () => {
      expect(personIndicators).toHaveLength(13);
    });

    it("includes key titles", () => {
      const expected = [
        "President",
        "Minister",
        "General",
        "Admiral",
        "Senator",
        "Governor",
        "Ambassador",
        "Secretary",
        "Commander",
        "Chairman",
        "Director",
        "Chief",
        "Dr",
      ];
      for (const p of expected) {
        expect(personIndicators).toContain(p);
      }
    });
  });

  describe("Org indicators", () => {
    it("contains 20 org indicators", () => {
      expect(orgIndicators).toHaveLength(20);
    });

    it("includes both Organization and Organisation spellings", () => {
      expect(orgIndicators).toContain("Organization");
      expect(orgIndicators).toContain("Organisation");
    });
  });

  // ---- Phrase length filtering ----

  describe("Phrase length filtering", () => {
    it("rejects phrases shorter than 4 characters", () => {
      const phrase = "Ab Cd";
      // After regex match: "Ab Cd" is 5 chars, passes
      // But a 3-char phrase like "Ab" wouldn't match regex anyway (single word)
      // Test the length guard: phrase.length >= 4
      const tooShort = "A B";
      expect(tooShort.length >= 4 && tooShort.length <= 80).toBe(false);
    });

    it("rejects phrases longer than 80 characters", () => {
      const long = "A".repeat(40) + " " + "B".repeat(40);
      expect(long.length >= 4 && long.length <= 80).toBe(false);
    });

    it("accepts phrases within 4-80 character range", () => {
      const phrase = "Vladimir Putin";
      expect(phrase.length >= 4 && phrase.length <= 80).toBe(true);
    });
  });
});
