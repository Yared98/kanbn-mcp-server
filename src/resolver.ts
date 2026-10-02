import { KanbnClient } from "./client.js";

export class KanbnResolver {
  constructor(private client: KanbnClient) {}

  /**
   * Resolves a list name or list ID to the publicId of a list on a specific board.
   */
  async resolveListId(boardId: string, listNameOrId: string): Promise<string> {
    const board = await this.client.getBoard(boardId);
    if (!board || !board.lists) {
      throw new Error(`Board '${boardId}' not found or has no lists.`);
    }

    // 1. Direct match on publicId or id
    const directMatch = board.lists.find(
      (l: any) => l.publicId === listNameOrId || l.id === listNameOrId
    );
    if (directMatch) {
      return directMatch.publicId || directMatch.id;
    }

    // 2. Exact match on list name (case-insensitive)
    const normalizedTarget = listNameOrId.trim().toLowerCase();
    const exactNameMatch = board.lists.find(
      (l: any) => l.name.trim().toLowerCase() === normalizedTarget
    );
    if (exactNameMatch) {
      return exactNameMatch.publicId || exactNameMatch.id;
    }

    // 3. Partial match (e.g. "done", "to do", "backlog", "in progress")
    const partialMatch = board.lists.find((l: any) =>
      l.name.toLowerCase().includes(normalizedTarget)
    );
    if (partialMatch) {
      return partialMatch.publicId || partialMatch.id;
    }

    throw new Error(
      `List '${listNameOrId}' could not be resolved on board '${board.name}' (${boardId}). Available lists: ${board.lists
        .map((l: any) => `'${l.name}' (${l.publicId || l.id})`)
        .join(", ")}`
    );
  }

  /**
   * Resolves a board name, slug, or ID to the publicId of a board.
   */
  async resolveBoardId(boardNameOrId: string, workspaceId?: string): Promise<string> {
    const boards = await this.client.listBoards(workspaceId);
    
    // 1. Direct match on publicId or id
    const directMatch = boards.find(
      (b: any) => b.publicId === boardNameOrId || b.id === boardNameOrId || b.slug === boardNameOrId
    );
    if (directMatch) {
      return directMatch.publicId || directMatch.id;
    }

    // 2. Exact match on name (case-insensitive)
    const normalizedTarget = boardNameOrId.trim().toLowerCase();
    const exactNameMatch = boards.find(
      (b: any) => b.name.trim().toLowerCase() === normalizedTarget
    );
    if (exactNameMatch) {
      return exactNameMatch.publicId || exactNameMatch.id;
    }

    // 3. Partial match
    const partialMatch = boards.find((b: any) =>
      b.name.toLowerCase().includes(normalizedTarget)
    );
    if (partialMatch) {
      return partialMatch.publicId || partialMatch.id;
    }

    throw new Error(`Board '${boardNameOrId}' could not be resolved.`);
  }
}
