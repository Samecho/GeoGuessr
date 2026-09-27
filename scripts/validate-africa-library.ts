import { readFileSync } from 'node:fs'
import { parseCustomLibrary } from '../src/custom/library'
import manifest from '../src/data/africa-library-manifest.json'

const library = parseCustomLibrary(JSON.parse(readFileSync('public/libraries/africa.json', 'utf8')))
const candidateIds = new Set(manifest.candidateCountryIds)
const clueIds = new Set(library.clues.map((clue) => clue.id))
if (library.clues.some((clue) => clue.supersedesClueIds?.some((id) => !clueIds.has(id)))) throw new Error('Africa clue replaces a missing clue')
const documented = new Set(library.clues.flatMap((clue) => clue.weights.map((row) => row.locationId.split(':region:')[0])))
if (library.clues.length !== manifest.clueCount) throw new Error('Africa clue count differs from manifest')
if (library.clues.filter((clue) => clue.imageDataUrl).length !== manifest.illustratedCount) throw new Error('Africa illustrated clue count differs from manifest')
if (library.clues.reduce((count, clue) => count + (clue.imageDataUrl ? 1 : 0) + (clue.additionalImageDataUrls?.length || 0), 0) !== manifest.imageInstanceCount) throw new Error('Africa photo instance count differs from manifest')
if (candidateIds.size !== manifest.candidateCountryIds.length || documented.size !== candidateIds.size || [...documented].some((id) => !candidateIds.has(id))) throw new Error('Africa candidate list differs from weight targets')
if (library.clues.some((clue) => clue.weights.some((row) => !candidateIds.has(row.locationId.split(':region:')[0])))) throw new Error('Africa rule targets out-of-library country')
// Independently sourced photo instances must keep their own visible credit after editing.
for (const [id, creditedIndices] of [
  ['custom-africa-plates-sa-free-state-green', [0]],
  ['custom-africa-plates-sa-gauteng-emblem', [0]],
  ['custom-africa-plates-sa-northern-cape-green', [0]],
  ['custom-africa-plates-namibia-white-blue', [1]],
  ['custom-africa-plates-nigeria-blue-green-map', [0, 1]],
] as const) {
  const clue = library.clues.find((item) => item.id === id)
  if (!clue || creditedIndices.some((index) => !clue.photoCredits?.some((credit) => credit.imageIndex === index))) {
    throw new Error(`Missing credit for independently sourced Africa photo: ${id}`)
  }
}

console.log(`Africa library valid: ${library.clues.length} clues, ${manifest.illustratedCount} illustrated clues / ${manifest.imageInstanceCount} image instances, ${candidateIds.size} candidates`)
