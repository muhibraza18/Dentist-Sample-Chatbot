import { prisma } from "@/lib/prisma";
import { cosineSimilarity, embedText } from "@/lib/embedding";

type KnowledgeRow = Awaited<ReturnType<typeof prisma.knowledgeDocument.findMany>>[number];

export async function searchKnowledge(clientId: number, query: string, limit = 5) {
  const queryEmbedding = embedText(query);
  const documents = await prisma.knowledgeDocument.findMany({ where: { clientId } });
  return documents
    .map((doc: KnowledgeRow) => {
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
