import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const widgetHtml = readFileSync("public/sports-widget.html", "utf8");

function createSportsServer() {
  const server = new McpServer({
    name: "bluejays-dashboard",
    version: "0.1.0"
  });

  server.registerResource(
    "sports-widget",
    "ui://widget/sports.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/sports.html",
          mimeType: "text/html+skybridge",
          text: widgetHtml,
          _meta: {
            "openai/widgetPrefersBorder": true
          }
        }
      ]
    })
  );

  server.registerTool(
    "get_bluejays_dashboard",
    {
      title: "Blue Jays Dashboard",
      description: "Get Toronto Blue Jays recent results and upcoming games.",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": "ui://widget/sports.html",
        "openai/toolInvocation/invoking": "Loading Blue Jays dashboard",
        "openai/toolInvocation/invoked": "Loaded Blue Jays dashboard"
      }
    },
    async () => {
      const recentRes = await fetch(
        "https://www.thesportsdb.com/api/v1/json/123/eventslast.php?id=135265"
      );
      const upcomingRes = await fetch(
        "https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=135265"
      );

      const recent = await recentRes.json();
      const upcoming = await upcomingRes.json();

      return {
        content: [
          {
            type: "text",
            text: "Loaded Toronto Blue Jays dashboard."
          }
        ],
        structuredContent: {
          team: "Toronto Blue Jays",
          teamId: "135265",
          recentGames: recent.results || [],
          upcomingGames: upcoming.events || []
        },
        _meta: {
          "openai/outputTemplate": "ui://widget/sports.html"
        }
      };
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res
      .writeHead(200, { "content-type": "text/plain" })
      .end("Blue Jays MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createSportsServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Blue Jays MCP server listening on http://localhost:${port}${MCP_PATH}`);
});