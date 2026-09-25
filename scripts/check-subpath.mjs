import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const failed = []
page.on('response', (response) => {
  if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
})

try {
  const response = await page.goto('http://127.0.0.1:4173/GeoGuessr/')
  if (response?.status() !== 200) throw new Error(`Subpath document returned ${response?.status()}`)
  await page.getByRole('button', { name: /Red triangular sign with/ }).first().click()
  await page.locator('.clue-main img').evaluateAll(async (images) => {
    await Promise.all(images.map(async (image) => { image.loading = 'eager'; await image.decode() }))
  })
  const broken = await page.locator('img').evaluateAll((images) => images.filter((image) => image.complete && !image.naturalWidth).map((image) => image.src))
  if (broken.length) throw new Error(`Broken images: ${broken.join(', ')}`)
  await page.reload()
  await page.getByText('All approved clues').waitFor()
  if (failed.length) throw new Error(`Failed requests: ${failed.join(', ')}`)
  console.log('Pages-style /GeoGuessr/ route, refresh, photos and flags loaded without HTTP errors.')
} finally {
  await browser.close()
}
