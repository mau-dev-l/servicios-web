function createUserController(userService) {
  return {
    register: async (req, res) => {
      try {
        await userService.register(req.body);
        res.status(201).json({ msg: "Usuario registrado" });
      } catch (error) {
        if (error.status) {
          return res.status(error.status).json({ msg: error.message });
        }

        if (error.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ msg: "El correo ya existe" });
        }

        res.status(500).json({ msg: "Error del servidor" });
      }
    },

    login: async (req, res) => {
      try {
        const token = await userService.login(req.body);
        res.json({ msg: "Login exitoso", token });
      } catch (error) {
        if (error.status) {
          return res.status(error.status).json({ msg: error.message });
        }

        res.status(500).json({ msg: "Error del servidor" });
      }
    },

    list: async (req, res) => {
      try {
        const users = await userService.list();
        res.json(users);
      } catch (error) {
        res.status(500).json({ msg: "Error del servidor" });
      }
    },

    update: async (req, res) => {
      try {
        await userService.update(req.user.id, req.body);
        res.json({ msg: "Usuario actualizado" });
      } catch (error) {
        if (error.status) {
          return res.status(error.status).json({ msg: error.message });
        }

        if (error.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ msg: "El correo ya existe" });
        }

        res.status(500).json({ msg: "Error del servidor" });
      }
    },

    delete: async (req, res) => {
      try {
        await userService.delete(req.user.id);
        res.status(204).send();
      } catch (error) {
        if (error.status) {
          return res.status(error.status).json({ msg: error.message });
        }

        res.status(500).json({ msg: "Error del servidor" });
      }
    },
  };
}

module.exports = createUserController;
