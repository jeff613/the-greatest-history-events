import { expect, test } from '@playwright/test';

test('the map renders a canvas', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByTestId('map').locator('canvas')).toBeVisible();
});

test('without WebGL the map shows a fallback and the timeline still works', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/?year=-44');
  await expect(page.getByText('The map needs WebGL')).toBeVisible();
  await page.locator('[data-era="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
});
