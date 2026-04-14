export default function handler(req, res) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost";

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end(`Blue Jays MCP server\n${protocol}://${host}/mcp`);
}
