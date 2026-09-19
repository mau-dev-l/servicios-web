class User {
  constructor({ nombre, email, passwordHash }) {
    this.nombre = nombre;
    this.email = email;
    this.passwordHash = passwordHash;
  }
}

module.exports = User;
