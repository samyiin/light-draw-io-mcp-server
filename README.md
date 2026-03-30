# light-draw-io-mcp-server

This is an MCP server that lets Claude draw diagrams with draw.io. 100% runs locally so no problem with data privacy.

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

### macOS

```bash
brew install --cask docker
open -a Docker
brew install node
```

### Install dependencies

```bash
cd ~/light-draw-io-mcp-server
npm install
```

## Quick Start

### 1. Start the draw.io server (js file server)

```bash
open -a Docker
docker run -d -p 8080:8080 jgraph/drawio
```

This starts draw.io locally on port `8080`.

### 2. Add this MCP server to Claude

```bash
claude mcp add drawio -- node ~/light-draw-io-mcp-server/server.js
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

## MCP Tools

This server exposes two tools:

### `draw_diagram`

- Input: raw draw.io XML
- Behavior: opens the rendered diagram in your default browser and saves the raw XML as a `.drawio` file

Example input:

```json
{
  "xml": "<mxfile>...</mxfile>"
}
```

### `read_diagram`

- Input: none
- Behavior: returns the draw.io XML currently on the canvas, including any edits you've made in the browser

## Troubleshooting

If you see `Error: listen EADDRINUSE: address already in use :::3000` when starting the server, a leftover Node process is still holding the port. Find and kill it:

```bash
lsof -ti :3000 | xargs kill
```

Then restart with `node server.js`.

## Utility

You can edit diagrams directly in the browser — drag lines, add boxes, rearrange shapes, etc. When you're happy with your changes, click save. You can also change the filename in the toolbar before saving to keep multiple versions.

## Limitations

- **Each AI-generated diagram overwrites the viewer.** If the AI generates a new diagram, it replaces whatever is currently rendered in the browser. If you have unsaved local edits, save them first — nothing is persisted until you click save.
- **Only one instance per machine.** The HTTP/WebSocket server is hardcoded to port `3000`, so you can only run one copy of the MCP server at a time. The MCP protocol itself uses stdio (one process per Claude session), so if the port were configurable, multiple Claude sessions could each run their own independent instance.
- **Single WebSocket connection.** The server tracks only one active WebSocket (`activeSocket`). If you open a second browser tab, the first tab silently loses its connection with no error or notification. Multi-tab support would require tracking multiple sockets and broadcasting updates to all of them.
- **`read_diagram` may return stale data.** The tool reads from the `~current.drawio` file on disk rather than querying the live canvas. If autosave hasn't fired since your last edit, the returned XML won't reflect your latest changes.
- **`draw_diagram` always overwrites the same file.** Every AI-generated diagram clobbers `generated/diagram.drawio`. There's no automatic history or versioning — you must manually save with a different filename to keep prior work.
- **Hardcoded ports.** Both port `3000` (HTTP/WS) and port `8080` (draw.io Docker) are hardcoded with no environment variable overrides. If either port is already in use, the server crashes.
- **No input validation on the MCP tool handler.** If `draw_diagram` is called with missing or malformed arguments, the server crashes instead of returning a graceful error.
- **No graceful shutdown.** The process doesn't handle `SIGINT`/`SIGTERM`, so there's no cleanup of the HTTP server, WebSocket connections, or in-flight state on exit.

## Known Issues / Improvements

- [ ] Make `read_diagram` query the live canvas via WebSocket instead of reading from disk
- [ ] Add input validation and error handling in the MCP tool handlers
- [ ] Make ports configurable via environment variables (`PORT`, `DRAWIO_PORT`)
- [ ] Fix `package.json` (`main` points to `index.js` instead of `server.js`, missing `start` script and description)
- [ ] Add `docker-compose.yml` for one-command setup
- [ ] Add a reconnection banner in the viewer when WebSocket disconnects
- [ ] Handle the `export` event correctly (draw.io may send PNG/SVG data, not XML)
- [ ] Add `postMessage` target origin instead of `'*'` in `viewer.html`
- [ ] Add MCP tools for listing/loading/deleting saved diagrams
- [ ] Use async file I/O instead of `writeFileSync`/`readFileSync`
- [ ] Add `SIGINT`/`SIGTERM` handlers for graceful shutdown
- [ ] Add a `LICENSE` file (currently declared as ISC in `package.json` but no file exists)

## Notes

- The server expects the draw.io engine to be available at `http://localhost:8080`.
- The server also runs an HTTP/WebSocket server on port `3000` for live diagram updates and saving.
- The browser view is served at `http://localhost:3000/viewer`.
- Diagrams are saved inside `generated/` as `.drawio` files, which you can open later in the draw.io desktop app.
- The server communicates over stdio, which is why it works with `claude mcp add ... -- node server.js`.
