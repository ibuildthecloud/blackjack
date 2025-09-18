import { createUIResource } from "@mcp-ui/server";
import "dotenv/config";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";

export function gameUI(gameId: string) {
  return createUIResource({
    uri: `ui://game/${gameId}`,
    content: {
      type: "externalUrl",
      iframeUrl: `${PUBLIC_URL}/game/${gameId}?u=${crypto.randomUUID()}`,
    },
    uiMetadata: {
      "preferred-frame-size": ["100%", "100%"],
    },
    metadata: {
      "ai.nanobot.meta/workspace": true,
    },
    encoding: "text",
  });
}
