import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATCHES, SQUADS } from '../miniapp/src/data/league'
import { TEAMS } from '../miniapp/src/data/teams'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, 'data.json')

const payload = {
  updatedAt: new Date().toISOString(),
  teams: TEAMS,
  squads: SQUADS,
  matches: MATCHES,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(payload, null, 2))
console.log(`seeded ${MATCHES.length} matches -> ${out}`)
