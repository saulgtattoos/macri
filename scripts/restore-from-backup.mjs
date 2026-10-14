// Compare a table backup with the current database and repair only rows you approve.
// Nothing is changed unless you run "apply" with explicit row ids.
//
//   node --env-file=<env> scripts/restore-from-backup.mjs diff  <backupDir>
//   node --env-file=<env> scripts/restore-from-backup.mjs apply <backupDir> <table> <id,id,...> [--live]
//
// diff  (read only): for every table, classifies each row as
//   identical            same in backup and database
//   missing              in backup, not in database (deleted since, or lost)
//   changed              in both, different
//                        - "after backup" when the row has updated_at later than the backup time
//                          (newer data: leave it unless you know it is damaged)
//                        - "no timestamp" when the table cannot tell (needs your review)
//   new since backup     in database only (newer data, never touched)
// The full report (row ids and changed column names, no values) goes to
// <backupDir>/restore-report.json; the console shows counts only.
//
// apply: for the listed ids only, first saves the current database version of those rows to
// <backupDir>/pre-repair-<table>-<time>.json (so the repair itself can be undone), then writes
// the backup version (insert or update). Refuses the live project unless --live is given.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const [mode, dir, table, idList, flag] = process.argv.slice(2)
const E = process.env
const url = E.SUPABASE_URL || E.VITE_SUPABASE_URL
const key = E.SUPABASE_SERVICE_ROLE_KEY
if (!['diff', 'apply'].includes(mode) || !dir) {
  console.log('usage: diff <backupDir> | apply <backupDir> <table> <ids> [--live]'); process.exit(2)
}
const isLive = url?.includes('doyqmflzywbqmuhesckw')
const db = createClient(url, key, { auth: { persistSession: false } })
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const takenAt = Date.parse(manifest.taken_at)

const canon = v => v && typeof v === 'object'
  ? JSON.stringify(Array.isArray(v) ? v.map(x => JSON.parse(canon(x) ?? 'null')) : Object.fromEntries(Object.keys(v).sort().map(k => [k, JSON.parse(canon(v[k]) ?? 'null')])))
  : (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && !isNaN(Date.parse(v)) ? JSON.stringify(Date.parse(v)) : JSON.stringify(v ?? null))

async function readAll(t) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await db.from(t).select('*').order('id', { ascending: true }).range(from, from + 999)
    if (r.error) throw new Error(`${t}: ${r.error.message}`)
    rows.push(...r.data); if (r.data.length < 1000) break
  }
  return rows
}

if (mode === 'diff') {
  const report = { project: url, backup_taken_at: manifest.taken_at, generated_at: new Date().toISOString(), tables: {} }
  for (const t of Object.keys(manifest.tables)) {
    const backup = JSON.parse(readFileSync(`${dir}/${t}.json`, 'utf8'))
    const current = new Map((await readAll(t)).map(r => [String(r.id), r]))
    const out = { identical: 0, missing: [], changed_after_backup: [], changed_no_timestamp: [], new_since_backup: [] }
    for (const b of backup) {
      const c = current.get(String(b.id))
      if (!c) { out.missing.push(String(b.id)); continue }
      const cols = Object.keys(b).filter(k => canon(b[k]) !== canon(c[k]))
      if (!cols.length) { out.identical++; continue }
      const entry = { id: String(b.id), columns: cols }
      if ('updated_at' in c && c.updated_at && Date.parse(c.updated_at) > takenAt) out.changed_after_backup.push(entry)
      else out.changed_no_timestamp.push(entry)
    }
    const backupIds = new Set(backup.map(b => String(b.id)))
    for (const id of current.keys()) if (!backupIds.has(id)) out.new_since_backup.push(id)
    report.tables[t] = out
    console.log(`${t.padEnd(24)} identical ${String(out.identical).padStart(4)} | missing ${String(out.missing.length).padStart(3)} | changed after backup ${String(out.changed_after_backup.length).padStart(3)} | changed, no timestamp ${String(out.changed_no_timestamp.length).padStart(3)} | new since backup ${String(out.new_since_backup.length).padStart(3)}`)
  }
  writeFileSync(`${dir}/restore-report.json`, JSON.stringify(report, null, 2), { mode: 0o600 })
  console.log(`report: ${dir}/restore-report.json (ids and column names only). Nothing was changed.`)
}

if (mode === 'apply') {
  if (isLive && flag !== '--live') { console.log('Refusing to write to the live project without --live'); process.exit(2) }
  const ids = (idList || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!table || !ids.length) { console.log('apply needs a table and explicit ids'); process.exit(2) }
  const backup = new Map(JSON.parse(readFileSync(`${dir}/${table}.json`, 'utf8')).map(r => [String(r.id), r]))
  const rows = ids.map(id => backup.get(id))
  if (rows.some(r => !r)) { console.log('some ids are not in the backup; nothing changed'); process.exit(1) }
  const before = await db.from(table).select('*').in('id', ids)
  if (before.error) { console.log('read failed; nothing changed:', before.error.message); process.exit(1) }
  const snap = `${dir}/pre-repair-${table}-${Date.now()}.json`
  writeFileSync(snap, JSON.stringify(before.data), { mode: 0o600 })
  const w = await db.from(table).upsert(rows, { onConflict: 'id' })
  if (w.error) { console.log('write failed:', w.error.message, '(pre repair snapshot kept at', snap + ')'); process.exit(1) }
  console.log(`${table}: restored ${rows.length} row(s) from backup; previous versions saved to ${snap}`)
}
