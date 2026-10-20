function handleError(res, error) {
  if (error.status) {
    return res.status(error.status).json({ msg: error.message });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ msg: "El registro ya existe" });
  }

  console.error("Error en productos:", error);
  res.status(500).json({ msg: "Error del servidor" });
}

function createProductController(productService) {
  return {
    list: async (req, res) => {
      try {
        res.json(await productService.list());
      } catch (error) {
        handleError(res, error);
      }
    },

    get: async (req, res) => {
      try {
        res.json(await productService.getById(req.params.id));
      } catch (error) {
        handleError(res, error);
      }
    },

    create: async (req, res) => {
      try {
        const result = await productService.create(req.body);
        res.status(201).json({ msg: "Producto creado", ...result });
      } catch (error) {
        handleError(res, error);
      }
    },

    update: async (req, res) => {
      try {
        const result = await productService.update(req.params.id, req.body);
        res.json({ msg: "Producto actualizado", ...result });
      } catch (error) {
        handleError(res, error);
      }
    },

    remove: async (req, res) => {
      try {
        await productService.remove(req.params.id);
        res.status(204).send();
      } catch (error) {
        handleError(res, error);
      }
    },

    reindex: async (req, res) => {
      try {
        const result = await productService.reindex();
        res.json({ msg: `Embeddings regenerados: ${result.updated}`, ...result });
      } catch (error) {
        handleError(res, error);
      }
    },
  };
}

module.exports = createProductController;
