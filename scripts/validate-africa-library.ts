import { readFileSync } from 'node:fs'
import { parseCustomLibrary } from '../src/custom/library'
import manifest from '../src/data/africa-library-manifest.json'

const library = parseCustomLibrary(JSON.parse(readFileSync('public/libraries/africa.json', 'utf8')))
const candidateIds = new Set(manifest.candidateCountryIds)
const documented = new Set(library.clues.flatMap((clue) => clue.weights.map((row) => row.locationId.split(':region:')[0])))
if (library.clues.length !== manifest.clueCount) throw new Error('Africa clue count differs from manifest')
if (library.clues.filter((clue) => clue.imageDataUrl).length !== manifest.illustratedCount) throw new Error('Africa image count differs from manifest')
if (candidateIds.size !== manifest.candidateCountryIds.length || documented.size !== candidateIds.size || [...documented].some((id) => !candidateIds.has(id))) throw new Error('Africa candidate list differs from weight targets')
if (library.clues.some((clue) => clue.weights.some((row) => !candidateIds.has(row.locationId.split(':region:')[0])))) throw new Error('Africa rule targets out-of-library country')
console.log(`Africa library valid: ${library.clues.length} clues, ${manifest.illustratedCount} images, ${candidateIds.size} candidates`)
