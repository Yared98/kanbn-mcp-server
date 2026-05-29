import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KanbnClient } from "./client.js";

// 1. Initialize the MCP Server
const server = new McpServer({
  name: "kanbn-mcp-server",
  version: "1.0.0",
});

// 2. Initialize the Kanbn client
const client = new KanbnClient();

// -------------------------------------------------------------
// WORKSPACES TOOLS
// -------------------------------------------------------------

// List workspaces
server.registerTool(
  "kanbn_list_workspaces",
  {
    description: "List all workspaces in Kanbn",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const workspaces = await client.listWorkspaces();
      return {
        content: [{ type: "text", text: JSON.stringify(workspaces, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing workspaces: ${err.message}` }]
      };
    }
  }
);

// Get workspace details
server.registerTool(
  "kanbn_get_workspace",
  {
    description: "Get details of a specific workspace by ID or slug",
    inputSchema: z.object({
      workspaceId: z.string().describe("The workspace ID or slug"),
    }),
  },
  async ({ workspaceId }) => {
    try {
      const workspace = await client.getWorkspace(workspaceId);
      return {
        content: [{ type: "text", text: JSON.stringify(workspace, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving workspace '${workspaceId}': ${err.message}` }]
      };
    }
  }
);

// Search inside workspace
server.registerTool(
  "kanbn_search_workspace",
  {
    description: "Search for boards and cards within a specific workspace",
    inputSchema: z.object({
      workspaceId: z.string().describe("The workspace ID"),
      query: z.string().optional().describe("Search query string"),
    }),
  },
  async ({ workspaceId, query }) => {
    try {
      const results = await client.searchWorkspace(workspaceId, query);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching workspace '${workspaceId}': ${err.message}` }]
      };
    }
  }
);

// -------------------------------------------------------------
// BOARDS TOOLS
// -------------------------------------------------------------

// List all boards
server.registerTool(
  "kanbn_list_boards",
  {
    description: "List all boards available, optionally filtered by workspace",
    inputSchema: z.object({
      workspaceId: z.string().optional().describe("The workspace ID to filter boards by (optional)"),
    }),
  },
  async ({ workspaceId }) => {
    try {
      const boards = await client.listBoards(workspaceId);
      return {
        content: [{ type: "text", text: JSON.stringify(boards, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing boards: ${err.message}` }]
      };
    }
  }
);

// Get board details (with lists/cards)
server.registerTool(
  "kanbn_get_board",
  {
    description: "Get details of a specific board by its ID or slug, including lists and cards",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID or slug"),
    }),
  },
  async ({ boardId }) => {
    try {
      const board = await client.getBoard(boardId);
      return {
        content: [{ type: "text", text: JSON.stringify(board, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving board '${boardId}': ${err.message}` }]
      };
    }
  }
);

// Create board
server.registerTool(
  "kanbn_create_board",
  {
    description: "Create a new board in a workspace",
    inputSchema: z.object({
      workspaceId: z.string().describe("The workspace ID where the board will be created"),
      name: z.string().describe("Name of the board"),
      slug: z.string().optional().describe("URL-friendly slug (optional)"),
      description: z.string().optional().describe("Description of the board (optional)"),
    }),
  },
  async ({ workspaceId, name, slug, description }) => {
    try {
      const board = await client.createBoard({ workspaceId, name, slug, description });
      return {
        content: [{ type: "text", text: JSON.stringify(board, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating board: ${err.message}` }]
      };
    }
  }
);

// Update board
server.registerTool(
  "kanbn_update_board",
  {
    description: "Update an existing board's details",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID to update"),
      name: z.string().optional().describe("New name of the board"),
      slug: z.string().optional().describe("New slug of the board"),
      description: z.string().optional().describe("New description of the board"),
    }),
  },
  async ({ boardId, name, slug, description }) => {
    try {
      const board = await client.updateBoard(boardId, { name, slug, description });
      return {
        content: [{ type: "text", text: JSON.stringify(board, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating board '${boardId}': ${err.message}` }]
      };
    }
  }
);

// Delete board
server.registerTool(
  "kanbn_delete_board",
  {
    description: "Delete a board by ID",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID to delete"),
    }),
  },
  async ({ boardId }) => {
    try {
      await client.deleteBoard(boardId);
      return {
        content: [{ type: "text", text: `Board '${boardId}' successfully deleted.` }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting board '${boardId}': ${err.message}` }]
      };
    }
  }
);

// -------------------------------------------------------------
// LISTS TOOLS
// -------------------------------------------------------------

// Create list
server.registerTool(
  "kanbn_create_list",
  {
    description: "Create a new list (column) on a board",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID to add the list to"),
      name: z.string().describe("Name of the list/column"),
      position: z.number().optional().describe("Position index of the list (optional)"),
    }),
  },
  async ({ boardId, name, position }) => {
    try {
      const list = await client.createList({ boardId, name, position });
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating list: ${err.message}` }]
      };
    }
  }
);

// Update list
server.registerTool(
  "kanbn_update_list",
  {
    description: "Update an existing list's details or position",
    inputSchema: z.object({
      listId: z.string().describe("The list ID to update"),
      name: z.string().optional().describe("New name of the list"),
      position: z.number().optional().describe("New position index of the list"),
    }),
  },
  async ({ listId, name, position }) => {
    try {
      const list = await client.updateList(listId, { name, position });
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating list '${listId}': ${err.message}` }]
      };
    }
  }
);

// Delete list
server.registerTool(
  "kanbn_delete_list",
  {
    description: "Delete a list by ID",
    inputSchema: z.object({
      listId: z.string().describe("The list ID to delete"),
    }),
  },
  async ({ listId }) => {
    try {
      await client.deleteList(listId);
      return {
        content: [{ type: "text", text: `List '${listId}' successfully deleted.` }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting list '${listId}': ${err.message}` }]
      };
    }
  }
);

// -------------------------------------------------------------
// CARDS TOOLS
// -------------------------------------------------------------

// Get card details
server.registerTool(
  "kanbn_get_card",
  {
    description: "Get details of a specific card by ID",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
    }),
  },
  async ({ cardId }) => {
    try {
      const card = await client.getCard(cardId);
      return {
        content: [{ type: "text", text: JSON.stringify(card, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving card '${cardId}': ${err.message}` }]
      };
    }
  }
);

// Create card
server.registerTool(
  "kanbn_create_card",
  {
    description: "Create a new card (task) in a list",
    inputSchema: z.object({
      listId: z.string().describe("The list ID to place the card in"),
      title: z.string().describe("Title/name of the card"),
      description: z.string().optional().describe("Description/notes of the card (optional)"),
      position: z.number().optional().describe("Position index inside the list (optional)"),
      labels: z.array(z.string()).optional().describe("Array of labels/tags (optional)"),
    }),
  },
  async ({ listId, title, description, position, labels }) => {
    try {
      const card = await client.createCard({ listId, title, description, position, labels });
      return {
        content: [{ type: "text", text: JSON.stringify(card, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating card: ${err.message}` }]
      };
    }
  }
);

// Update card (move or edit)
server.registerTool(
  "kanbn_update_card",
  {
    description: "Update a card's details or move it to a different list/position",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID to update"),
      title: z.string().optional().describe("New title of the card"),
      description: z.string().optional().describe("New description of the card"),
      listId: z.string().optional().describe("Target list ID (to move the card to a different list)"),
      position: z.number().optional().describe("New position index in the list"),
      labels: z.array(z.string()).optional().describe("New array of labels/tags"),
    }),
  },
  async ({ cardId, title, description, listId, position, labels }) => {
    try {
      const card = await client.updateCard(cardId, { title, description, listId, position, labels });
      return {
        content: [{ type: "text", text: JSON.stringify(card, null, 2) }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating card '${cardId}': ${err.message}` }]
      };
    }
  }
);

// Delete card
server.registerTool(
  "kanbn_delete_card",
  {
    description: "Delete a card by ID",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID to delete"),
    }),
  },
  async ({ cardId }) => {
    try {
      await client.deleteCard(cardId);
      return {
        content: [{ type: "text", text: `Card '${cardId}' successfully deleted.` }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting card '${cardId}': ${err.message}` }]
      };
    }
  }
);

// -------------------------------------------------------------
// TRANSPORT SETUP & SERVER START
// -------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kanbn MCP Server running on Stdio Transport");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
