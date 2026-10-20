require("dotenv").config();

const { ChatOllama, OllamaEmbeddings } = require("@langchain/ollama");

const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL || "llama3.2:3b";
const embeddingModel = process.env.EMBEDDING_MODEL || "nomic-embed-text";

const chatModel = new ChatOllama({
  baseUrl,
  model,
  temperature: 0,
});

const embeddings = new OllamaEmbeddings({
  baseUrl,
  model: embeddingModel,
});

module.exports = { chatModel, embeddings, baseUrl, model, embeddingModel };
