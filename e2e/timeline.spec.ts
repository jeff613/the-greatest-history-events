import { expect, test } from '@playwright/test';

test('scrubbing the timeline changes the year and the URL', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByTestId('strip-year')).not.toHaveText('44 BC');
  await expect(page).toHaveURL(/year=(19\d\d|2000)/);
});

test('clicking an era band jumps to its start', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.locator('[data-era="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page).toHaveURL(/year=-206/);
});
