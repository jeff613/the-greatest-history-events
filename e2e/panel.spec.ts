import { expect, test } from '@playwright/test';

test('lists events around the current year grouped by region', async ({ page }) => {
  await page.goto('/?year=-44');
  const panel = page.getByTestId('event-panel');
  await expect(panel).toContainText('Around 44 BC');
  await expect(panel.getByRole('heading', { level: 3, name: 'Europe' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Julius Caesar assassinated/ })).toBeVisible();
});

test('the list changes after scrubbing to the end', async ({ page }) => {
  await page.goto('/?year=-44');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  const panel = page.getByTestId('event-panel');
  await expect(panel).not.toContainText('Around 44 BC');
  await expect(panel.getByRole('button', { name: /^Julius Caesar assassinated/ })).toHaveCount(0);
});

test('selecting an event opens its card, updates the URL and survives reload', async ({ page }) => {
  await page.goto('/?year=-44');
  const panel = page.getByTestId('event-panel');
  await panel.getByRole('button', { name: /^Julius Caesar assassinated/ }).click();
  await expect(panel.getByRole('heading', { level: 2, name: 'Julius Caesar assassinated' })).toBeVisible();
  await expect(panel).toContainText('Why it mattered');
  await expect(page).toHaveURL(/event=caesar-assassination/);
  await page.reload();
  await expect(panel.getByRole('heading', { level: 2, name: 'Julius Caesar assassinated' })).toBeVisible();
  await panel.getByRole('button', { name: /All events/ }).click();
  await expect(panel).toContainText('Around 44 BC');
  await expect(page).not.toHaveURL(/event=/);
});

test('bad URL values fall back safely', async ({ page }) => {
  await page.goto('/?year=0&event=nope&zoom=-3');
  const panel = page.getByTestId('event-panel');
  await expect(panel).toContainText('Around AD 1');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveCount(0);
  await page.goto('/?year=99999');
  await expect(panel).toContainText('Around 2000');
});
