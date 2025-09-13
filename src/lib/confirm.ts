import {
  ElicitResultSchema,
  type ServerNotification,
  type ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export async function confirm(
  ctx: RequestHandlerExtra<ServerRequest, ServerNotification>,
  message: string,
): Promise<boolean> {
  const resp = await ctx.sendRequest(
    {
      method: "elicitation/create",
      params: {
        message,
        requestedSchema: {
          type: "object",
          properties: {},
        },
      },
    },
    ElicitResultSchema,
  );
  switch (resp.action) {
    case "accept":
      return true;
    case "decline":
      return false;
    case "cancel":
      return false;
    default:
      throw new Error("Unexpected response");
  }
}
