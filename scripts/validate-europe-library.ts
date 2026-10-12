import { readFileSync } from 'node:fs'
import { parseCustomLibrary } from '../src/custom/library'
import manifest from '../src/data/europe-library-manifest.json'

const library = parseCustomLibrary(JSON.parse(readFileSync('public/libraries/europe.json', 'utf8')))
const candidateIds = new Set(manifest.candidateCountryIds)
const targets = new Set(library.clues.flatMap((clue) => clue.weights.map((row) => row.locationId)))
if (library.clues.length !== manifest.clueCount || candidateIds.size !== 38) throw new Error('Europe manifest count differs')
if (library.clues.filter((clue) => !!clue.imageDataUrl).length !== manifest.illustratedCount) throw new Error('Europe illustrated count differs')
if (manifest.illustratedCount !== 42 || library.clues.length - manifest.illustratedCount !== 73) throw new Error('Europe gallery count differs')
if (targets.size !== candidateIds.size || [...targets].some((id) => !candidateIds.has(id))) throw new Error('Europe target outside candidate set')
for (const id of candidateIds) {
  const cc = library.clues.find((clue) => clue.id.startsWith('custom-europe-domain-') && clue.weights.some((row) => row.locationId === id))
  if (!cc || cc.weights.length !== 1) throw new Error(`Missing country-specific domain for ${id}`)
}
for (const mode of ['left', 'right']) {
  const driving = library.clues.find((clue) => clue.id === `custom-europe-driving-${mode}`)
  if (!driving || driving.weights.length !== candidateIds.size) throw new Error(`Missing driving-side evidence for ${mode}`)
}
console.log(`Europe library valid: ${library.clues.length} clues, ${manifest.illustratedCount} pictures, ${candidateIds.size} candidates`)
