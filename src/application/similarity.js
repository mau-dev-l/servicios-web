function toVector(embedding) {
  if (Array.isArray(embedding)) {
    return embedding;
  }

  if (Buffer.isBuffer(embedding)) {
    try {
      return JSON.parse(embedding.toString("utf8"));
    } catch {
      return null;
    }
  }

  if (typeof embedding === "string") {
    try {
      return JSON.parse(embedding);
    } catch {
      return null;
    }
  }

  return null;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function rankBySimilarity(queryVector, products, topK = 5) {
  return products
    .map((product) => {
      const vector = toVector(product.embedding);

      if (!vector) {
        return null;
      }

      return {
        ...product,
        similarity: cosineSimilarity(queryVector, vector),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

module.exports = { cosineSimilarity, rankBySimilarity, toVector };
