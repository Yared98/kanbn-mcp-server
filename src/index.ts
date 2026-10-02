import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KanbnClient } from "./client.js";
import { KanbnResolver } from "./resolver.js";
import {
  toSlimWorkspace,
  toSlimBoard,
  toSlimCard,
  formatBoardAsMarkdown,
} from "./formatter.js";

// 1. Initialize the MCP Server
const server = new McpServer({
  name: "kanbn-mcp-server",
  version: "1.1.0",
});

// 2. Initialize client and resolver
const client = new KanbnClient();
const resolver = new KanbnResolver(client);

// -------------------------------------------------------------
// WORKSPACES TOOLS
// -------------------------------------------------------------

// List workspaces
server.registerTool(
  "kanbn_list_workspaces",
  {
    description: "List all workspaces in Kanbn (returns slim token-optimized format by default)",
    inputSchema: z.object({
      format: z.enum(["compact", "full"]).optional().default("compact").describe("Output format: compact (slim JSON) or full"),
    }),
  },
  async ({ format }) => {
    try {
      const workspaces = await client.listWorkspaces();
      const output = format === "compact" ? workspaces.map(toSlimWorkspace) : workspaces;
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing workspaces: ${err.message}` }],
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
      format: z.enum(["compact", "full"]).optional().default("compact").describe("Output format: compact (slim JSON) or full"),
    }),
  },
  async ({ workspaceId, format }) => {
    try {
      const workspace = await client.getWorkspace(workspaceId);
      const output = format === "compact" ? toSlimWorkspace(workspace) : workspace;
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving workspace '${workspaceId}': ${err.message}` }],
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
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching workspace '${workspaceId}': ${err.message}` }],
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
      format: z.enum(["compact", "full"]).optional().default("compact").describe("Output format: compact (slim JSON) or full"),
    }),
  },
  async ({ workspaceId, format }) => {
    try {
      const boards = await client.listBoards(workspaceId);
      const output = format === "compact" ? boards.map((b) => toSlimBoard(b)) : boards;
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing boards: ${err.message}` }],
      };
    }
  }
);

// Get board details (with token-optimized formatting options)
server.registerTool(
  "kanbn_get_board",
  {
    description: "Get details of a specific board by ID or slug. Supports token-saving Markdown output and Done column omission.",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID or slug"),
      format: z.enum(["markdown", "compact", "full"]).optional().default("markdown").describe("Output format: 'markdown' (most token efficient), 'compact' (slim JSON), or 'full'"),
      excludeDone: z.boolean().optional().default(false).describe("If true, omits completed/done lists from the response to save tokens"),
    }),
  },
  async ({ boardId, format, excludeDone }) => {
    try {
      const board = await client.getBoard(boardId);
      if (format === "markdown") {
        const text = formatBoardAsMarkdown(board, { excludeDone });
        return { content: [{ type: "text", text }] };
      }
      const output = format === "compact" ? toSlimBoard(board, { excludeDone }) : board;
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving board '${boardId}': ${err.message}` }],
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
        content: [{ type: "text", text: JSON.stringify(toSlimBoard(board), null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating board: ${err.message}` }],
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
        content: [{ type: "text", text: JSON.stringify(toSlimBoard(board), null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating board '${boardId}': ${err.message}` }],
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
        content: [{ type: "text", text: `Board '${boardId}' successfully deleted.` }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting board '${boardId}': ${err.message}` }],
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
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating list: ${err.message}` }],
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
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating list '${listId}': ${err.message}` }],
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
        content: [{ type: "text", text: `List '${listId}' successfully deleted.` }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting list '${listId}': ${err.message}` }],
      };
    }
  }
);

// -------------------------------------------------------------
// CARDS & SMART RESOLUTION TOOLS
// -------------------------------------------------------------

// Get card details
server.registerTool(
  "kanbn_get_card",
  {
    description: "Get details of a specific card by ID",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
      format: z.enum(["compact", "full"]).optional().default("compact").describe("Output format: compact (slim JSON) or full"),
    }),
  },
  async ({ cardId, format }) => {
    try {
      const card = await client.getCard(cardId);
      const output = format === "compact" ? toSlimCard(card) : card;
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving card '${cardId}': ${err.message}` }],
      };
    }
  }
);

// Create card (supports list ID or list Name lookup)
server.registerTool(
  "kanbn_create_card",
  {
    description: "Create a new card (task) in a list. Supports passing list ID directly or boardId + listName for smart resolution.",
    inputSchema: z.object({
      listId: z.string().optional().describe("The list publicId (required if boardId + listName is not provided)"),
      boardId: z.string().optional().describe("The board publicId or slug (optional if listId is supplied)"),
      listName: z.string().optional().describe("Friendly list name e.g. 'To Do', 'Done' (resolved automatically if boardId is provided)"),
      title: z.string().describe("Title/name of the card"),
      description: z.string().optional().describe("Description/notes of the card (optional)"),
      position: z.number().optional().describe("Position index inside the list (optional)"),
      labels: z.array(z.string()).optional().describe("Array of label IDs (optional)"),
    }),
  },
  async ({ listId, boardId, listName, title, description, position, labels }) => {
    try {
      let targetListId = listId;
      if (!targetListId && boardId && listName) {
        targetListId = await resolver.resolveListId(boardId, listName);
      }
      if (!targetListId) {
        throw new Error("You must supply either 'listId' or both 'boardId' and 'listName'.");
      }

      const card = await client.createCard({ listId: targetListId, title, description, position, labels });
      return {
        content: [{ type: "text", text: JSON.stringify(toSlimCard(card), null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating card: ${err.message}` }],
      };
    }
  }
);

// Smart Move Card Tool (Resolves list names without extra tool calls)
server.registerTool(
  "kanbn_move_card",
  {
    description: "Smart card move tool. Moves a card to a destination column specified by list name (e.g. 'Done', 'In Progress') or list ID.",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID or slug where the card resides"),
      cardId: z.string().describe("The card ID to move"),
      targetList: z.string().describe("Target list name (e.g. 'Done', 'In Progress') or target list publicId"),
      position: z.number().optional().describe("Position index in the target list (optional)"),
    }),
  },
  async ({ boardId, cardId, targetList, position }) => {
    try {
      const resolvedListId = await resolver.resolveListId(boardId, targetList);
      const card = await client.updateCard(cardId, { listId: resolvedListId, position });
      return {
        content: [
          {
            type: "text",
            text: `Card '${cardId}' successfully moved to list '${targetList}' (ID: \`${resolvedListId}\`).`,
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error moving card '${cardId}': ${err.message}` }],
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
      labels: z.array(z.string()).optional().describe("New array of label IDs"),
    }),
  },
  async ({ cardId, title, description, listId, position, labels }) => {
    try {
      const card = await client.updateCard(cardId, { title, description, listId, position, labels });
      return {
        content: [{ type: "text", text: JSON.stringify(toSlimCard(card), null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating card '${cardId}': ${err.message}` }],
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
        content: [{ type: "text", text: `Card '${cardId}' successfully deleted.` }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting card '${cardId}': ${err.message}` }],
      };
    }
  }
);

// -------------------------------------------------------------
// COMMENTS TOOLS
// -------------------------------------------------------------

server.registerTool(
  "kanbn_list_comments",
  {
    description: "List all comments on a specific card",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
    }),
  },
  async ({ cardId }) => {
    try {
      const comments = await client.listComments(cardId);
      return {
        content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing comments: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_create_comment",
  {
    description: "Create a new comment on a card",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID where the comment will be added"),
      comment: z.string().describe("The content of the comment"),
    }),
  },
  async ({ cardId, comment }) => {
    try {
      const result = await client.createComment(cardId, comment);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating comment: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_update_comment",
  {
    description: "Update an existing comment on a card",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
      commentId: z.string().describe("The comment ID"),
      comment: z.string().describe("The new comment text"),
    }),
  },
  async ({ cardId, commentId, comment }) => {
    try {
      const result = await client.updateComment(cardId, commentId, comment);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error updating comment: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_delete_comment",
  {
    description: "Delete a comment from a card",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
      commentId: z.string().describe("The comment ID"),
    }),
  },
  async ({ cardId, commentId }) => {
    try {
      await client.deleteComment(cardId, commentId);
      return {
        content: [{ type: "text", text: `Comment '${commentId}' deleted successfully.` }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error deleting comment: ${err.message}` }],
      };
    }
  }
);

// -------------------------------------------------------------
// LABELS TOOLS
// -------------------------------------------------------------

server.registerTool(
  "kanbn_list_labels",
  {
    description: "List all labels on a board",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID or slug"),
    }),
  },
  async ({ boardId }) => {
    try {
      const labels = await client.listLabels(boardId);
      return {
        content: [{ type: "text", text: JSON.stringify(labels, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing labels: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_create_label",
  {
    description: "Create a new label on a board with a custom name and color hex code",
    inputSchema: z.object({
      boardId: z.string().describe("The board ID"),
      name: z.string().describe("Label name e.g. 'Bug 🐛', 'Urgent 🔴'"),
      colourCode: z.string().optional().describe("Hex color code e.g. '#dc2626'"),
    }),
  },
  async ({ boardId, name, colourCode }) => {
    try {
      const label = await client.createLabel(boardId, { name, colourCode });
      return {
        content: [{ type: "text", text: JSON.stringify(label, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating label: ${err.message}` }],
      };
    }
  }
);

// -------------------------------------------------------------
// CHECKLISTS TOOLS
// -------------------------------------------------------------

server.registerTool(
  "kanbn_create_checklist",
  {
    description: "Create a new checklist on a card",
    inputSchema: z.object({
      cardId: z.string().describe("The card ID"),
      title: z.string().describe("Checklist title e.g. 'Definition of Done'"),
    }),
  },
  async ({ cardId, title }) => {
    try {
      const checklist = await client.createChecklist(cardId, title);
      return {
        content: [{ type: "text", text: JSON.stringify(checklist, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating checklist: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_add_checklist_item",
  {
    description: "Add an item to a checklist",
    inputSchema: z.object({
      checklistId: z.string().describe("The checklist ID"),
      title: z.string().describe("Item title/text"),
    }),
  },
  async ({ checklistId, title }) => {
    try {
      const item = await client.addChecklistItem(checklistId, title);
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error adding checklist item: ${err.message}` }],
      };
    }
  }
);

server.registerTool(
  "kanbn_toggle_checklist_item",
  {
    description: "Toggle or set completed status of a checklist item",
    inputSchema: z.object({
      itemId: z.string().describe("The checklist item ID"),
      completed: z.boolean().describe("True if completed, false if pending"),
    }),
  },
  async ({ itemId, completed }) => {
    try {
      const item = await client.toggleChecklistItem(itemId, completed);
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error toggling checklist item: ${err.message}` }],
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
  console.error("Kanbn MCP Server v1.1.0 running on Stdio Transport");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
