import { test, expect } from "@playwright/test";

const token = `header.${Buffer.from(JSON.stringify({ id: 1 })).toString("base64url")}.signature`;

async function mockApi(page) {
  const calls = [];
  await page.route(/\/(login|register|users)(\/me)?$/, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    calls.push({ path, method, body: request.postDataJSON(), authorization: request.headers().authorization });
    if (method === "DELETE") return route.fulfill({ status: 204 });
    const json = path === "/login" ? { token } : path === "/users" ? [
      { id: 1, nombre: "Ana", email: "ana@example.com" },
      { id: 2, nombre: "Luis", email: "luis@example.com" },
    ] : { msg: "OK" };
    await route.fulfill({ status: path === "/register" ? 201 : 200, json });
  });
  return calls;
}

async function login(page) {
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("test-password");
  await page.getByRole("button", { name: "Iniciar sesión →" }).click();
  await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
  await expect(page.getByText("Sesión iniciada correctamente.")).toBeVisible();
}

test("registration, authenticated listing, own-profile update and confirmed 204 deletion", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/web/");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("test-password");
  await page.getByRole("button", { name: "Crear mi cuenta →" }).click();
  await expect(page.getByText("Cuenta creada. Ya puedes iniciar sesión.")).toBeVisible();
  expect(calls[0]).toMatchObject({ path: "/register", method: "POST", body: { nombre: "Ana", email: "ana@example.com", password: "test-password" } });
  await login(page);
  await expect(page.getByRole("cell", { name: "luis@example.com" })).toBeVisible();
  await page.getByLabel("Nombre", { exact: true }).fill("Ana María");
  await page.getByLabel("Email", { exact: true }).fill("ana.maria@example.com");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("cell", { name: "ana.maria@example.com" })).toBeVisible();
  expect(calls.find(call => call.method === "PUT")).toMatchObject({ path: "/users/me", body: { nombre: "Ana María", email: "ana.maria@example.com" }, authorization: `Bearer ${token}` });
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  expect(calls.some(call => call.method === "DELETE")).toBe(false);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page.getByText("Tu cuenta fue eliminada correctamente.")).toBeVisible();
  expect(calls.find(call => call.method === "DELETE")).toMatchObject({ path: "/users/me", authorization: `Bearer ${token}` });
  await expect(page.getByRole("heading", { name: "Mi cuenta" })).toHaveCount(0);
});

test("API errors remain visible and an expired session clears protected data", async ({ page }) => {
  await mockApi(page);
  await page.goto("/web/");
  await page.route("**/login", route => route.fulfill({ status: 401, json: { msg: "Credenciales incorrectas" } }));
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("wrong");
  await page.getByRole("button", { name: "Iniciar sesión →" }).click();
  await expect(page.getByText("Credenciales incorrectas")).toBeVisible();
  await page.unroute("**/login");
  await login(page);
  await page.route("**/users/me", route => route.fulfill({ status: 409, json: { msg: "El correo ya existe" } }));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("El correo ya existe")).toBeVisible();
  await page.route("**/users", route => route.fulfill({ status: 500, json: { msg: "Error del servidor" } }));
  await page.getByRole("button", { name: "Actualizar lista" }).click();
  await expect(page.getByText("Error del servidor")).toBeVisible();
  await expect(page.getByText("Lista no disponible. Intenta actualizarla.")).toBeVisible();
  await page.route("**/users", route => route.fulfill({ status: 401, json: { msg: "Token inválido o expirado" } }));
  await page.getByRole("button", { name: "Actualizar lista" }).click();
  await expect(page.getByText("Tu sesión venció o no es válida. Inicia sesión nuevamente.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("mobile layout, network failure and reload logout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  await page.goto("/web/");
  await login(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.route("**/users", route => route.abort());
  await page.getByRole("button", { name: "Actualizar lista" }).click();
  await expect(page.getByText(/No se pudo conectar con la API/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
});

test("Express serves the frontend and keeps the API authentication boundary", async ({ request }) => {
  expect(await (await request.get("/")).text()).toBe("API funcionando");
  const web = await request.get("/web/");
  expect(web.status()).toBe(200);
  expect(await web.text()).toContain("/web/assets/");
  for (const method of ["GET", "PUT", "DELETE"]) {
    const response = await request.fetch(method === "GET" ? "/users" : "/users/me", { method });
    expect(response.status()).toBe(401);
  }
});
