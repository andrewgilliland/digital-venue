import { expect, test } from "@playwright/test";

test("shows a local venue overview and accessible section information", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Soldier Field" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Interactive venue map" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Interactive section map of Soldier Field" }),
  ).toBeVisible();

  await page.getByText("Browse all 166 sections").click();
  await expect(page.getByRole("listitem")).toHaveCount(166);
  await expect(
    page.getByRole("list", { name: "100 Level sections" }),
  ).toContainText("101");
  await expect(
    page.getByRole("list", { name: "400 Level sections" }),
  ).toContainText("447");
});

test("supports map zoom controls and reset", async ({ page }) => {
  await page.goto("/");

  const zoomStatus = page.getByRole("status", { name: "Map zoom" });
  await expect(zoomStatus).toHaveText("100%");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(zoomStatus).toHaveText("120%");

  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(zoomStatus).toHaveText("100%");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(zoomStatus).toHaveText("100%");
});

test("focuses a detailed section and inspects a generated seat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByText("Browse all 166 sections").click();
  await page.getByRole("button", { name: "View Section 110" }).click();

  await expect(
    page.getByRole("heading", { name: "Section 110" }),
  ).toBeVisible();
  await expect(page.getByRole("status", { name: "Map zoom" })).toHaveText(
    "480%",
  );

  await page
    .getByRole("button", {
      name: "Inspect Section 110 Row 1 Seat 1",
      exact: true,
    })
    .click();

  const details = page.getByRole("region", { name: "Inspected seat details" });
  await expect(details).toContainText("Seat 1");
  await expect(details).toContainText("Section 110 · Row 1");
  await expect(details).toContainText("100 Level");

  await page.getByRole("button", { name: "Back to venue overview" }).click();

  await expect(
    page.getByRole("heading", { name: "Soldier Field" }),
  ).toBeVisible();
  await expect(page.getByRole("status", { name: "Map zoom" })).toHaveText(
    "100%",
  );

  for (const section of ["122", "430"]) {
    await page.getByText("Browse all 166 sections").click();
    await page
      .getByRole("button", { name: `View Section ${section}`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `Section ${section}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: `Inspect Section ${section} Row 1 Seat 1`,
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back to venue overview" }).click();
  }
});

test("pans the rendered map when dragged", async ({ page }) => {
  await page.goto("/");

  const map = page.getByRole("img", {
    name: "Interactive section map of Soldier Field",
  });
  await expect(map).toBeVisible();

  const before = await map.screenshot();
  const bounds = await map.boundingBox();
  if (!bounds) throw new Error("The venue map has no visible bounds.");

  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 90,
    bounds.y + bounds.height / 2 + 45,
  );
  await page.mouse.up();

  const after = await map.screenshot();
  expect(after.equals(before)).toBe(false);
});

test("keeps venue information available when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function (contextType) {
      if (typeof contextType === "string" && contextType.startsWith("webgl")) {
        return null;
      }
      return null;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText("WebGL is unavailable");
  await page.getByText("Browse all 166 sections").click();
  await expect(
    page.getByRole("list", { name: "100 Level sections" }),
  ).toContainText("101");
});
