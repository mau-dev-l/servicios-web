const UserRepository = require("../domain/userRepository");

class UserRepositoryAdapter extends UserRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async create(user) {
    await this.pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)",
      [user.nombre, user.email, user.passwordHash]
    );
  }

  async findByEmail(email) {
    const [rows] = await this.pool.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    return rows[0];
  }

  async findAll() {
    const [rows] = await this.pool.query(
      "SELECT id, nombre, email FROM usuarios ORDER BY id"
    );

    return rows;
  }

  async updateById(id, { nombre, email }) {
    const [result] = await this.pool.query(
      "UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?",
      [nombre, email, id]
    );

    return result.affectedRows;
  }

  async deleteById(id) {
    const [result] = await this.pool.query(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );

    return result.affectedRows;
  }
}

module.exports = UserRepositoryAdapter;
