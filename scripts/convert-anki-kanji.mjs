// Converts the JLPT kanji Anki decks in public/jlpt (legacy Anki 1.x SQLite
// databases despite the .anki extension) into plain-text kanji lists.
// Each level produces public/jlpt/n<level>-kanji.txt: all kanji on a single
// line, in deck (frequency) order.
//
// Run: node scripts/convert-anki-kanji.mjs

import { DatabaseSync } from 'node:sqlite'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const jlptDir = join(__dirname, '..', 'public', 'jlpt')

const levels = [1, 2, 3, 4, 5]

const query = `
  SELECT f.value
  FROM fields f
  JOIN fieldModels fm ON fm.id = f.fieldModelId
  JOIN facts fa ON fa.id = f.factId
  WHERE fm.name = 'Front'
  ORDER BY fa.created ASC
`

for (const level of levels) {
  const src = join(jlptDir, `n${level}-kanji-char-eng.anki`)
  const out = join(jlptDir, `n${level}-kanji.txt`)

  const db = new DatabaseSync(src)
  const kanji = db.prepare(query).all().map((row) => row.value)
  db.close()

  writeFileSync(out, kanji.join(''), 'utf8')
  console.log(`n${level}: ${kanji.length} kanji -> ${out}`)
}
