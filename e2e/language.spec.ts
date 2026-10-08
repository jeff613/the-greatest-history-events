import { expect, test } from '@playwright/test';

test('English is the default even in a Chinese browser; switching preserves the selected event', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'zh-CN' });
  const page = await context.newPage();
  await page.goto('/?year=-44&item=caesar-assassination');
  const card = page.getByTestId('entry-card');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(card.getByRole('heading', { name: 'Julius Caesar assassinated' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const url = page.url();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page).toHaveTitle('世界历史长卷');
  await expect(card.getByRole('heading', { name: '尤利乌斯·恺撒遇刺' })).toBeVisible();
  await expect(card).toContainText('历史意义');
  await expect(card).toContainText('公元前44年3月15日');
  await expect(page.getByTestId('strip-year')).toHaveText('公元前44年');
  await expect(page).toHaveURL(url);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(card.getByRole('heading', { name: 'Julius Caesar assassinated' })).toBeVisible();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await context.close();
});

test('Chinese timeline selection, related entries and About remain usable', async ({ page }) => {
  await page.goto('/?year=618&item=tang');
  await page.getByRole('button', { name: '中文', exact: true }).click();
  const card = page.getByTestId('entry-card');
  await expect(card.getByRole('heading', { name: '唐朝', exact: true })).toBeVisible();
  await expect(card).toContainText('重要事件');
  await expect(page.locator('.era').getByText('唐朝', { exact: true }).first()).toBeAttached();
  await card.getByRole('button', { name: /玄奘西行求法/ }).click();
  await expect(card.getByRole('heading', { name: '玄奘西行求法' })).toBeVisible();
  await expect(card).toContainText('所属历史');
  await expect(card).toContainText('那烂陀');
  await page.getByRole('button', { name: '关于', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '关于世界历史长卷' });
  await expect(dialog).toContainText('历史疆界仅为近似示意');
  await expect(dialog.getByRole('button', { name: '关闭' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('language controls fit a narrow phone viewport in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/?year=-2000&item=andronovo');
  for (const label of ['中文', 'English']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(780);
    const header = (await page.locator('.app-header').boundingBox())!;
    const panel = (await page.locator('.panel-area').boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    for (const language of ['English', '中文']) {
      await expect(page.getByRole('button', { name: language, exact: true })).toBeInViewport();
    }
  }
});
