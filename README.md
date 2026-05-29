# Kanbn Model Context Protocol (MCP) Server

An MCP server to integrate with a Kanbn (open-source Trello-like project management board) instance API. This allows LLMs and AI agents (such as Antigravity IDE, Claude Desktop, Cursor, etc.) to list, create, search, and update workspaces, boards, lists, and tasks.

## Features

This server registers the following MCP Tools:

### Workspaces
- `kanbn_list_workspaces`: List all workspaces.
- `kanbn_get_workspace`: Get details of a specific workspace.
- `kanbn_search_workspace`: Search for boards and cards within a workspace.

### Boards
- `kanbn_list_boards`: List all boards (optionally filtered by workspace).
- `kanbn_get_board`: Retrieve detailed board information (including columns and cards).
- `kanbn_create_board`: Create a board in a workspace.
- `kanbn_update_board`: Update details of a board.
- `kanbn_delete_board`: Delete a board.

### Lists (Columns)
- `kanbn_create_list`: Add a column to a board.
- `kanbn_update_list`: Rename or move a column.
- `kanbn_delete_list`: Delete a column.

### Cards (Tasks)
- `kanbn_get_card`: Retrieve task details.
- `kanbn_create_card`: Create a card inside a column.
- `kanbn_update_card`: Update details of a card or move it to a different column/position.
- `kanbn_delete_card`: Delete a card.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A running Kanbn instance (e.g., self-hosted or cloud)
- A Kanbn API Key (obtained from your Kanbn account settings)

### Installation
Clone this repository and install the dependencies:
```bash
npm install
```

### Configuration
Create a `.env` file in the root directory based on the `.env.example` file:
```bash
# Kanbn API endpoint
KANBN_BASE_URL=https://your-kanbn-instance.com/api/v1

# Your API Key
KANBN_API_KEY=your_secret_api_key
```

### Build
Compile the TypeScript code to JavaScript:
```bash
npm run build
```

---

## Running with MCP Clients

To use this server with your favorite MCP client (like Claude Desktop or Antigravity IDE), add the configuration below to your MCP settings file (typically `mcp_config.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kanbn-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/kanbn-mcp-server/dist/index.js"],
      "env": {
        "KANBN_BASE_URL": "https://your-kanbn-instance.com/api/v1",
        "KANBN_API_KEY": "your_secret_api_key"
      }
    }
  }
}
```

Replace `/absolute/path/to/kanbn-mcp-server` with the actual path to this folder on your machine.

## License
Licensed under the ISC License.
