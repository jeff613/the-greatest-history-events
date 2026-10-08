import { expect, test } from '@playwright/test';

test('the map renders a canvas', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', 'world_bc100.geojson');
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
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('The map needs WebGL')).toBeVisible();
  await page.locator('[data-entry="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
});


test('tapping a territory reveals its name and highlights it, including blank-name source records', async ({ page }) => {
  await page.route('**/borders/*.geojson', async (route) => {
    await route.fulfill({ json: { type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { NAME: '       ', SUBJECTO: 'Bega', COLOR: '#8c4a44', BORDERPRECISION: 1 },
      geometry: { type: 'Polygon', coordinates: [[[-60, -60], [160, -60], [160, 70], [-60, 70], [-60, -60]]] },
    }] } });
  });
  await page.goto('/?year=700');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', 'world_700.geojson');
  const canvas = page.getByTestId('map').locator('canvas');
  await canvas.click({ position: { x: 450, y: 180 } });
  await expect(page.locator('.territory-popup')).toHaveText('Bega');
  await expect(page.getByTestId('map')).toHaveAttribute('data-region', 'Bega');
  await expect(page.getByText('Selected territory', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Clear territory selection' }).click();
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-region');
  await canvas.click({ position: { x: 450, y: 180 } });
  await expect(page.getByTestId('map')).toHaveAttribute('data-region', 'Bega');
  await page.getByRole('button', { name: 'Historical borders', exact: true }).click();
  await expect(page.locator('.territory-popup')).toHaveCount(0);
  await canvas.click({ position: { x: 450, y: 180 } });
  await expect(page.locator('.territory-popup')).toHaveCount(0);
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-region');
  await page.getByRole('button', { name: 'Geography only', exact: true }).click();
  await canvas.click({ position: { x: 450, y: 180 } });
  await expect(page.getByTestId('map')).toHaveAttribute('data-region', 'Bega');
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(axis.x + axis.width / 2, axis.y + 8);
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-region');
});

/** The map's center and zoom once it has stopped moving, as published on the map element. */
async function mapView(page: import('@playwright/test').Page) {
  const [lng, lat, zoom] = ((await page.getByTestId('map').getAttribute('data-view')) ?? '').split(',').map(Number);
  return { lng, lat, zoom };
}

test('selecting a moment zooms the map in on its place', async ({ page }) => {
  await page.goto('/?year=1440&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', /.+/);
  await page.locator('.marker[data-entry="fall-of-constantinople"] .marker-shape').click();
  await expect.poll(async () => (await mapView(page)).zoom).toBeGreaterThanOrEqual(4);
  const view = await mapView(page);
  expect(Math.abs(view.lng - 28.9)).toBeLessThan(1);
  expect(Math.abs(view.lat - 41)).toBeLessThan(1);
});

test('selecting a period with no single place zooms the map to its region', async ({ page }) => {
  await page.goto('/?year=1500&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', /.+/);
  await page.locator('.era[data-entry="renaissance"]').click({ position: { x: 40, y: 8 } });
  // The map starts at zoom 1.8, showing most of the world.
  await expect.poll(async () => (await mapView(page)).zoom).toBeGreaterThan(2);
  const view = await mapView(page);
  expect(view.lng).toBeGreaterThan(-11);
  expect(view.lng).toBeLessThan(42);
  expect(view.lat).toBeGreaterThan(35);
  expect(view.lat).toBeLessThan(62);
});

test('selecting a small state zooms in closely on its territory', async ({ page }) => {
  await page.goto('/?year=1500&zoom=6');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', /.+/);
  await page.locator('.era[data-entry="joseon"]').click({ position: { x: 40, y: 8 } });
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'joseon');
  await expect.poll(async () => (await mapView(page)).zoom).toBeGreaterThan(3.5);
  const view = await mapView(page);
  expect(Math.abs(view.lng - 127.5)).toBeLessThan(3);
  expect(Math.abs(view.lat - 38)).toBeLessThan(3);
});
