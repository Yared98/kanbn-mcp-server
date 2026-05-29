import dotenv from "dotenv";

// Load environment variables if .env file exists
dotenv.config();

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  lists?: List[];
}

export interface List {
  id: string;
  name: string;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  cards?: Card[];
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  listId: string;
  createdAt: string;
  updatedAt: string;
  labels?: string[];
}

export interface Comment {
  id: number;
  publicId: string;
  comment: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}


export class KanbnClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.KANBN_BASE_URL || "https://kan.bn/api/v1";
    this.apiKey = process.env.KANBN_API_KEY || "";

    // Clean up base URL slash
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error("KANBN_API_KEY is not defined in environment variables.");
    }

    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json() as any;
        if (errorData && errorData.message) {
          errorMessage = `${errorData.message} (status: ${response.status})`;
        }
      } catch (_) {
        // Fallback to text if JSON parse fails
        try {
          const text = await response.text();
          if (text) {
            errorMessage = `${text} (status: ${response.status})`;
          }
        } catch (__) {}
      }
      throw new Error(errorMessage);
    }

    // Some delete calls might return 204 or empty response
    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json() as T;
    } catch (e) {
      // If response body is empty or not JSON
      return {} as T;
    }
  }

  // Workspaces
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`);
  }

  async searchWorkspace(workspaceId: string, query?: string): Promise<{ boards: Board[]; cards: Card[] }> {
    const params = new URLSearchParams();
    if (query) {
      params.append("q", query);
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return this.request<{ boards: Board[]; cards: Card[] }>(`/workspaces/${workspaceId}/search${queryString}`);
  }

  // Boards
  async listBoards(workspaceId?: string): Promise<Board[]> {
    if (workspaceId) {
      try {
        const boards = await this.request<Board[]>(`/workspaces/${workspaceId}/boards`);
        return boards.map(b => ({ ...b, workspaceId }));
      } catch (error) {
        return [];
      }
    }

    try {
      const workspaceRoles = await this.listWorkspaces() as any[];
      const boardsPromises = workspaceRoles.map(wr =>
        this.request<Board[]>(`/workspaces/${wr.workspace.publicId}/boards`)
          .then(boards => boards.map(b => ({ ...b, workspaceId: wr.workspace.publicId })))
          .catch(() => [] as Board[])
      );
      const boardsLists = await Promise.all(boardsPromises);
      return boardsLists.flat();
    } catch (error) {
      return [];
    }
  }

  async getBoard(id: string): Promise<Board> {
    return this.request<Board>(`/boards/${id}`);
  }

  async createBoard(data: { workspaceId: string; name: string; slug?: string; description?: string }): Promise<Board> {
    return this.request<Board>("/boards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBoard(id: string, data: { name?: string; slug?: string; description?: string }): Promise<Board> {
    return this.request<Board>(`/boards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteBoard(id: string): Promise<void> {
    return this.request<void>(`/boards/${id}`, {
      method: "DELETE",
    });
  }

  // Lists
  async createList(data: { boardId: string; name: string; position?: number }): Promise<List> {
    return this.request<List>("/lists", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateList(id: string, data: { name?: string; position?: number }): Promise<List> {
    return this.request<List>(`/lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteList(id: string): Promise<void> {
    return this.request<void>(`/lists/${id}`, {
      method: "DELETE",
    });
  }

  // Cards
  async getCard(id: string): Promise<Card> {
    return this.request<Card>(`/cards/${id}`);
  }

  async createCard(data: { listId: string; title: string; description?: string; position?: number; labels?: string[] }): Promise<Card> {
    const { listId, ...rest } = data;
    const payload = {
      title: rest.title,
      description: rest.description ?? "",
      listPublicId: listId,
      labelPublicIds: rest.labels ?? [],
      memberPublicIds: [],
      position: rest.position === 0 ? "start" : "end",
    };
    return this.request<Card>("/cards", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateCard(
    id: string,
    data: {
      title?: string;
      description?: string;
      listId?: string;
      position?: number;
      labels?: string[];
    }
  ): Promise<Card> {
    const { listId, position, ...rest } = data;
    const payload: any = {
      ...rest,
    };
    if (listId !== undefined) {
      payload.listPublicId = listId;
      // If listPublicId is updated, we MUST send index to bypass the server t.index validation bug.
      payload.index = position !== undefined ? position : 0;
    } else if (position !== undefined) {
      payload.index = position;
    }
    return this.request<Card>(`/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteCard(id: string): Promise<void> {
    return this.request<void>(`/cards/${id}`, {
      method: "DELETE",
    });
  }

  async createComment(cardId: string, comment: string): Promise<Comment> {
    return this.request<Comment>(`/cards/${cardId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  }
}
