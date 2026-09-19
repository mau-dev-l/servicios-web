require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./infraestructure/db");
const UserRepositoryAdapter = require("./infraestructure/UserrepositoryAdapter");
const UserService = require("./application/userService");
const createUserController = require("./interfaces/userController");
const createAuthMiddleware = require("./interfaces/authMiddleware");

const app = express();
const userRepository = new UserRepositoryAdapter(pool);
const userService = new UserService({
  userRepository,
  bcrypt,
  jwt,
  jwtSecret: process.env.JWT_SECRET,
});
const userController = createUserController(userService);
const authenticate = createAuthMiddleware({
  jwt,
  jwtSecret: process.env.JWT_SECRET,
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.post("/register", userController.register);
app.post("/login", userController.login);
app.get("/users", authenticate, userController.list);
app.put("/users/me", authenticate, userController.update);
app.delete("/users/me", authenticate, userController.delete);

function start() {
  const port = process.env.PORT || 3000;

  return app.listen(port, () => {
    console.log("Servidor escuchando en el puerto", port);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
