function createRagController(ragService) {
  return {
    ask: async (req, res) => {
      try {
        const result = await ragService.ask(req.body?.question);
        res.json(result);
      } catch (error) {
        if (error.status) {
          return res.status(error.status).json({ msg: error.message });
        }

        console.error("Error en /ask:", error);
        res.status(500).json({ msg: "Error del servidor" });
      }
    },
  };
}

module.exports = createRagController;
