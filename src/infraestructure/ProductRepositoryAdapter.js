const ProductRepository = require("../domain/productRepository");

class ProductRepositoryAdapter extends ProductRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAllWithEmbeddings() {
    const [rows] = await this.pool.query(
      "SELECT id, nombre, precio, stock, embedding FROM productos ORDER BY id"
    );

    return rows;
  }

  async searchByNameTerms(terms, limit = 5) {
    const safeTerms = (terms || [])
      .filter((term) => typeof term === "string" && term.length >= 2)
      .slice(0, 8);

    if (safeTerms.length === 0) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
    const conditions = safeTerms.map(() => "nombre LIKE ?").join(" OR ");
    const values = safeTerms.map((term) => `%${term}%`);
    const [rows] = await this.pool.query(
      `SELECT id, nombre, precio, stock FROM productos WHERE ${conditions} LIMIT ${safeLimit}`,
      values
    );

    return rows;
  }

  async findAll() {
    const [rows] = await this.pool.query(
      "SELECT id, nombre, precio, stock, embedding_model, created_at, updated_at FROM productos ORDER BY id"
    );

    return rows;
  }

  async findById(id) {
    const [rows] = await this.pool.query(
      "SELECT id, nombre, precio, stock, embedding_model, created_at, updated_at FROM productos WHERE id = ?",
      [id]
    );

    return rows[0];
  }

  async create({ nombre, precio, stock, embedding, embeddingModel }) {
    const [result] = await this.pool.query(
      "INSERT INTO productos (nombre, precio, stock, embedding, embedding_model) VALUES (?, ?, ?, ?, ?)",
      [
        nombre,
        precio,
        stock,
        embedding ? JSON.stringify(embedding) : null,
        embeddingModel || null,
      ]
    );

    return result.insertId;
  }

  async updateById(id, { nombre, precio, stock, embedding, embeddingModel }) {
    const fields = ["nombre = ?", "precio = ?", "stock = ?"];
    const values = [nombre, precio, stock];

    if (embedding !== undefined) {
      fields.push("embedding = ?", "embedding_model = ?");
      values.push(embedding ? JSON.stringify(embedding) : null, embeddingModel || null);
    }

    values.push(id);

    const [result] = await this.pool.query(
      `UPDATE productos SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  async deleteById(id) {
    const [result] = await this.pool.query("DELETE FROM productos WHERE id = ?", [id]);

    return result.affectedRows;
  }

  async updateEmbedding(id, embedding, embeddingModel) {
    const [result] = await this.pool.query(
      "UPDATE productos SET embedding = ?, embedding_model = ? WHERE id = ?",
      [embedding ? JSON.stringify(embedding) : null, embeddingModel || null, id]
    );

    return result.affectedRows;
  }
}

module.exports = ProductRepositoryAdapter;
