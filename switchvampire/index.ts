import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "switchvampire",
  title: "switchvampire", // display name
  version: "1.0.0",
  description: "MCP server with MCP Apps integration",
  baseUrl: process.env.MCP_URL || "http://localhost:3000", // Full base URL (e.g., https://myserver.com)
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com", // Can be customized later
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

/**
 * TOOL THAT RETURNS A WIDGET
 * The `widget` config tells mcp-use which widget component to render.
 * The `widget()` helper in the handler passes props to that component.
 * Docs: https://mcp-use.com/docs/typescript/server/mcp-apps
 */

// Fruits data — color values are Tailwind bg-[] classes used by the carousel UI
const fruits = [
  { fruit: "mango", color: "bg-[#FBF1E1] dark:bg-[#FBF1E1]/10" },
  { fruit: "pineapple", color: "bg-[#f8f0d9] dark:bg-[#f8f0d9]/10" },
  { fruit: "cherries", color: "bg-[#E2EDDC] dark:bg-[#E2EDDC]/10" },
  { fruit: "coconut", color: "bg-[#fbedd3] dark:bg-[#fbedd3]/10" },
  { fruit: "apricot", color: "bg-[#fee6ca] dark:bg-[#fee6ca]/10" },
  { fruit: "blueberry", color: "bg-[#e0e6e6] dark:bg-[#e0e6e6]/10" },
  { fruit: "grapes", color: "bg-[#f4ebe2] dark:bg-[#f4ebe2]/10" },
  { fruit: "watermelon", color: "bg-[#e6eddb] dark:bg-[#e6eddb]/10" },
  { fruit: "orange", color: "bg-[#fdebdf] dark:bg-[#fdebdf]/10" },
  { fruit: "avocado", color: "bg-[#ecefda] dark:bg-[#ecefda]/10" },
  { fruit: "apple", color: "bg-[#F9E7E4] dark:bg-[#F9E7E4]/10" },
  { fruit: "pear", color: "bg-[#f1f1cf] dark:bg-[#f1f1cf]/10" },
  { fruit: "plum", color: "bg-[#ece5ec] dark:bg-[#ece5ec]/10" },
  { fruit: "banana", color: "bg-[#fdf0dd] dark:bg-[#fdf0dd]/10" },
  { fruit: "strawberry", color: "bg-[#f7e6df] dark:bg-[#f7e6df]/10" },
  { fruit: "lemon", color: "bg-[#feeecd] dark:bg-[#feeecd]/10" },
];

server.tool(
  {
    name: "search-tools",
    description: "Search for fruits and display the results in a visual widget",
    schema: z.object({
      query: z.string().optional().describe("Search query to filter fruits"),
    }),
    widget: {
      name: "product-search-result",
      invoking: "Searching...",
      invoked: "Results loaded",
    },
  },
  async ({ query }) => {
    const results = fruits.filter(
      (f) => !query || f.fruit.toLowerCase().includes(query.toLowerCase())
    );

    // let's emulate a delay to show the loading state
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return widget({
      props: { query: query ?? "", results },
      output: text(
        `Found ${results.length} fruits matching "${query ?? "all"}"`
      ),
    });
  }
);

server.tool(
  {
    name: "get-fruit-details",
    description: "Get detailed information about a specific fruit",
    schema: z.object({
      fruit: z.string().describe("The fruit name"),
    }),
    outputSchema: z.object({
      fruit: z.string(),
      color: z.string(),
      facts: z.array(z.string()),
    }),
  },
  async ({ fruit }) => {
    const found = fruits.find(
      (f) => f.fruit?.toLowerCase() === fruit?.toLowerCase()
    );
    return object({
      fruit: found?.fruit ?? fruit,
      color: found?.color ?? "unknown",
      facts: [
        `${fruit} is a delicious fruit`,
        `Color: ${found?.color ?? "unknown"}`,
      ],
    });
  }
);

// Context graph node/edge data
const contextNodes = [
  { id: "nextjs", label: "Next.js", category: "project", source: "claude", x: 350, y: 80, confidence: 0.95 },
  { id: "typescript", label: "TypeScript", category: "project", source: "chatgpt", x: 200, y: 130, confidence: 0.9 },
  { id: "supabase", label: "Supabase", category: "project", source: "claude", x: 500, y: 130, confidence: 0.85 },
  { id: "pgvector", label: "pgvector", category: "code", source: "chatgpt", x: 600, y: 220, confidence: 0.7 },
  { id: "ceo", label: "CEO Role", category: "fact", source: "claude", x: 100, y: 250, confidence: 0.8 },
  { id: "preseed", label: "Pre-seed Raise", category: "decision", source: "perplexity", x: 250, y: 320, confidence: 0.75 },
  { id: "uga", label: "UGA Target", category: "fact", source: "gemini", x: 400, y: 380, confidence: 0.6 },
  { id: "kayak", label: "Kayak for AI", category: "project", source: "chatgpt", x: 150, y: 380, confidence: 0.85 },
  { id: "darktheme", label: "Dark Theme Pref", category: "preference", source: "claude", x: 550, y: 320, confidence: 0.65 },
  { id: "concise", label: "Concise Pref", category: "preference", source: "chatgpt", x: 450, y: 250, confidence: 0.6 },
  { id: "gpt4mini", label: "GPT-4.1 Mini Router", category: "code", source: "chatgpt", x: 300, y: 200, confidence: 0.8 },
  { id: "starter", label: "$14.99 Starter Tier", category: "decision", source: "perplexity", x: 100, y: 130, confidence: 0.7 },
];

const contextEdges = [
  { from: "nextjs", to: "typescript" },
  { from: "nextjs", to: "supabase" },
  { from: "supabase", to: "pgvector" },
  { from: "nextjs", to: "gpt4mini" },
  { from: "typescript", to: "gpt4mini" },
  { from: "ceo", to: "preseed" },
  { from: "ceo", to: "kayak" },
  { from: "preseed", to: "starter" },
  { from: "kayak", to: "gpt4mini" },
  { from: "kayak", to: "uga" },
  { from: "darktheme", to: "concise" },
  { from: "supabase", to: "darktheme" },
  { from: "starter", to: "uga" },
  { from: "pgvector", to: "gpt4mini" },
  { from: "preseed", to: "uga" },
];

server.tool(
  {
    name: "show-context-graph",
    description: "Display the SwitchMemory context graph showing user knowledge nodes and relationships",
    schema: z.object({}),
    widget: {
      name: "context-graph",
      invoking: "Loading context graph...",
      invoked: "Context graph loaded",
    },
  },
  async () => {
    return widget({
      props: { nodes: contextNodes, edges: contextEdges },
      output: text(
        `Displaying context graph with ${contextNodes.length} nodes and ${contextEdges.length} edges`
      ),
    });
  }
);

server.listen().then(() => {
  console.log(`Server running`);
});
