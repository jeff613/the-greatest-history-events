import { expect, test } from '@playwright/test';

for (const period of [
  { id: 'french-revolution', name: 'French Revolution', year: 1789, region: 'Europe', date: '1789-1799' },
  { id: 'hundred-years-war', name: "Hundred Years' War", year: 1337, region: 'Europe', date: '1337-1453' },
  { id: 'sengoku', name: "Sengoku: Japan's Warring States", year: 1467, region: 'China & East Asia', date: '1467-1603; endpoints debated' },
  { id: 'life-of-jesus', name: 'Life of Jesus (approx.)', year: -4, region: 'Mid. East', date: 'Approx. 4 BC - AD 30; dates debated' },
]) {
  test(`selecting ${period.name} shows context without inventing a territory`, async ({ page }) => {
    await page.goto(`/?year=${period.year}&zoom=20`);
    await expect(page.getByRole('button', { name: period.region, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const band = page.locator(`[data-entry="${period.id}"]`);
    await band.scrollIntoViewIfNeeded();
    await band.click();
    await expect(band).toHaveAttribute('aria-pressed', 'true');
    const card = page.getByTestId('entry-card');
    await expect(card.getByRole('heading', { name: period.name, exact: true })).toBeVisible();
    await expect(card.getByText(period.date, { exact: false })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Read more on Wikipedia' })).toHaveAttribute('href', /en\.wikipedia\.org\/wiki\//);
    await expect(page.getByTestId('map')).not.toHaveAttribute('data-territory');
    await expect(page.getByText('Loading territory...')).toHaveCount(0);
    await card.getByRole('button', { name: 'Around this time', exact: false }).click();
    await expect(card).toHaveCount(0);
    await expect(band).toHaveAttribute('aria-pressed', 'false');
  });
}
