// Accessibility: axe's WCAG 2.2 A and AA rules on every screen at phone and desktop width, keyboard use of the
// marked-up terms, and the Cense floors (13px type, 40px tap targets, 16px inputs). A11Y-01 in audits/REPORT.md.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, decodeText, PHONE, DESKTOP } from './helpers.mjs';
import { mockDecode, CARD_DECODE } from '../lib/decode-fixtures.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axe(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map(v => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target}`);
}

const SCREENS = {
  input: async page => page.goto('/'),
  result: async page => {
    await mockDecode(page, CARD_DECODE);
    await decodeText(page, '0% intro APR for 15 months, then a variable APR. No annual fee.');
    await page.locator('button.term').first().click();
  },
  error: async page => {
    await mockDecode(page, null, 'http500');
    await decodeText(page, 'Anything at all.');
  },
};

for (const [vpName, viewport] of Object.entries({ phone: PHONE, desktop: DESKTOP })) {
  for (const [name, open] of Object.entries(SCREENS)) {
    test(`axe finds no WCAG A or AA violations on the ${name} screen, ${vpName}`, async ({ page }) => {
      // Checked with a term opened: the white-on-orange highlight measured 4.06:1 before A11Y-01 was fixed.
      await page.setViewportSize(viewport);
      await open(page);
      await page.waitForTimeout(400);
      expect(await axe(page)).toEqual([]);
    });

    test(`the ${name} screen keeps the Cense floors, ${vpName}: 13px type, 40px targets, 16px input text, no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await page.waitForTimeout(400);
      const report = await page.evaluate(() => {
        const small = [];
        const tiny = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!n.textContent.trim() || !el || el.closest('[aria-hidden="true"], .sr-only')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 13) small.push(`${size}px "${n.textContent.trim().slice(0, 30)}"`);
        }
        for (const el of document.querySelectorAll('button, a[href], input:not(.sr-only)')) {
          const r = el.getBoundingClientRect();
          if (!r.width || el.classList.contains('term')) continue; // a term is a word inside a sentence (WCAG 2.5.8 inline exception)
          if (el.closest('p') && el.tagName === 'A') continue; // a link inside a sentence, same exception
          if (r.height < 40) tiny.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.height)}px`);
        }
        const ta = document.querySelector('textarea');
        return {
          small, tiny,
          inputPx: ta ? parseFloat(getComputedStyle(ta).fontSize) : 16,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(report.small, 'text under 13px').toEqual([]);
      expect(report.tiny, 'targets under 40px').toEqual([]);
      expect(report.inputPx).toBeGreaterThanOrEqual(16);
      expect(report.overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('the marked terms work from the keyboard', async ({ page }) => {
  await mockDecode(page, CARD_DECODE);
  await decodeText(page, '0% intro APR for 15 months, then a variable APR. No annual fee.');
  const first = page.locator('button.term').first();
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#term-definition')).not.toBeEmpty();
});

test('the urgency level is never carried by colour alone: the word and the step count are in its accessible name', async ({ page }) => {
  await mockDecode(page, CARD_DECODE);
  await decodeText(page, 'Anything at all.');
  await expect(page.locator('[aria-label^="Moderate, step 2 of 3"]')).toHaveCount(1);
});
