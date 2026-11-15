// Screenshots of every Decode screen at phone (375x812) and desktop (1440x900) width, for the redesign's
// before-and-after record. /api/decode is intercepted in the browser with canned decodes, so no model is called
// and every run shows the same words.
//
//   node lib/screens.mjs --url http://localhost:3208/ --out screenshots/after
//   node lib/screens.mjs --url https://cense-loan-desk.vercel.app/ --out screenshots/reference/loan-desk --plain
//
// --plain only captures the first screen, for reference sites that are not Decode.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { CARD_DECODE, SCAM_DECODE, mockDecode } from './decode-fixtures.mjs';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3208/' },
    out: { type: 'string', default: 'screenshots/latest' },
    plain: { type: 'boolean', default: false },
  },
});

const VIEWPORTS = { phone: { width: 375, height: 812 }, desktop: { width: 1440, height: 900 } };

async function shot(page, dir, name) {
  await page.waitForTimeout(900); // let entrance animations finish
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function decode(page, exampleLabel) {
  await page.goto(values.url);
  await page.getByRole('button', { name: exampleLabel }).click();
  await page.getByRole('button', { name: /decode it/i }).click();
}

const browser = await chromium.launch();
try {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const dir = path.resolve(values.out, vpName);
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();

    await page.goto(values.url);
    await shot(page, dir, '1-input');
    if (values.plain) {
      await context.close();
      continue;
    }

    await page.getByRole('button', { name: /credit card offer/i }).click();
    await shot(page, dir, '2-input-filled');

    await mockDecode(page, CARD_DECODE);
    await decode(page, /credit card offer/i);
    await page.getByRole('button', { name: /decode something else/i }).waitFor();
    await shot(page, dir, '3-result-card');

    // Open one marked term, the signature interaction.
    const term = page.locator('button.term').first();
    if (await term.count()) {
      await term.click();
      await shot(page, dir, '4-result-term-open');
    }

    await page.unroute('**/api/decode');
    await mockDecode(page, SCAM_DECODE);
    await decode(page, /feels off/i);
    await page.getByRole('button', { name: /decode something else/i }).waitFor();
    await shot(page, dir, '5-result-scam');

    await page.unroute('**/api/decode');
    await mockDecode(page, null, 'http500');
    await decode(page, /feels off/i);
    await page.getByRole('button', { name: /try again/i }).waitFor();
    await shot(page, dir, '6-error');

    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`screenshots in ${path.resolve(values.out)}`);
