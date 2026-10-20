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
const ProductRepositoryAdapter = require("./infraestructure/ProductRepositoryAdapter");
const ProductService = require("./application/productService");
const createProductController = require("./interfaces/productController");
const createRequireAdmin = require("./interfaces/requireAdmin");
const RagService = require("./application/ragService");
const createRagController = require("./interfaces/ragController");
const createTelegramController = require("./interfaces/telegramController");
const telegram = require("./infraestructure/telegram");
const { chatModel, embeddings, embeddingModel } = require("./infraestructure/ollama");

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
const productRepository = new ProductRepositoryAdapter(pool);
const productService = new ProductService({
  productRepository,
  embeddings,
  embeddingModel,
});
const productController = createProductController(productService);
const requireAdmin = createRequireAdmin();
const ragService = new RagService({
  productRepository,
  embeddings,
  chatModel,
  topK: Number(process.env.RAG_TOP_K) || 5,
  threshold: Number(process.env.RAG_SIMILARITY_THRESHOLD) || 0.6,
});
const ragController = createRagController(ragService);
const telegramController = createTelegramController({
  ragService,
  telegram,
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
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
app.get("/productos", authenticate, requireAdmin, productController.list);
app.post("/productos", authenticate, requireAdmin, productController.create);
app.post("/productos/reindex", authenticate, requireAdmin, productController.reindex);
app.get("/productos/:id", authenticate, requireAdmin, productController.get);
app.put("/productos/:id", authenticate, requireAdmin, productController.update);
app.delete("/productos/:id", authenticate, requireAdmin, productController.remove);
app.post("/ask", ragController.ask);
app.post("/telegram/webhook", telegramController.webhook);

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
