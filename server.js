import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import os from "os";
import path from "path";
import open from "open";

// 1. Create the MCP Server
const server = new Server(
  { name: "my-private-drawio", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 2. Tell Claude what this tool does
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

// 3. Handle the request when Claude actually calls the tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "draw_diagram") {
    const xmlContent = request.params.arguments.xml;
    
    // The Docker canvas URL you are hosting locally
    const DRAWIO_URL = "http://localhost:8080/?embed=1&ui=min&spin=1&proto=json";

    // 4. Create a temporary HTML file that acts as the viewer
    // This HTML loads your Docker container in an iframe and uses postMessage to send the XML
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; overflow:hidden;">
        <iframe id="drawio-frame" src="${DRAWIO_URL}" style="width:100vw; height:100vh; border:none;"></iframe>
        <script>
          const iframe = document.getElementById('drawio-frame');
          const rawXml = \`${xmlContent}\`; // Injecting Claude's XML here

          // Listen for the Docker canvas to say "I'm ready!"
          window.addEventListener('message', function(e) {
            if (e.data.length > 0) {
              const msg = JSON.parse(e.data);
              if (msg.event === 'init') {
                // The canvas is ready, send the XML via postMessage!
                iframe.contentWindow.postMessage(JSON.stringify({
                  action: 'load',
                  xml: rawXml
                }), '*');
              }
            }
          });
        </script>
      </body>
      </html>
    `;

    // 5. Save the HTML to your Mac's temporary folder and open it
    const tempFilePath = path.join(os.tmpdir(), `diagram-${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, htmlTemplate);
    
    // Open the HTML file in your Mac's default browser
    await open(`file://${tempFilePath}`);

    // Tell Claude it was successful
    return {
      content: [{ type: "text", text: "Diagram successfully opened in the user's browser!" }]
    };
  }
  throw new Error("Tool not found");
});

// 6. Start listening to Claude via terminal standard input/output (stdio)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("My Private Draw.io MCP Server is running!");
