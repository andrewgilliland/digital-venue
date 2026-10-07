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
    page.getByRole("img", { name: "Top-down schematic map of Soldier Field" }),
  ).toBeVisible();

  await page.getByText("Browse all 36 sections").click();
  await expect(page.getByRole("listitem")).toHaveCount(36);
  await expect(
    page.getByRole("list", { name: "Upper Deck sections" }),
  ).toContainText("101");
  await expect(
    page.getByRole("list", { name: "100 Level sections" }),
  ).toContainText("201");
  await expect(
    page.getByRole("list", { name: "Club Level sections" }),
  ).toContainText("301");
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

test("pans the rendered map when dragged", async ({ page }) => {
  await page.goto("/");

  const map = page.getByRole("img", {
    name: "Top-down schematic map of Soldier Field",
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
  await page.getByText("Browse all 36 sections").click();
  await expect(
    page.getByRole("list", { name: "Upper Deck sections" }),
  ).toContainText("101");
});
