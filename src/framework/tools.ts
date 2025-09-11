import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape, ZodTypeAny } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { UIResource } from "@mcp-ui/server";

export type SimpleResult = {
  text?: string;
  ui?: UIResource | UIResource[];
};

export type ToolResult =
  | (CallToolResult & SimpleResult)
  | SimpleResult
  | string;
export type ToolCallback<Args extends undefined | ZodRawShape = undefined> =
  Args extends ZodRawShape
    ? (
        args: z.objectOutputType<Args, ZodTypeAny>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => ToolResult | Promise<ToolResult>
    : (
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => ToolResult | Promise<ToolResult>;

export type Tool<
  InputArgs extends ZodRawShape = ZodRawShape,
  OutputArgs extends ZodRawShape = ZodRawShape,
> = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: InputArgs;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  execute: ToolCallback<InputArgs>;
};

export function DefineTool<
  InputArgs extends ZodRawShape,
  OutputArgs extends ZodRawShape,
>(tool: Tool<InputArgs, OutputArgs>): Tool {
  return tool;
}
