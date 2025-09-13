import express, {
  type RequestHandler,
  type Request,
  type Response,
} from "express";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import header from "$framework/header";
import { validUUID } from "$lib/uuid";

export function Middleware(
  newServer: (req: Request, res: Response) => McpServer,
): RequestHandler {
  const middleware = new McpServerMiddleware(newServer);
  return middleware.middleware;
}

class McpServerMiddleware {
  private readonly transports: Record<string, StreamableHTTPServerTransport> =
    {};
  private readonly app = express();
  private readonly newServer: (
    req: Request,
    res: Response,
  ) => McpServer | Promise<McpServer>;

  get middleware(): RequestHandler {
    return this.app;
  }

  constructor(newServer: (req: Request, res: Response) => McpServer) {
    this.newServer = newServer;
    this.setup();
  }

  private setup = () => {
    this.app.use(express.json());
    this.app.post("/", this.post);
    this.app.get("/", this.post);
    this.app.delete("/", this.getDelete);
  };

  private newTransport = async (
    sessionId: string | undefined,
    req: Request,
    res: Response,
  ) => {
    let transport: StreamableHTTPServerTransport;
    if (sessionId) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      transport.sessionId = sessionId;
      this.transports[sessionId] = transport;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          this.transports[sessionId] = transport;
        },
      });
    }

    transport.onclose = () => {
      if (transport.sessionId) {
        delete this.transports[transport.sessionId];
      }
    };

    const server = await this.newServer(req, res);
    await server.connect(transport);
    return transport;
  };

  private post = async (req: Request, res: Response) => {
    const sessionId = header(req.headers, "mcp-session-id");

    let transport: StreamableHTTPServerTransport;

    if (sessionId && this.transports[sessionId]) {
      transport = this.transports[sessionId];
    } else if (
      (!sessionId && isInitializeRequest(req.body)) ||
      validUUID(sessionId)
    ) {
      transport = await this.newTransport(sessionId, req, res);
    } else {
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  };

  private getDelete = async (req: Request, res: Response) => {
    const sessionId = header(req.headers, "mcp-session-id");
    const transport = sessionId && this.transports[sessionId];

    if (!transport) {
      res
        .status(400)
        .send(
          `Invalid or missing session ID: ${sessionId ? sessionId.slice(0, 8) : "none"}`,
        );
      return;
    }
    await transport.handleRequest(req, res);
  };
}
