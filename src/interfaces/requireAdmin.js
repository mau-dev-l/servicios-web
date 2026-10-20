function createRequireAdmin() {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== "admin") {
      return res.status(403).json({ msg: "Se requieren permisos de administrador" });
    }

    next();
  };
}

module.exports = createRequireAdmin;
