import "react-router";
import { createRequestHandler } from "@react-router/express";
import express from "express";
import { Middleware as Nanomcp } from "$framework";
import tools from "$tools";
import { bearerTokenMiddleware, wellKnown } from "./auth";

declare module "react-router" {
  interface AppLoadContext {
    VALUE_FROM_EXPRESS: string;
  }
}

export const app = express();

// app.get("/.well-known/oauth-authorization-server", wellKnown)
// app.get('/.well-known/oauth-protected-resource', (req, res) =>
//   res.json({
//     resource: `http://localhost:3000/mcp`,
//     authorization_servers: ['https://dependable-star-22-staging.authkit.app'],
//     bearer_methods_supported: ['header'],
//   }),
// );
// app.use(bearerTokenMiddleware)
app.use(
  "/mcp",
  Nanomcp(
    {
      name: "My MCP Server",
      version: "1.0.0",
    },
    { tools },
  ),
);

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return {
        VALUE_FROM_EXPRESS: "Hello from Express",
      };
    },
  }),
);
