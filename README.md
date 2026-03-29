# light-draw-io-mcp-server

This is an MCP server that lets Claude draw diagrams with draw.io.

It works by connecting Claude to a local Node.js MCP server, which then opens a browser page backed by a local draw.io engine running in Docker.

## How It Works

1. Start a local draw.io engine with Docker.
2. Register this repo's `server.js` as an MCP server in Claude.
3. Ask Claude to draw something.
4. Claude calls the `draw_diagram` tool.
5. The tool opens the diagram in your browser using the local draw.io engine.

## Prerequisites

- Docker
- Node.js
- Claude CLI with MCP support

Install dependencies:

```bash
npm install
```

## Quick Start

### 1. Start the draw.io server (js file server)

```bash
docker run -d -p 8080:8080 jgraph/drawio
```

This starts draw.io locally on port `8080`.

### 2. Add this MCP server to Claude

```bash
claude mcp add drawio -- node <your_project_dir>/light-draw-io-mcp-server/server.js
```

If your repo is in a different location, replace the path with your actual local path.


### 3. Use it from Claude

Now you can ask Claude to create diagrams with draw.io, for example:

```text
Draw a system architecture diagram for a web app with a frontend, API server, and database.
```

or:

```text
Create a flowchart for a user login process using draw.io.
```

## MCP Tool

This server exposes one tool:

### `draw_diagram`

- Input: raw draw.io XML
- Behavior: opens the rendered diagram in your default browser and saves the raw XML as a `.drawio` file

Example input:

```json
{
  "xml": "<mxfile>...</mxfile>"
}
```

## Troubleshooting

If you see `Error: listen EADDRINUSE: address already in use :::3000` when starting the server, a leftover Node process is still holding the port. Find and kill it:

```bash
lsof -ti :3000 | xargs kill
```

Then restart with `node server.js`.

## Utility

You can edit diagrams directly in the browser — drag lines, add boxes, rearrange shapes, etc. When you're happy with your changes, click save. You can also change the filename in the toolbar before saving to keep multiple versions.

## Limitations

- **AI cannot read the canvas.** The AI can push new diagrams to the viewer, but it has no way to read what is currently displayed. This means the AI always works from its own XML, not from your latest edits. (This could be added later.)
- **Each AI-generated diagram overwrites the viewer.** If the AI generates a new diagram, it replaces whatever is currently rendered in the browser. If you have unsaved local edits, save them first — nothing is persisted until you click save.
- **Closing the tab loses the diagram.** The diagram is pushed to the browser over WebSocket and only lives in memory. If you close the tab and reopen `http://localhost:3000/viewer`, the canvas will be empty — even if you previously saved. Saving writes a `.drawio` file to `generated/`, but the viewer does not reload from that file on startup.
- **Only one instance per machine.** The HTTP/WebSocket server is hardcoded to port `3000`, so you can only run one copy of the MCP server at a time. The MCP protocol itself uses stdio (one process per Claude session), so if the port were configurable, multiple Claude sessions could each run their own independent instance.

## Notes

- The server expects the draw.io engine to be available at `http://localhost:8080`.
- The server also runs an HTTP/WebSocket server on port `3000` for live diagram updates and saving.
- The browser view is served at `http://localhost:3000/viewer`.
- Diagrams are saved inside `generated/` as `.drawio` files, which you can open later in the draw.io desktop app.
- The server communicates over stdio, which is why it works with `claude mcp add ... -- node server.js`.
