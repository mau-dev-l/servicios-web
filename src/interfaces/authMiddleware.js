function createAuthMiddleware({ jwt, jwtSecret }) {
  return (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Token requerido" });
    }

    try {
      req.user = jwt.verify(authorization.slice(7), jwtSecret);
      next();
    } catch (error) {
      res.status(401).json({ msg: "Token inválido o expirado" });
    }
  };
}

module.exports = createAuthMiddleware;
