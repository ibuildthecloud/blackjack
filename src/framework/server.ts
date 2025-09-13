import type { Tool } from "./tools";
import { Middleware as McpMiddleware } from "./middleware";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ContentBlock,
  Implementation,
} from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandler } from "express";

export function Middleware(
  serverInfo: Implementation,
  opts: {
    tools?: Tool[];
  },
): RequestHandler {
  return McpMiddleware(() => {
    const server = new McpServer(serverInfo);

    for (const tool of opts.tools ?? []) {
      const { name, execute, ...copy } = { ...tool };

      server.registerTool(name, copy, async (...args) => {
        const result = await execute(...args);
        const simpleContent: ContentBlock[] = [];
        let newResult: CallToolResult = {
          content: [],
        };

        if (typeof result === "string") {
          simpleContent.push({
            type: "text",
            text: result,
          });
        } else {
          if (result.text) {
            simpleContent.push({
              type: "text",
              text: result.text,
            });
          }
          if (result.ui) {
            simpleContent.push(
              ...(Array.isArray(result.ui) ? result.ui : [result.ui]),
            );
          }

          delete result.ui;
          delete result.text;

          if ("content" in result) {
            newResult = result;
          }
        }

        newResult.content.push(...simpleContent);
        return newResult;
      });
    }

    return server;
  });
}
