import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { EdgeRelationship } from "../graph/store.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedText(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8191),
  });
  return res.data[0].embedding;
}

export type ClassifiedEdge = {
  relationship: EdgeRelationship | "none";
  weight: number;
};

// Classify relationships between a new node and a list of candidates.
// "none" means no edge should be created — the nodes are not meaningfully connected.
// Uses gpt-4o-mini structured output. Fire-and-forget safe, ~$0.00002/call.
export async function classifyRelationships(
  newContent: string,
  newType: string,
  candidates: { id: string; content: string; type: string }[]
): Promise<Array<{ id: string } & ClassifiedEdge>> {
  if (!candidates.length) return [];

  const RelEnum = z.enum([
    "none",         // no meaningful connection — DO NOT create an edge
    "related_to",   // genuinely about the same specific topic
    "part_of",      // candidate is a sub-component or detail of the new node
    "contradicts",  // candidate directly conflicts with the new node
    "supersedes",   // new node replaces or updates the candidate
    "depends_on",   // new node requires the candidate to make sense
    "used_in",      // candidate is a tool/technology applied in the new node
  ]);

  const BatchSchema = z.object({
    edges: z.array(z.object({
      index:        z.number().int(),
      relationship: RelEnum,
      weight:       z.number().min(0).max(1),
    }))
  });

  const candidateList = candidates
    .map((c, i) => `[${i}] (${c.type}) ${c.content}`)
    .join("\n");

  const res = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You decide which edges to draw in a personal AI memory graph.\n\n" +
          "ONLY create an edge if a person recalling one memory would GENUINELY benefit from " +
          "being shown the other. Ask yourself: if I'm thinking about A, does B actually help " +
          "me understand or act on A? If the answer is 'not really', use none.\n\n" +
          "Relationship types (use the most specific one that fits):\n" +
          "- none        → no real connection, or only surface-level word overlap — DEFAULT when unsure\n" +
          "- related_to  → same specific topic AND both memories together add more context than either alone\n" +
          "- part_of     → candidate is a direct sub-component or detail of the new node's subject\n" +
          "- contradicts → candidate directly conflicts (different preference, decision, or fact)\n" +
          "- supersedes  → new node is an update or replacement of the candidate\n" +
          "- depends_on  → new node cannot be understood without the candidate\n" +
          "- used_in     → candidate is a specific tool/tech/method that appears inside the new node\n\n" +
          "Weight = how strong the dependency is (0.5–1.0 for real edges, 0 for none).\n\n" +
          "Rules:\n" +
          "- Prefer none over a weak related_to. A sparse graph is better than a noisy one.\n" +
          "- Two facts about the same broad domain (e.g. 'uses TypeScript' and 'works at a startup') " +
          "are NOT related_to unless they directly inform each other.\n" +
          "- contradicts and supersedes are high-value — use them when they fit, even if weight is moderate.",
      },
      {
        role: "user",
        content: `NEW NODE (${newType}): ${newContent}\n\nCANDIDATES:\n${candidateList}`,
      },
    ],
    response_format: zodResponseFormat(BatchSchema, "edges"),
    max_tokens: 400,
  });

  const parsed = res.choices[0].message.parsed;
  if (!parsed) return [];  // fail silent — fire-and-forget, don't create junk edges on error

  return parsed.edges.map(e => ({
    id:           candidates[e.index]?.id ?? "",
    relationship: e.relationship as EdgeRelationship | "none",
    weight:       e.weight,
  })).filter(e => e.id);
}
