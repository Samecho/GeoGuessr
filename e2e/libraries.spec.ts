import { expect, test } from '@playwright/test'

test('built-in Africa library is selectable and separate from the global and personal libraries', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Global library' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Africa library' }).click()
  await expect(page.locator('.library-picker-note').first()).toContainText('94 clues · 14 documented candidates')
  await expect(page.locator('.tree-all')).toContainText('94', { timeout: 15_000 })
  await expect(page.locator('.scope-inline .count-pill')).toHaveText('14')
  const route = page.locator('.text-clue').filter({ hasText: 'Road number: R followed by digits' })
  await expect(route).toHaveCount(1)
  await route.locator('.text-clue-pick').click()
  await expect(page.locator('.chart-card').first().locator('[data-rank-id]').first()).toHaveAttribute('data-rank-id', 'loc:south-africa')
  await page.getByRole('button', { name: 'Global library' }).click()
  await expect(page.locator('.selection-chip')).toHaveCount(0)
  await expect(page.locator('.gallery-count')).toContainText('304 illustrated')
  await page.getByRole('button', { name: 'Africa library' }).click()
  await expect(page.locator('.selection-chip')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit library' }).click()
  await expect(page.getByRole('heading', { name: 'My clue library' })).toBeVisible()
  await expect(page.locator('.workspace')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Export JSON' }).locator('svg.lucide-upload')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Import JSON' }).locator('svg.lucide-download')).toHaveCount(1)
  await page.getByRole('button', { name: 'Match clues' }).click()
  await expect(page.locator('.selection-chip')).toHaveCount(1)
})


test('Africa plate gallery has one broad card per color and keeps distinct plate layouts', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Africa library' }).click()
  await expect(page.locator('.tree-all')).toContainText('94', { timeout: 15_000 })
  const search = page.getByRole('searchbox', { name: 'Search clue labels' })
  for (const color of ['White', 'Yellow', 'Green', 'Blue', 'Black']) {
    const label = `${color} visible on a license plate`
    await search.fill(label)
    await expect(page.locator('.text-clue').filter({ hasText: label })).toHaveCount(1)
    await expect(page.locator('.clue-card').filter({ hasText: label })).toHaveCount(0)
  }
  await search.fill('Long white front plate and square yellow rear plate')
  await expect(page.locator('.clue-card').filter({ hasText: 'Long white front plate and square yellow rear plate' })).toHaveCount(1)
})


test('Africa plate photo examples include Rwanda and South African province variants without duplicate selection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Africa library' }).click()
  await expect(page.locator('.tree-all')).toContainText('94', { timeout: 15_000 })
  const search = page.getByRole('searchbox', { name: 'Search clue labels' })
  await search.fill('White front plate and yellow rear plate on the same vehicle')
  const paired = page.locator('.clue-card').filter({ hasText: 'White front plate and yellow rear plate on the same vehicle' })
  await paired.locator('.info-button').click()
  const examples = page.locator('.info-modal .instance-strip button')
  await expect(examples).toHaveCount(2)
  const firstImage = await page.locator('.info-modal .modal-image img').getAttribute('src')
  await examples.nth(1).click()
  await expect(page.locator('.info-modal .modal-image img')).not.toHaveAttribute('src', firstImage!)
  await expect(page.locator('.selection-chip')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close' }).click()
  await search.fill('Pale yellow-green plate with black characters')
  await expect(page.locator('.clue-card').filter({ hasText: 'Pale yellow-green plate with black characters' })).toHaveCount(1)
  await search.fill('White front and yellow rear plates with a small striped flag at left')
  await expect(page.locator('.clue-card').filter({ hasText: 'White front and yellow rear plates with a small striped flag at left' })).toHaveCount(1)
})
