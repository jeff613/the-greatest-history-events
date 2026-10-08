import { expect, test } from '@playwright/test';

test('a moment sits on the timeline and opens its card', async ({ page }) => {
  await page.goto('/?year=1440&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const marker = page.locator('.marker[data-entry="fall-of-constantinople"]');
  await expect(marker).toBeVisible();
  await marker.locator('.marker-shape').click();
  const card = page.getByTestId('entry-card');
  await expect(card.getByRole('heading', { level: 2, name: 'Fall of Constantinople' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Read more on Wikipedia' })).toHaveAttribute('href', /wikipedia\.org\/wiki\/Fall_of_Constantinople/);
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('strip-year')).toHaveText('1453');
  await expect(page).toHaveURL(/item=fall-of-constantinople/);
});

test('a card links a moment to the state it is part of, and the state back to its moments', async ({ page }) => {
  await page.goto('/?item=fall-of-constantinople&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const card = page.getByTestId('entry-card');
  await expect(card.getByRole('heading', { level: 3, name: 'Part of' })).toBeVisible();
  await card.getByRole('button', { name: /^Byzantine Empire/ }).click();
  await expect(card.getByRole('heading', { level: 2, name: 'Byzantine Empire' })).toBeVisible();
  await expect(card).toHaveAttribute('data-kind', 'state');
  await expect(card).toContainText('Why it mattered');
  await expect(card.getByRole('heading', { level: 3, name: 'Key moments' })).toBeVisible();
  await expect(page.locator('.era[data-entry="byzantine"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/item=byzantine/);
  await card.getByRole('button', { name: /more$/ }).click();
  await card.getByRole('button', { name: /^Fall of Constantinople/ }).click();
  await expect(card.getByRole('heading', { level: 2, name: 'Fall of Constantinople' })).toBeVisible();
});

test('with nothing selected the pane reads the slice under the playhead', async ({ page }) => {
  await page.goto('/?year=1453&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const panel = page.getByTestId('event-panel');
  await expect(panel).toContainText('Around 1453');
  const inProgress = panel.getByRole('list', { name: 'In progress in Europe' });
  await expect(inProgress.getByRole('button', { name: /^Byzantine Empire/ })).toBeVisible();
  await expect(inProgress.getByRole('button', { name: /^Hundred Years' War/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Fall of Constantinople/ })).toBeVisible();
  // Moving the playhead a year past both ends drops them from what is in progress.
  await page.goto('/?year=1454&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(panel.getByRole('list', { name: 'In progress in Europe' }).getByRole('button', { name: /^Byzantine Empire/ })).toHaveCount(0);
});

test('events in regions that are switched off are announced and one click shows them', async ({ page }) => {
  await page.goto('/?year=1492&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('navigation', { name: 'Timeline regions' }).getByRole('button', { name: 'Americas', exact: true }).click();
  const panel = page.getByTestId('event-panel');
  await expect(panel.getByRole('button', { name: /^Columbus reaches the Americas/ })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Show all regions' }).click();
  await expect(panel.getByRole('button', { name: /^Columbus reaches the Americas/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Timeline regions' }).getByRole('button', { name: 'Americas', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('a shared entry link shows its region and marker on the timeline', async ({ page }) => {
  await page.goto('/?item=columbus-reaches-americas&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('entry-card').getByRole('heading', { level: 2 })).toHaveText('Columbus reaches the Americas');
  await expect(page.locator('.marker[data-entry="columbus-reaches-americas"]')).toBeVisible();
});

test('older links keep working, including one to a founding that is now part of its state', async ({ page }) => {
  await page.goto('/?event=caesar-assassination');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('entry-card').getByRole('heading', { level: 2 })).toHaveText('Julius Caesar assassinated');
  await page.goto('/?event=ming-dynasty-founded');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const card = page.getByTestId('entry-card');
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Ming dynasty');
  await expect(page.getByTestId('strip-year')).toHaveText('1368');
});

test('a period is drawn once: a named pill in its row, or a small pill among the moments', async ({ page }) => {
  await page.goto('/?year=1096');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('.marker-period').first()).toBeVisible();
  const pills = await page.evaluate(() => {
    const inRows = [...document.querySelectorAll<SVGGElement>('.era-period')];
    return {
      unnamed: inRows.filter((pill) => !pill.querySelector('.era-label')).length,
      twice: inRows.filter((pill) => document.querySelector(`.marker[data-entry="${pill.dataset.entry}"]`)).length,
    };
  });
  expect(pills).toEqual({ unnamed: 0, twice: 0 });
});

test('two moments in the same year can both be clicked', async ({ page }) => {
  await page.goto('/?year=1985&zoom=30');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const ussr = page.locator('.marker[data-entry="dissolution-of-ussr"] .marker-shape');
  const web = page.locator('.marker[data-entry="world-wide-web"] .marker-shape');
  await web.click();
  await expect(page.getByTestId('entry-card').getByRole('heading', { level: 2 })).toHaveText('World Wide Web goes public');
  await ussr.click();
  await expect(page.getByTestId('entry-card').getByRole('heading', { level: 2 })).toHaveText('Dissolution of the Soviet Union');
});

test('dragging the top edge of the timeline makes it taller', async ({ page }) => {
  await page.goto('/?year=1453&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const strip = page.getByRole('region', { name: 'Timeline', exact: true });
  const before = (await strip.boundingBox())!;
  const handle = (await page.getByRole('separator', { name: 'Resize timeline' }).boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y - 150, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await strip.boundingBox())!.height).toBeGreaterThan(before.height + 100);
});

test('a card opens at its top, however far the pane had been scrolled', async ({ page }) => {
  await page.goto('/?year=1453&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const panel = page.getByTestId('event-panel');
  const row = panel.getByRole('button', { name: /^Timurid Empire/ });
  await row.scrollIntoViewIfNeeded();
  expect(await panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await row.click();
  const card = page.getByTestId('entry-card');
  await expect(card.getByRole('heading', { level: 2, name: 'Timurid Empire' })).toBeInViewport();
  expect(await panel.evaluate((el) => el.scrollTop)).toBe(0);
  // Following a link inside a long card starts the next card at its top too.
  await page.setViewportSize({ width: 1280, height: 620 });
  const inside = card.getByRole('button', { name: /^Timur's conquests/ });
  await inside.scrollIntoViewIfNeeded();
  expect(await panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await inside.click();
  await expect(card.getByRole('heading', { level: 2, name: "Timur's conquests" })).toBeInViewport();
  expect(await panel.evaluate((el) => el.scrollTop)).toBe(0);
});
