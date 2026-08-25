/**
 * chatGraph.js
 * 
 * LangGraph state graph for the chat agent.
 * Defines the workflow: receives messages → processes with LLM → returns response.
 * 
 * NOTE: This is a simple conversational agent. If more complex multi-step
 * workflows, tool usage, or agent loops are needed, consider converting
 * to Python LangGraph which has a more mature ecosystem.
 */

import { StateGraph, MessagesAnnotation, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { CHAT_AGENT_SYSTEM_PROMPT, TOPIC_GENERATION_PROMPT } from "../prompts/system.js";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

/**
 * Creates a configured Gemini model instance
 * @param {string} apiKey - Google AI API key
 * @returns {ChatGoogleGenerativeAI} Configured model
 */
export function createModel(apiKey) {
    return new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        apiKey: apiKey,
        temperature: 0.7,
        maxOutputTokens: 2048,
    });
}

// ============================================================================
// GRAPH NODES
// ============================================================================

/**
 * Agent node - processes messages with the LLM
 * @param {object} state - Current graph state with messages
 * @param {object} config - Runtime config including API key
 * @returns {object} Updated state with AI response
 */
async function agentNode(state, config) {
    const model = createModel(config.configurable?.apiKey);

    // Build messages array with system prompt
    const systemMessage = new SystemMessage(CHAT_AGENT_SYSTEM_PROMPT);
    const allMessages = [systemMessage, ...state.messages];

    // Invoke the model
    const response = await model.invoke(allMessages);

    return {
        messages: [response],
    };
}

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

/**
 * Create and compile the chat graph
 * Simple flow: START → agent → END
 */
export function createChatGraph() {
    const workflow = new StateGraph(MessagesAnnotation)
        .addNode("agent", agentNode)
        .addEdge("__start__", "agent")
        .addEdge("agent", END);

    return workflow.compile();
}

// ============================================================================
// TOPIC GENERATION
// ============================================================================

/**
 * Generate a topic title for the conversation
 * @param {Array} messages - Conversation messages
 * @param {string} apiKey - Google AI API key
 * @returns {Promise<string>} Generated topic title
 */
export async function generateTopicTitle(messages, apiKey) {
    const model = createModel(apiKey);

    // Build context from messages (limit to first few for efficiency)
    const contextMessages = messages.slice(0, 6);
    const conversationSummary = contextMessages
        .map(m => `${m._getType?.() === 'human' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

    const prompt = `${TOPIC_GENERATION_PROMPT}\n\nConversation:\n${conversationSummary}`;

    const response = await model.invoke([new HumanMessage(prompt)]);

    // Extract just the topic text
    return response.content.toString().trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    createChatGraph,
    createModel,
    generateTopicTitle,
};
