import { cosineSimilarity, embedText } from "@/lib/embedding";

async function getKnowledgeDocuments(clientId: number) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.knowledgeDocument.findMany({ where: { clientId } });
}

export async function searchKnowledge(clientId: number, query: string, limit = 5) {
  const queryEmbedding = embedText(query);
  type KnowledgeDocumentRow = Awaited<ReturnType<typeof getKnowledgeDocuments>>[number];
  const documents: KnowledgeDocumentRow[] = await getKnowledgeDocuments(clientId);
  return documents
    .map((doc: KnowledgeDocumentRow) => {
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
