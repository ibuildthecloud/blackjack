import { createUIResource } from "@mcp-ui/server";

export function gameUI(gameId: string) {
  return createUIResource({
    uri: `ui://game/${gameId}`,
    content: {
      type: "externalUrl",
      iframeUrl: `http://localhost:3000/game/${gameId}?u=${crypto.randomUUID()}`,
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
