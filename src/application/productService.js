function validateProduct({ nombre, precio, stock }) {
  const cleanName = typeof nombre === "string" ? nombre.trim() : "";

  if (!cleanName) {
    const error = new Error("El nombre del producto es obligatorio");
    error.status = 400;
    throw error;
  }

  if (cleanName.length > 150) {
    const error = new Error("El nombre no puede superar 150 caracteres");
    error.status = 400;
    throw error;
  }

  const price = Number(precio);

  if (!Number.isFinite(price) || price < 0) {
    const error = new Error("El precio debe ser un número mayor o igual a 0");
    error.status = 400;
    throw error;
  }

  const stockValue = Number(stock);

  if (!Number.isInteger(stockValue) || stockValue < 0) {
    const error = new Error("El stock debe ser un entero mayor o igual a 0");
    error.status = 400;
    throw error;
  }

  return {
    nombre: cleanName,
    precio: Number(price.toFixed(2)),
    stock: stockValue,
  };
}

function toApiProduct(product) {
  if (!product) return product;

  return {
    ...product,
    precio: Number(product.precio),
    stock: Number(product.stock),
  };
}

class ProductService {
  constructor({ productRepository, embeddings, embeddingModel }) {
    this.productRepository = productRepository;
    this.embeddings = embeddings;
    this.embeddingModel = embeddingModel;
  }

  async list() {
    const products = await this.productRepository.findAll();

    return products.map(toApiProduct);
  }

  async getById(id) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      const error = new Error("Producto no encontrado");
      error.status = 404;
      throw error;
    }

    return toApiProduct(product);
  }

  async create(data) {
    const clean = validateProduct(data);
    const { embedding, embeddingModel, warning } = await this.embed(clean.nombre);
    const id = await this.productRepository.create({
      ...clean,
      embedding,
      embeddingModel,
    });
    const producto = await this.productRepository.findById(id);

    return { producto: toApiProduct(producto), warning };
  }

  async update(id, data) {
    const clean = validateProduct(data);
    const existing = await this.productRepository.findById(id);

    if (!existing) {
      const error = new Error("Producto no encontrado");
      error.status = 404;
      throw error;
    }

    const { embedding, embeddingModel, warning } = await this.embed(clean.nombre);

    await this.productRepository.updateById(id, {
      ...clean,
      embedding,
      embeddingModel,
    });

    const producto = await this.productRepository.findById(id);

    return { producto: toApiProduct(producto), warning };
  }

  async remove(id) {
    const deletedRows = await this.productRepository.deleteById(id);

    if (deletedRows === 0) {
      const error = new Error("Producto no encontrado");
      error.status = 404;
      throw error;
    }
  }

  async reindex() {
    const products = await this.productRepository.findAllWithEmbeddings();

    if (products.length === 0) {
      return { total: 0, updated: 0 };
    }

    const vectors = await this.embeddings.embedDocuments(
      products.map((product) => product.nombre)
    );

    for (let index = 0; index < products.length; index += 1) {
      await this.productRepository.updateEmbedding(
        products[index].id,
        vectors[index],
        this.embeddingModel
      );
    }

    return { total: products.length, updated: products.length };
  }

  async embed(nombre) {
    try {
      const embedding = await this.embeddings.embedQuery(nombre);

      return { embedding, embeddingModel: this.embeddingModel, warning: null };
    } catch (error) {
      console.error("No se pudo generar el embedding:", error.message);

      return {
        embedding: undefined,
        embeddingModel: null,
        warning:
          "Producto guardado sin embedding: Ollama no respondió. Usa Reindexar cuando esté disponible.",
      };
    }
  }
}

module.exports = ProductService;
module.exports.validateProduct = validateProduct;
