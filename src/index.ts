#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';

import { GongApiClient } from './api/client.js';
import { UserService } from './services/user-service.js';
import { CallService } from './services/call-service.js';
import { TranscriptService } from './services/transcript-service.js';

// Redirect all console output to stderr for logging
const originalConsole = { ...console };
console.log = (...args) => originalConsole.error(...args);
console.info = (...args) => originalConsole.error(...args);
console.warn = (...args) => originalConsole.error(...args);

// Load environment variables
dotenv.config();

// Get credentials from environment variables
const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const GONG_BASE_URL = process.env.GONG_BASE_URL || 'https://api.gong.io';

// Check for required environment variables
if (!GONG_ACCESS_KEY || !GONG_ACCESS_KEY_SECRET) {
  console.error("Error: GONG_ACCESS_KEY and GONG_ACCESS_KEY_SECRET environment variables are required");
  process.exit(1);
}

// Initialize API client and services
const apiClient = new GongApiClient(GONG_ACCESS_KEY, GONG_ACCESS_KEY_SECRET, GONG_BASE_URL);
const userService = new UserService(apiClient);
const transcriptService = new TranscriptService(apiClient, userService);
const callService = new CallService(apiClient, userService, transcriptService);

// Create MCP server
const server = new McpServer({
  name: "gong-cloud",
  version: "0.1.0",
});

// Define tools
server.tool(
  "list_calls",
  {
    fromDateTime: z.string().optional().describe("Start date/time in ISO format (e.g. 2024-03-01T00:00:00Z)"),
    toDateTime: z.string().optional().describe("End date/time in ISO format (e.g. 2024-03-31T23:59:59Z)"),
    limit: z.number().optional().describe("Maximum number of calls to return"),
  },
  async ({ fromDateTime, toDateTime, limit }) => {
    try {
      const calls = await callService.listCalls({ fromDateTime, toDateTime, limit });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `Found ${calls.length} calls${fromDateTime ? ` from ${fromDateTime}` : ''}${toDateTime ? ` to ${toDateTime}` : ''}`,
            calls
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Error listing calls: ${error}`);
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "get_call_details",
  {
    callId: z.string().describe("ID of the call to retrieve"),
    includeTranscript: z.boolean().optional().describe("Whether to include the transcript in the response"),
    transcriptFormat: z.enum(["concise", "full", "raw"]).optional().describe("Format of the transcript (concise, full, or raw)"),
    maxSegments: z.number().optional().describe("Maximum number of transcript segments to include (0 for all)"),
    maxSentences: z.number().optional().describe("Maximum number of sentences per segment (0 for all)"),
  },
  async ({ callId, includeTranscript, transcriptFormat, maxSegments, maxSentences }) => {
    try {
      const result = await callService.getCall({
        callId,
        includeTranscript,
        transcriptFormat: transcriptFormat as 'concise' | 'full' | 'raw',
        maxSegments,
        maxSentences
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Error getting call details: ${error}`);
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "find_users",
  {
    name: z.string().optional().describe("Name to search for (can be partial)"),
    email: z.string().optional().describe("Email to search for (can be partial)"),
    id: z.string().optional().describe("Exact user ID to find"),
  },
  async ({ name, email, id }) => {
    try {
      if (!name && !email && !id) {
        throw new Error("At least one of name, email, or id must be provided");
      }
      
      const users = await userService.findUsers(name, email, id);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `Found ${users.length} users matching the criteria`,
            users
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Error finding users: ${error}`);
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function runServer() {
  console.log(`Starting Gong Cloud MCP server...`);
  console.log(`Using API URL: ${GONG_BASE_URL}`);
  
  // Initialize transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});