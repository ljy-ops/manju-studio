/**
 * tools/index.js
 * 
 * Agent tool definitions for the chat agent.
 * Tools allow the agent to perform actions beyond just conversation.
 * 
 * NOTE: If more complex agent capabilities are needed (e.g., web search,
 * canvas manipulation, code execution), consider converting to Python
 * which has a more mature LangGraph ecosystem.
 * 
 * ARCHITECTURE: Add new tools as separate files in this directory,
 * then import and export them here.
 */

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Currently, the agent is conversational-only.
 * Tools can be added here when needed, for example:
 * 
 * import { tool } from "@langchain/core/tools";
 * import { z } from "zod";
 * 
 * export const searchWebTool = tool(
 *   async ({ query }) => {
 *     // Implementation
 *     return "Search results...";
 *   },
 *   {
 *     name: "search_web",
 *     description: "Search the web for information",
 *     schema: z.object({
 *       query: z.string().describe("The search query"),
 *     }),
 *   }
 * );
 */

// Empty array - agent is conversational-only for now
export const agentTools = [];

export default agentTools;
