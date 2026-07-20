import type { KnowledgeDocument } from "@prisma/client";

import { cosineSimilarity, embedText } from "@/lib/embedding";

export async function searchKnowledge(clientId: number, query: string, limit = 5) {
  const { prisma } = await import("@/lib/prisma");
  const queryEmbedding = embedText(query);
  const documents: KnowledgeDocument[] = await prisma.knowledgeDocument.findMany({ where: { clientId } });
  return documents
    .map((doc: KnowledgeDocument) => {
      const embedding = Array.isArray(doc.embedding) ? (doc.embedding as number[]) : [];
      return {
        id: doc.id,
        content: doc.content,
        similarity: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
    .slice(0, limit);
}
