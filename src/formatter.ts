/**
 * Helper functions to project verbose Kanbn API responses into slim, token-optimized DTOs and Markdown text.
 */

export function toSlimWorkspace(ws: any) {
  if (!ws) return null;
  const target = ws.workspace || ws;
  return {
    id: target.publicId || target.id,
    name: target.name,
    slug: target.slug,
    role: ws.role || undefined
  };
}

export function toSlimBoard(board: any, options: { excludeDone?: boolean } = {}) {
  if (!board) return null;

  const lists = (board.lists || [])
    .filter((l: any) => {
      if (options.excludeDone) {
        const name = (l.name || "").toLowerCase();
        if (name.includes("done") || name.includes("concluíd") || name.includes("entregue")) {
          return false;
        }
      }
      return true;
    })
    .map((l: any) => ({
      id: l.publicId || l.id,
      name: l.name,
      cards: (l.cards || []).map(toSlimCard)
    }));

  return {
    id: board.publicId || board.id,
    name: board.name,
    slug: board.slug,
    workspaceId: board.workspaceId || board.workspace?.publicId,
    labels: (board.labels || []).map((lbl: any) => ({
      id: lbl.publicId || lbl.id,
      name: lbl.name,
      color: lbl.colourCode
    })),
    lists
  };
}

export function toSlimCard(card: any) {
  if (!card) return null;
  return {
    id: card.publicId || card.id,
    title: card.title,
    description: card.description || undefined,
    listId: card.listPublicId || card.listId,
    labels: card.labels || card.labelPublicIds || undefined,
    dueDate: card.dueDate || undefined
  };
}

export function formatBoardAsMarkdown(board: any, options: { excludeDone?: boolean } = {}): string {
  if (!board) return "Board not found.";

  const lists = (board.lists || []).filter((l: any) => {
    if (options.excludeDone) {
      const name = (l.name || "").toLowerCase();
      if (name.includes("done") || name.includes("concluíd") || name.includes("entregue")) {
        return false;
      }
    }
    return true;
  });

  let md = `### 📌 Board: ${board.name} (ID: \`${board.publicId || board.id}\`)\n`;
  if (board.workspace?.name) {
    md += `*Workspace: ${board.workspace.name}*\n`;
  }
  md += "\n";

  if (lists.length === 0) {
    md += "_Nenhuma coluna cadastrada._\n";
    return md;
  }

  for (const list of lists) {
    const cards = list.cards || [];
    md += `#### ${list.name} (\`${list.publicId || list.id}\`) - ${cards.length} cartão(ões)\n`;

    if (cards.length === 0) {
      md += "  _Nenhum cartão nesta coluna._\n";
    } else {
      for (const card of cards) {
        const cardId = card.publicId || card.id;
        const labels = card.labels && card.labels.length > 0
          ? ` | Labels: ${card.labels.map((lbl: any) => typeof lbl === "string" ? lbl : lbl.name).join(", ")}`
          : "";
        const due = card.dueDate ? ` | 🗓️ Prazo: ${card.dueDate}` : "";
        md += `  - **[${card.title}]** (ID: \`${cardId}\`)${labels}${due}\n`;
        if (card.description) {
          const shortDesc = card.description.split("\n")[0].slice(0, 80);
          md += `    > ${shortDesc}${card.description.length > 80 ? "..." : ""}\n`;
        }
      }
    }
    md += "\n";
  }

  return md;
}
