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

### 1. Start the draw.io engine

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
- Behavior: opens the rendered diagram in your default browser

Example input:

```json
{
  "xml": "<mxfile>...</mxfile>"
}
```

## Notes

- The server expects the draw.io engine to be available at `http://localhost:8080`.
- The browser view is created as an HTML file inside `.generated/` in this repo.
- The server communicates over stdio, which is why it works with `claude mcp add ... -- node server.js`.
