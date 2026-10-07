import { expect, test } from '@playwright/test'

test('loads the project shell', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Digital Venue' }),
  ).toBeVisible()
})