import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const widgetHtml = readFileSync(
  new URL("../public/sports-widget.html", import.meta.url),
  "utf8"
);

export function createSportsServer() {
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
