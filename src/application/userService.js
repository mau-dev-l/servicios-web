const User = require("../domain/user");

class UserService {
  constructor({ userRepository, bcrypt, jwt, jwtSecret }) {
    this.userRepository = userRepository;
    this.bcrypt = bcrypt;
    this.jwt = jwt;
    this.jwtSecret = jwtSecret;
  }

  async register({ nombre, email, password }) {
    if (!nombre || !email || !password) {
      const error = new Error("Faltan datos");
      error.status = 400;
      throw error;
    }

    const passwordHash = await this.bcrypt.hash(password, 10);
    const user = new User({ nombre, email, passwordHash });

    await this.userRepository.create(user);
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !(await this.bcrypt.compare(password, user.password_hash))) {
      const error = new Error("Credenciales incorrectas");
      error.status = 401;
      throw error;
    }

    return this.jwt.sign(
      { id: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: "1h" }
    );
  }

  async list() {
    return this.userRepository.findAll();
  }

  async update(id, { nombre, email }) {
    if (!nombre || !email) {
      const error = new Error("Nombre y email son obligatorios");
      error.status = 400;
      throw error;
    }

    const updatedRows = await this.userRepository.updateById(id, { nombre, email });

    if (updatedRows === 0) {
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }
  }

  async delete(id) {
    const deletedRows = await this.userRepository.deleteById(id);

    if (deletedRows === 0) {
      const error = new Error("Usuario no encontrado");
      error.status = 404;
      throw error;
    }
  }
}

module.exports = UserService;
