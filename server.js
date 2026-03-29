import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENERATED_DIR = path.join(__dirname, "generated");
const HTTP_PORT = 3000;

// ── HTTP + WebSocket server ────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/viewer", (_req, res) => {
  res.sendFile(path.join(__dirname, "viewer.html"));
});

app.post("/save", (req, res) => {
  const { xml, filename } = req.body;
  if (!xml) return res.status(400).json({ error: "Missing xml" });

  const safeName = (filename || "diagram").replace(/[^a-zA-Z0-9_\-]/g, "_");
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${safeName}.drawio`);
  fs.writeFileSync(filePath, xml);
  res.json({ ok: true, path: filePath });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

let activeSocket = null;
let pendingXml = null;

wss.on("connection", (ws) => {
  activeSocket = ws;

  if (pendingXml) {
    ws.send(JSON.stringify({ action: "load", xml: pendingXml }));
    pendingXml = null;
  }

  ws.on("close", () => {
    if (activeSocket === ws) activeSocket = null;
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.error(`HTTP/WS server listening on http://localhost:${HTTP_PORT}`);
});

// ── MCP Server (stdio) ────────────────────────────────────────────────

const server = new Server(
  { name: "my-private-drawio", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "draw_diagram",
        description: "Renders draw.io (mxGraph) XML into a visual diagram.",
        inputSchema: {
          type: "object",
          properties: {
            xml: { type: "string", description: "The raw draw.io XML code" }
          },
          required: ["xml"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "draw_diagram") {
    const xmlContent = request.params.arguments.xml;

    // Always save the raw XML as a backup
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    const drawioFilePath = path.join(GENERATED_DIR, "diagram.drawio");
    fs.writeFileSync(drawioFilePath, xmlContent);

    if (activeSocket && activeSocket.readyState === activeSocket.OPEN) {
      // Browser already open — push new XML over WebSocket
      activeSocket.send(JSON.stringify({ action: "load", xml: xmlContent }));
    } else {
      // No browser connected yet — store XML and open the viewer
      pendingXml = xmlContent;
      await open(`http://localhost:${HTTP_PORT}/viewer`);
    }

    return {
      content: [{
        type: "text",
        text: `Diagram opened in browser (http://localhost:${HTTP_PORT}/viewer) and saved to ${drawioFilePath}`
      }]
    };
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("My Private Draw.io MCP Server is running!");
