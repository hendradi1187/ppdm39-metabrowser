/**
 * seed.js — Download PPDM 3.9 DDL dari GitHub dan import ke database.
 *
 * Urutan eksekusi:
 *   1. PPDM39_TAB.SQL  — CREATE TABLE (semua ~400 tabel)
 *   2. PPDM39_PK.SQL   — Primary keys
 *   3. PPDM39_FK.SQL   — Foreign keys
 *   4. PPDM39_CK.SQL   — Check constraints
 *   5. PPDM39_TCM.SQL  — COMMENT ON TABLE (deskripsi tabel)
 *   6. PPDM39_CCM.SQL  — COMMENT ON COLUMN (deskripsi kolom)
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const { Pool } = require('pg')

const BASE = 'https://raw.githubusercontent.com/rbhughes/pg_ppdm/master/postgres_39'

const FILES = [
  { name: 'PPDM39_TAB.SQL', desc: 'Create tables' },
  { name: 'PPDM39_PK.SQL',  desc: 'Primary keys' },
  { name: 'PPDM39_FK.SQL',  desc: 'Foreign keys' },
  { name: 'PPDM39_CK.SQL',  desc: 'Check constraints' },
  { name: 'PPDM39_TCM.SQL', desc: 'Table comments' },
  { name: 'PPDM39_CCM.SQL', desc: 'Column comments' },
]

// ─── Download ─────────────────────────────────────────────────────────────────

async function download(filename) {
  const url = `${BASE}/${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${filename}`)
  return res.text()
}

// ─── Parse SQL — strip psql metacommands, split on ; ─────────────────────────

function extractStatements(sql) {
  const lines = sql.split('\n').filter(l => !l.trim().startsWith('\\'))
  const cleaned = lines.join('\n')

  const stmts = []
  let buf = ''
  let inStr = false

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]

    // Toggle inside single-quoted string (handle '' escape)
    if (ch === "'" && !inStr) { inStr = true; buf += ch; continue }
    if (ch === "'" && inStr) {
      if (cleaned[i + 1] === "'") { buf += "''"; i++; continue }
      inStr = false; buf += ch; continue
    }

    if (ch === ';' && !inStr) {
      const s = buf.trim()
      if (s && !/^--/.test(s)) stmts.push(s)
      buf = ''
    } else {
      buf += ch
    }
  }
  const last = buf.trim()
  if (last && !/^--/.test(last)) stmts.push(last)
  return stmts
}

// ─── Run statements ───────────────────────────────────────────────────────────

async function runStatements(pool, filename, sql) {
  const stmts = extractStatements(sql)
  console.log(`     ${stmts.length} statements`)

  let ok = 0, skipped = 0, errors = 0
  for (const stmt of stmts) {
    try {
      await pool.query(stmt)
      ok++
    } catch (e) {
      if (/already exists|duplicate/i.test(e.message)) {
        skipped++
      } else {
        errors++
        if (errors <= 5) {
          console.warn(`     [warn] ${e.message.split('\n')[0].slice(0, 120)}`)
        }
      }
    }
  }

  const parts = [`  ✓ ${ok} ok`]
  if (skipped) parts.push(`${skipped} skipped`)
  if (errors)  parts.push(`${errors} errors`)
  console.log('  ' + parts.join('  ') + '\n')
}

function qi(id) { return '"' + id.replace(/"/g, '""') + '"' }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({
    host:     process.env.META_DB_HOST     || '127.0.0.1',
    port:     +(process.env.META_DB_PORT   || 5432),
    database: process.env.META_DB_NAME     || 'ppdm_meta',
    user:     process.env.META_DB_USER     || 'postgres',
    password: process.env.META_DB_PASS     || 'postgres',
  })

  console.log(`\n  PPDM39 Seed`)
  console.log(`  DB : ${process.env.META_DB_USER}@${process.env.META_DB_HOST}:${process.env.META_DB_PORT || 5432}/${process.env.META_DB_NAME}\n`)

  // Test connection and set schema
  const schema = process.env.META_DB_SCHEMA || 'public'
  try {
    await pool.query(`SET search_path TO ${qi(schema)}, public`)
    console.log(`  ✓ Connected to PostgreSQL & set search_path to '${schema}'\n`)
  } catch (e) {
    console.error('  ✗ Connection or schema setup failed:', e.message)
    process.exit(1)
  }

  for (const { name, desc } of FILES) {
    process.stdout.write(`  [${name}]  ${desc}\n`)
    process.stdout.write(`     Downloading...`)
    let sql
    try {
      sql = await download(name)
      process.stdout.write(` ${(sql.length / 1024).toFixed(0)} KB\n`)
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}\n`)
      continue
    }
    await runStatements(pool, name, sql)
  }

  // Final count
  const schema = process.env.META_DB_SCHEMA || 'public'
  const { rows } = await pool.query(`
    SELECT count(*) AS cnt
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r'
  `, [schema])

  console.log(`  Tables in schema '${schema}': ${rows[0].cnt}`)
  console.log(`\n  Seed complete! Run: npm run dev\n`)
  await pool.end()
}

main().catch(e => { console.error('\n  Error:', e.message); process.exit(1) })
