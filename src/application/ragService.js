const { rankBySimilarity } = require("./similarity");

const STOPWORDS = new Set([
  "cuanto",
  "cuanta",
  "cuantos",
  "cuantas",
  "cuesta",
  "cuestan",
  "precio",
  "precios",
  "tienen",
  "tiene",
  "hay",
  "quiero",
  "necesito",
  "busco",
  "de",
  "del",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "para",
  "por",
  "que",
  "es",
  "son",
  "y",
  "o",
  "en",
  "con",
  "sin",
  "al",
  "me",
  "mi",
  "favor",
  "saber",
  "dime",
  "digame",
  "podria",
  "puede",
  "pueden",
]);

function extractSearchTerms(question) {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
    .slice(0, 6);
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function toPublicProduct(product) {
  return {
    id: product.id,
    nombre: product.nombre,
    precio: Number(product.precio),
    stock: Number(product.stock),
  };
}

function deterministicAnswer(product) {
  const stock = Number(product.stock);

  return `${product.nombre} cuesta $${formatPrice(product.precio)} y hay ${stock} ${
    stock === 1 ? "unidad disponible" : "unidades disponibles"
  }.`;
}

function parseAmount(raw) {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const withoutThousands = cleaned.replace(/,(?=\d{3}\b)/g, "");

  return Number(withoutThousands.replace(",", "."));
}

function validateAnswer(answer, product) {
  const text = String(answer || "").trim();

  if (!text) {
    return false;
  }

  const expectedPrice = Number(product.precio);
  const expectedStock = Number(product.stock);

  const priceMentions = [...text.matchAll(/\$\s*([\d.,]+)/g)]
    .map((match) => parseAmount(match[1]))
    .filter((value) => Number.isFinite(value));

  if (priceMentions.length > 0) {
    if (priceMentions.some((value) => Math.abs(value - expectedPrice) > 0.009)) {
      return false;
    }
  } else {
    const variants = [String(expectedPrice), expectedPrice.toFixed(2)];

    if (!variants.some((variant) => text.includes(variant))) {
      return false;
    }
  }

  const stockMentions = [...text.matchAll(/(\d+)\s*(?:unidades?|disponibles?|en stock)/gi)]
    .map((match) => Number(match[1]));

  if (stockMentions.some((value) => value !== expectedStock)) {
    return false;
  }

  return true;
}

class RagService {
  constructor({
    productRepository,
    embeddings,
    chatModel,
    topK = 5,
    threshold = 0.6,
    ambiguityMargin = 0.03,
  }) {
    this.productRepository = productRepository;
    this.embeddings = embeddings;
    this.chatModel = chatModel;
    this.topK = topK;
    this.threshold = threshold;
    this.ambiguityMargin = ambiguityMargin;
  }

  async ask(rawQuestion) {
    if (typeof rawQuestion !== "string" || !rawQuestion.trim()) {
      const error = new Error("La pregunta es obligatoria");
      error.status = 400;
      throw error;
    }

    const question = rawQuestion.trim();

    if (question.length > 500) {
      const error = new Error("La pregunta es demasiado larga");
      error.status = 400;
      throw error;
    }

    const products = await this.productRepository.findAllWithEmbeddings();

    if (products.length === 0) {
      return {
        answer: "No está en existencia.",
        source: "empty",
        product: null,
        similarity: null,
      };
    }

    const queryVector = await this.embeddings.embedQuery(question);
    const ranked = rankBySimilarity(queryVector, products, this.topK);
    const best = ranked[0];
    let selected = null;
    let source = "rag";
    let similarity = best ? best.similarity : null;

    if (best && best.similarity >= this.threshold) {
      const second = ranked[1];

      if (
        second &&
        second.similarity >= this.threshold &&
        best.similarity - second.similarity < this.ambiguityMargin
      ) {
        return this.ambiguous(ranked);
      }

      selected = best;
    } else {
      const terms = extractSearchTerms(question);
      const lexical = await this.productRepository.searchByNameTerms(terms, this.topK);

      if (lexical.length === 0) {
        return {
          answer: "No está en existencia.",
          source: "not-found",
          product: null,
          similarity,
        };
      }

      if (lexical.length > 1) {
        return this.ambiguous(lexical);
      }

      selected = lexical[0];
      source = "lexical";
      similarity = null;
    }

    if (Number(selected.stock) <= 0) {
      return {
        answer: "No está en existencia.",
        source: "out-of-stock",
        product: toPublicProduct(selected),
        similarity,
      };
    }

    const product = toPublicProduct(selected);
    const prompt = this.buildPrompt(question, product);

    let answer = "";

    try {
      const response = await this.chatModel.invoke(prompt);
      answer = this.extractContent(response);
    } catch (error) {
      console.error("Ollama no respondió, usando plantilla:", error.message);
    }

    if (!validateAnswer(answer, product)) {
      return {
        answer: deterministicAnswer(product),
        source: `${source}-template`,
        product,
        similarity,
      };
    }

    return {
      answer: answer.trim(),
      source,
      product,
      similarity,
    };
  }

  ambiguous(products) {
    const candidates = products.slice(0, 3).map(toPublicProduct);

    return {
      answer: `Encontré varias opciones: ${candidates
        .map((product) => product.nombre)
        .join(", ")}. ¿Cuál te interesa?`,
      source: "ambiguous",
      product: null,
      similarity: null,
      candidates,
    };
  }

  buildPrompt(question, product) {
    return [
      "Eres un asistente de precios. Responde en español, en una sola frase breve.",
      "Usa exclusivamente los datos del contexto. No inventes precios ni stock.",
      "Si el contexto no contiene una coincidencia clara, responde exactamente: No está en existencia.",
      "",
      "Contexto:",
      `Producto: ${product.nombre}`,
      `Precio: $${formatPrice(product.precio)}`,
      `Stock: ${product.stock}`,
      "",
      `Pregunta: ${question}`,
      "Respuesta:",
    ].join("\n");
  }

  extractContent(response) {
    const content = response?.content;

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === "string" ? part : part.text || ""))
        .join("");
    }

    return "";
  }
}

module.exports = RagService;
module.exports.extractSearchTerms = extractSearchTerms;
module.exports.validateAnswer = validateAnswer;
module.exports.deterministicAnswer = deterministicAnswer;
module.exports.formatPrice = formatPrice;
