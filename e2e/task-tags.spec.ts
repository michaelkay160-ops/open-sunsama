import { expect, test, type APIRequestContext } from "@playwright/test";

const api = `http://localhost:${process.env.API_PORT ?? 3201}`;
const today = new Date().toISOString().slice(0, 10);

async function register(request: APIRequestContext) {
  const response = await request.post(`${api}/auth/register`, {
    data: {
      email: `tags-${crypto.randomUUID()}@example.com`,
      password: "E2e-Passw0rd",
      name: "Tag tests",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const { token, user } = (await response.json()).data;
  return { token, user, headers: { Authorization: `Bearer ${token}` } };
}

test("filters tagged tasks and rejects an entire batch with a foreign task or tag", async ({
  request,
}) => {
  const { headers } = await register(request);
  const other = await register(request);

  const post = (path: string, data: unknown, auth = headers) =>
    request.post(`${api}${path}`, { headers: auth, data });
  const read = async (path: string) =>
    (await (await request.get(`${api}${path}`, { headers })).json()).data;
  const first = (
    await (await post("/tasks", { title: "Before adding tags" })).json()
  ).data;
  const second = (
    await (await post("/tasks", { title: "One tag only" })).json()
  ).data;
  const foreign = (
    await (
      await post("/tasks", { title: "Other account" }, other.headers)
    ).json()
  ).data;
  const finance = (
    await (await post("/tags", { name: "Finance", color: "#2563eb" })).json()
  ).data;
  const admin = (
    await (await post("/tags", { name: "Admin", color: "#ea580c" })).json()
  ).data;
  const foreignTag = (
    await (
      await post("/tags", { name: "Finance", color: "#123456" }, other.headers)
    ).json()
  ).data;
  expect(await read("/tags")).toHaveLength(2);
  expect(
    (await post("/tags", { name: " finance ", color: "#123456" })).status()
  ).toBe(409);
  expect(
    (await post("/tags", { name: "Invalid color", color: "blue" })).status()
  ).toBe(400);
  expect(
    (
      await request.patch(`${api}/tags/${admin.id}`, {
        headers,
        data: { name: "finance" },
      })
    ).status()
  ).toBe(409);
  expect(
    (
      await post("/tags/assign", {
        taskIds: [first.id, foreign.id],
        tagIds: [finance.id],
        operation: "add",
      })
    ).status()
  ).toBe(404);
  expect(
    (
      await post("/tags/assign", {
        taskIds: [first.id],
        tagIds: [finance.id, foreignTag.id],
        operation: "add",
      })
    ).status()
  ).toBe(404);
  expect(await read(`/tasks/${first.id}`)).toMatchObject({ tags: [] });

  const assignment = {
    taskIds: [first.id, second.id, first.id],
    tagIds: [finance.id, finance.id],
    operation: "add",
  };
  const retries = await Promise.all([
    post("/tags/assign", assignment),
    post("/tags/assign", assignment),
  ]);
  expect(
    (
      await Promise.all(
        retries.map(async (response) => (await response.json()).data.changed)
      )
    ).sort()
  ).toEqual([0, 2]);
  expect(
    (
      await post("/tags/assign", {
        taskIds: [first.id],
        tagIds: [admin.id],
        operation: "add",
      })
    ).ok()
  ).toBe(true);

  const filtered = await request.get(
    `${api}/tasks?backlog=true&tagIds=${finance.id},${admin.id}&limit=1`,
    { headers }
  );
  expect(await filtered.json()).toMatchObject({
    meta: { total: 1 },
    data: [{ id: first.id }],
  });
  expect(await read(`/tasks?tagIds=${foreignTag.id}`)).toEqual([]);

  const removed = await request.delete(`${api}/tags/${finance.id}`, {
    headers,
  });
  expect(removed.ok()).toBe(true);
  expect(await read(`/tasks/${first.id}`)).toMatchObject({
    title: first.title,
    tags: [admin],
  });
  expect(await read(`/tasks/${second.id}`)).toMatchObject({ tags: [] });
});

test("creates colored tags, edits a task, filters the board and bulk tags the backlog", async ({
  page,
  request,
}) => {
  const { headers, token, user } = await register(request);
  const titles = [
    "Pay a test bill",
    "Untagged card",
    "File a test receipt",
    "Review test notes",
  ];
  for (const [index, title] of titles.entries()) {
    expect(
      (
        await request.post(`${api}/tasks`, {
          headers,
          data: { title, scheduledDate: index < 2 ? today : null },
        })
      ).ok()
    ).toBe(true);
  }
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("open_sunsama_token", token);
      localStorage.setItem("open_sunsama_user", JSON.stringify(user));
    },
    { token, user }
  );
  await page.goto("/app/board");

  const boardTags = page.getByRole("button", { name: /^Tags for board/ });
  await boardTags.click();
  await page.getByRole("button", { name: "Manage tags" }).click();
  const manager = page.getByRole("dialog", { name: "Manage tags" });
  for (const [name, color] of [
    ["Finance", "#2563eb"],
    ["Admin", "#ea580c"],
  ]) {
    await manager.getByLabel("Tag name").fill(name);
    await manager.getByLabel("Color").fill(color);
    await manager.getByRole("button", { name: "Create tag" }).click();
    await expect(
      manager.getByRole("button", { name: `Edit ${name}` })
    ).toBeVisible();
    await expect(manager.getByLabel("Tag name")).toHaveValue("");
  }
  await manager.getByRole("button", { name: "Close" }).click();

  const boardCards = page.locator(`[data-board-day="${today}"] [data-task-id]`);
  const firstCard = boardCards.filter({ hasText: titles[0] });
  await firstCard.click();
  const taskDialog = page.getByRole("dialog", { name: titles[0] });
  await taskDialog.getByRole("button", { name: "Edit tags" }).click();
  for (const name of ["Finance", "Admin"]) {
    const tag = page.getByRole("checkbox", { name });
    await tag.click();
    await expect(tag).toBeChecked();
  }
  await expect(
    taskDialog.getByText("Finance", { exact: true }).first()
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await taskDialog.getByRole("button", { name: "Close" }).first().click();
  await page.reload();
  await expect(firstCard.getByText("Finance")).toBeVisible();
  await expect(firstCard.getByText("Admin")).toBeVisible();
  await boardTags.click();
  await page.getByRole("checkbox", { name: "Finance" }).check();
  await expect(boardCards.filter({ hasText: titles[1] })).toBeHidden();
  await expect(firstCard).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Backlog", exact: true }).click();
  const backlogTags = page.getByRole("button", { name: /^Tags for backlog/ });
  await backlogTags.click();
  await page.getByRole("button", { name: "Bulk tag", exact: true }).click();
  const bulk = page.getByRole("dialog", { name: "Bulk tag backlog tasks" });
  await bulk.getByRole("checkbox", { name: titles[2] }).check();
  await bulk.getByRole("checkbox", { name: titles[3] }).check();
  await bulk.getByRole("checkbox", { name: "Finance" }).check();
  await bulk.getByRole("button", { name: "Add tags" }).click();
  await expect(bulk).toBeHidden();
  await backlogTags.click();
  await page.getByRole("checkbox", { name: "Finance" }).check();
  await expect(page.getByText(titles[2], { exact: true })).toBeVisible();
  await expect(page.getByText(titles[3], { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bulk tag", exact: true }).click();
  await bulk.getByRole("checkbox", { name: new RegExp(titles[2]) }).check();
  await bulk.getByRole("checkbox", { name: "Finance", exact: true }).check();
  await bulk.getByRole("button", { name: "Remove tags" }).click();
  await expect(bulk).toBeHidden();
  await expect(page.getByText(titles[2], { exact: true })).toBeHidden();
  await expect(page.getByText(titles[3], { exact: true })).toBeVisible();
});
