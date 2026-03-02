require('dotenv').config()
const express = require('express')
const { Pool }  = require('pg')

const app    = express()
const PORT   = process.env.PORT || 3001
const SCHEMA = process.env.META_DB_SCHEMA || 'public'

// ─── DB Pools ─────────────────────────────────────────────────────────────────

const metaPool = new Pool({
  host:     process.env.META_DB_HOST   || '127.0.0.1',
  port:    +process.env.META_DB_PORT   || 5432,
  database: process.env.META_DB_NAME   || 'ppdm_meta',
  user:     process.env.META_DB_USER   || 'postgres',
  password: process.env.META_DB_PASS   || 'postgres',
})

const targetEnabled = process.env.TARGET_DB_ENABLED === 'true'
const targetSchema  = process.env.TARGET_DB_SCHEMA  || 'public'

const targetPool = targetEnabled ? new Pool({
  host:     process.env.TARGET_DB_HOST   || '127.0.0.1',
  port:    +process.env.TARGET_DB_PORT   || 5432,
  database: process.env.TARGET_DB_NAME   || 'ppdm_meta',
  user:     process.env.TARGET_DB_USER   || 'postgres',
  password: process.env.TARGET_DB_PASS   || 'postgres',
}) : null

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mq = (sql, p) => metaPool.query(sql, p).then(r => r.rows)
const ms = (sql, p) => metaPool.query(sql, p).then(r => +Object.values(r.rows[0] ?? {})[0] || 0)
const tq = (sql, p) => targetPool.query(sql, p).then(r => r.rows)
const ts = (sql, p) => targetPool.query(sql, p).then(r => +Object.values(r.rows[0] ?? {})[0] || 0)

function qi(id) { return '"' + id.replace(/"/g, '""') + '"' }

// pg_constraint.contype → our label
const CONTYPE = { p: 'PRIMARY_KEY', f: 'FOREIGN_KEY', u: 'UNIQUE_KEY', c: 'CHECK' }

function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res) }
    catch (err) { console.error(err.message); res.status(500).json({ error: err.message }) }
  }
}

// ─── GET /api/stats ───────────────────────────────────────────────────────────

app.get('/api/stats', wrap(async (req, res) => {
  const [tables, columns, constraints, domains] = await Promise.all([
    ms(`SELECT count(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r'`, [SCHEMA]),

    ms(`SELECT count(*) FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped`, [SCHEMA]),

    ms(`SELECT count(*) FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND con.contype IN ('p','f','u','c')`, [SCHEMA]),

    ms(`SELECT count(*) FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = $1 AND t.typtype = 'd'`, [SCHEMA]),
  ])

  // check_values = number of CHECK constraints
  const check_values = await ms(
    `SELECT count(*) FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND con.contype = 'c'`, [SCHEMA]
  )

  res.json({
    stats: { tables, columns, constraints, cons_columns: columns, domains, check_values },
    meta_db:   process.env.META_DB_NAME,
    target_db: targetEnabled ? process.env.TARGET_DB_NAME : null,
  })
}))

// ─── GET /api/tables?q= ───────────────────────────────────────────────────────

app.get('/api/tables', wrap(async (req, res) => {
  const q = (req.query.q || '').trim()

  let rows
  if (!q) {
    rows = await mq(`
      SELECT c.relname AS table_name,
             d.description AS table_comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      WHERE n.nspname = $1 AND c.relkind = 'r'
      ORDER BY c.relname`, [SCHEMA])
  } else {
    rows = await mq(`
      SELECT c.relname AS table_name,
             d.description AS table_comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      WHERE n.nspname = $1 AND c.relkind = 'r'
        AND (c.relname ILIKE $2 OR coalesce(d.description,'') ILIKE $2)
      ORDER BY c.relname`, [SCHEMA, `%${q}%`])
  }

  res.json({ tables: rows })
}))

// ─── GET /api/table?name= ─────────────────────────────────────────────────────

app.get('/api/table', wrap(async (req, res) => {
  const name = (req.query.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Missing ?name=' })

  // Check table exists + get comment
  const tableRows = await mq(`
    SELECT c.relname AS table_name,
           d.description AS table_comment
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
    WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r'
  `, [SCHEMA, name])

  if (!tableRows.length) return res.status(404).json({ error: `Table not found: ${name}` })

  // Columns — from information_schema + col_description
  const colRows = await mq(`
    SELECT
      c.column_name,
      c.data_type,
      c.character_maximum_length  AS column_length,
      c.numeric_precision         AS decimal_precision,
      c.numeric_scale             AS decimal_scale,
      c.is_nullable,
      c.domain_name               AS domain,
      pg_catalog.col_description(
        (SELECT pc.oid FROM pg_class pc
         JOIN pg_namespace pn ON pn.oid = pc.relnamespace
         WHERE pc.relname = $2 AND pn.nspname = $1),
        c.ordinal_position
      ) AS column_comment
    FROM information_schema.columns c
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [SCHEMA, name])

  const columns = colRows.map(c => ({
    ...c,
    null_allowed_ba_id: c.is_nullable === 'YES' ? 'Y' : 'N',
  }))

  // Constraints — pg_constraint
  const consRows = await mq(`
    SELECT
      con.conname                        AS constraint_name,
      con.contype                        AS constraint_type,
      ref.relname                        AS ref_table_name,
      pg_get_constraintdef(con.oid)      AS constraint_text
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE n.nspname = $1 AND c.relname = $2
      AND con.contype IN ('p','f','u','c')
    ORDER BY con.contype, con.conname
  `, [SCHEMA, name])

  // Constraint columns — unnest conkey/confkey (skip CHECK)
  const consColRows = await mq(`
    SELECT
      con.conname       AS constraint_name,
      c.relname         AS table_name,
      a.attname         AS column_name,
      ref.relname       AS ref_table_name,
      ra.attname        AS ref_column_name,
      pos.ordinality    AS column_position
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS pos(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = pos.attnum
    LEFT JOIN pg_class ref ON ref.oid = con.confrelid
    LEFT JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS rpos(attnum, ordinality)
           ON rpos.ordinality = pos.ordinality
    LEFT JOIN pg_attribute ra ON ra.attrelid = ref.oid AND ra.attnum = rpos.attnum
    WHERE n.nspname = $1 AND c.relname = $2
      AND con.contype IN ('p','f','u')
    ORDER BY con.conname, pos.ordinality
  `, [SCHEMA, name])

  // Merge constraints with their columns
  const consMap = {}
  for (const c of consRows) {
    consMap[c.constraint_name] = {
      ...c,
      constraint_type: CONTYPE[c.constraint_type] ?? c.constraint_type,
      columns: [],
    }
  }
  for (const cc of consColRows) {
    if (consMap[cc.constraint_name]) consMap[cc.constraint_name].columns.push(cc)
  }

  // Parent / child relationships
  const [parents, children] = await Promise.all([
    mq(`SELECT DISTINCT pt.relname AS parent_table, con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class ct ON ct.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN pg_class pt ON pt.oid = con.confrelid
        WHERE n.nspname = $1 AND ct.relname = $2 AND con.contype = 'f'
        ORDER BY pt.relname, con.conname`, [SCHEMA, name]),

    mq(`SELECT DISTINCT ct.relname AS child_table, con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class ct ON ct.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN pg_class pt ON pt.oid = con.confrelid
        WHERE n.nspname = $1 AND pt.relname = $2 AND con.contype = 'f'
        ORDER BY ct.relname, con.conname`, [SCHEMA, name]),
  ])

  res.json({
    table:       tableRows[0],
    columns,
    constraints: Object.values(consMap),
    children,
    parents,
    aliases: [],    // no PPDM_TABLE_ALIAS equivalent in pg_catalog
  })
}))

// ─── GET /api/erd-data?name= ──────────────────────────────────────────────────

app.get('/api/erd-data', wrap(async (req, res) => {
  const name = (req.query.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Missing ?name=' })

  // Check table exists + get comment
  const tableRows = await mq(`
    SELECT c.relname AS table_name,
           d.description AS table_comment
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
    WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'r'
  `, [SCHEMA, name])

  if (!tableRows.length) return res.status(404).json({ error: `Table not found: ${name}` })

  // Columns — from information_schema + col_description
  const colRows = await mq(`
    SELECT
      c.column_name,
      c.data_type,
      c.character_maximum_length  AS column_length,
      c.numeric_precision         AS decimal_precision,
      c.numeric_scale             AS decimal_scale,
      c.is_nullable,
      c.domain_name               AS domain,
      pg_catalog.col_description(
        (SELECT pc.oid FROM pg_class pc
         JOIN pg_namespace pn ON pn.oid = pc.relnamespace
         WHERE pc.relname = $2 AND pn.nspname = $1),
        c.ordinal_position
      ) AS column_comment
    FROM information_schema.columns c
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [SCHEMA, name])

  const columns = colRows.map(c => ({
    ...c,
    null_allowed_ba_id: c.is_nullable === 'YES' ? 'Y' : 'N',
  }))

  // Constraints — pg_constraint
  const consRows = await mq(`
    SELECT
      con.conname                        AS constraint_name,
      con.contype                        AS constraint_type,
      ref.relname                        AS ref_table_name,
      pg_get_constraintdef(con.oid)      AS constraint_text
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class ref ON ref.oid = con.confrelid
    WHERE n.nspname = $1 AND c.relname = $2
      AND con.contype IN ('p','f','u','c')
    ORDER BY con.contype, con.conname
  `, [SCHEMA, name])

  // Constraint columns — unnest conkey/confkey (skip CHECK)
  const consColRows = await mq(`
    SELECT
      con.conname       AS constraint_name,
      c.relname         AS table_name,
      a.attname         AS column_name,
      ref.relname       AS ref_table_name,
      ra.attname        AS ref_column_name,
      pos.ordinality    AS column_position
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS pos(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = pos.attnum
    LEFT JOIN pg_class ref ON ref.oid = con.confrelid
    LEFT JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS rpos(attnum, ordinality)
           ON rpos.ordinality = pos.ordinality
    LEFT JOIN pg_attribute ra ON ra.attrelid = ref.oid AND ra.attnum = rpos.attnum
    WHERE n.nspname = $1 AND c.relname = $2
      AND con.contype IN ('p','f','u')
    ORDER BY con.conname, pos.ordinality
  `, [SCHEMA, name])

  // Merge constraints with their columns
  const consMap = {}
  for (const c of consRows) {
    consMap[c.constraint_name] = {
      ...c,
      constraint_type: CONTYPE[c.contype] ?? c.contype,
      columns: [],
    }
  }
  for (const cc of consColRows) {
    if (consMap[cc.constraint_name]) consMap[cc.constraint_name].columns.push(cc)
  }


  // Parent / child relationships
  const [parentRels, childRels] = await Promise.all([
    mq(`SELECT DISTINCT pt.relname AS parent_table, con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class ct ON ct.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN pg_class pt ON pt.oid = con.confrelid
        WHERE n.nspname = $1 AND ct.relname = $2 AND con.contype = 'f'
        ORDER BY pt.relname, con.conname`, [SCHEMA, name]),

    mq(`SELECT DISTINCT ct.relname AS child_table, con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class ct ON ct.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN pg_class pt ON pt.oid = con.confrelid
        WHERE n.nspname = $1 AND pt.relname = $2 AND con.contype = 'f'
        ORDER BY ct.relname, con.conname`, [SCHEMA, name]),
  ])

  // Fetch columns for parent tables
  const parents = await Promise.all(parentRels.map(async p => {
    const pCols = await mq(`
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length  AS column_length,
        c.numeric_precision         AS decimal_precision,
        c.numeric_scale             AS decimal_scale,
        c.is_nullable,
        c.domain_name               AS domain,
        pg_catalog.col_description(
          (SELECT pc.oid FROM pg_class pc
           JOIN pg_namespace pn ON pn.oid = pc.relnamespace
           WHERE pc.relname = $2 AND pn.nspname = $1),
          c.ordinal_position
        ) AS column_comment
      FROM information_schema.columns c
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `, [SCHEMA, p.parent_table])
    return { ...p, columns: pCols.map(c => ({ ...c, null_allowed_ba_id: c.is_nullable === 'YES' ? 'Y' : 'N' })) }
  }))

  // Fetch columns for child tables
  const children = await Promise.all(childRels.map(async c => {
    const cCols = await mq(`
      SELECT
        t.column_name,
        t.data_type,
        t.character_maximum_length  AS column_length,
        t.numeric_precision         AS decimal_precision,
        t.numeric_scale             AS decimal_scale,
        t.is_nullable,
        t.domain_name               AS domain,
        pg_catalog.col_description(
          (SELECT pc.oid FROM pg_class pc
           JOIN pg_namespace pn ON pn.oid = pc.relnamespace
           WHERE pc.relname = $2 AND pn.nspname = $1),
          t.ordinal_position
        ) AS column_comment
      FROM information_schema.columns t
      WHERE t.table_schema = $1 AND t.table_name = $2
      ORDER BY t.ordinal_position
    `, [SCHEMA, c.child_table])
    return { ...c, columns: cCols.map(col => ({ ...col, null_allowed_ba_id: col.is_nullable === 'YES' ? 'Y' : 'N' })) }
  }))


  res.json({
    table:       tableRows[0],
    columns,
    constraints: Object.values(consMap),
    children,
    parents,
  })
}))

// ─── GET /api/load-order — Kahn's topological sort ───────────────────────────

app.get('/api/load-order', wrap(async (req, res) => {
  const [tableRows, edgeRows] = await Promise.all([
    mq(`SELECT c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r'
        ORDER BY c.relname`, [SCHEMA]),

    mq(`SELECT DISTINCT
          ct.relname AS child_table,
          pt.relname AS parent_table,
          con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class ct ON ct.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = ct.relnamespace
        JOIN pg_class pt ON pt.oid = con.confrelid
        WHERE n.nspname = $1 AND con.contype = 'f'`, [SCHEMA]),
  ])

  const tables = tableRows.map(r => r.table_name)
  const edges  = edgeRows

  const adj   = {}
  const indeg = {}
  for (const t of tables) { adj[t] = []; indeg[t] = 0 }

  for (const { child_table, parent_table } of edges) {
    if (!(child_table in adj) || !(parent_table in adj)) continue
    adj[parent_table].push(child_table)
    indeg[child_table]++
  }

  let queue = tables.filter(t => indeg[t] === 0)
  const order  = []
  const levels = {}
  let lvl = 0

  while (queue.length) {
    const next = []
    levels[lvl] = []
    for (const node of queue) {
      order.push(node)
      levels[lvl].push(node)
      for (const child of adj[node]) {
        if (--indeg[child] === 0) next.push(child)
      }
    }
    queue = next
    lvl++
  }

  const cycles = Object.entries(indeg)
    .filter(([, d]) => d > 0)
    .map(([table, remaining_in_degree]) => ({ table, remaining_in_degree }))

  res.json({ order, levels, cycles, edges_count: edges.length, nodes_count: tables.length })
}))

// ─── GET /api/columns?q= — Column cross-reference ────────────────────────────

app.get('/api/columns', wrap(async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 2) return res.json({ rows: [], total: 0 })

  const rows = await mq(`
    SELECT
      c.relname                                          AS table_name,
      td.description                                     AS table_comment,
      a.attname                                          AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod)   AS data_type,
      CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END    AS is_nullable,
      pg_catalog.col_description(a.attrelid, a.attnum)  AS column_comment
    FROM pg_attribute a
    JOIN pg_class c      ON c.oid = a.attrelid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    LEFT JOIN pg_description td ON td.objoid = c.oid AND td.objsubid = 0
    WHERE n.nspname = $1
      AND c.relkind  = 'r'
      AND a.attnum   > 0
      AND NOT a.attisdropped
      AND a.attname ILIKE $2
    ORDER BY a.attname, c.relname
    LIMIT 1000
  `, [SCHEMA, `%${q}%`])

  res.json({ rows, total: rows.length })
}))

// ─── GET /api/audit ───────────────────────────────────────────────────────────

app.get('/api/audit', wrap(async (req, res) => {
  if (!targetPool) return res.json({ disabled: true })

  const [metaTables, metaColumns, metaConstraints, targetTableCount] = await Promise.all([
    ms(`SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND c.relkind='r'`, [SCHEMA]),
    ms(`SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped`, [SCHEMA]),
    ms(`SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND con.contype IN ('p','f','u','c')`, [SCHEMA]),
    ts(`SELECT count(*) FROM information_schema.tables
        WHERE table_schema=$1 AND table_type='BASE TABLE'`, [targetSchema]),
  ])

  // Missing tables
  const [allMeta, allTarget] = await Promise.all([
    mq(`SELECT c.relname AS table_name FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND c.relkind='r' ORDER BY c.relname`, [SCHEMA]),
    tq(`SELECT table_name FROM information_schema.tables
        WHERE table_schema=$1 AND table_type='BASE TABLE'`, [targetSchema]),
  ])

  const metaNames  = allMeta.map(r => r.table_name)
  const targetSet  = new Set(allTarget.map(r => r.table_name.toLowerCase()))
  const missingTabs  = metaNames.filter(t => !targetSet.has(t.toLowerCase()))
  const presentTabs  = metaNames.filter(t =>  targetSet.has(t.toLowerCase()))
  const checkTabs    = presentTabs.slice(0, 200)

  // Missing columns
  const missingColumns = []
  for (const t of checkTabs) {
    const [metaCols, targetCols] = await Promise.all([
      mq(`SELECT a.attname AS column_name FROM pg_attribute a
          JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname=$1 AND c.relname=$2 AND a.attnum>0 AND NOT a.attisdropped`, [SCHEMA, t]),
      tq(`SELECT column_name FROM information_schema.columns
          WHERE table_schema=$1 AND table_name=$2`, [targetSchema, t]),
    ])
    const tColSet = new Set(targetCols.map(c => c.column_name.toLowerCase()))
    for (const { column_name } of metaCols) {
      if (!tColSet.has(column_name.toLowerCase()))
        missingColumns.push({ table: t, column: column_name })
    }
  }

  // Orphan FK check (max 30)
  const fkEdges = await mq(`
    SELECT ct.relname AS child_table, pt.relname AS parent_table, con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class ct ON ct.oid=con.conrelid JOIN pg_namespace n ON n.oid=ct.relnamespace
    JOIN pg_class pt ON pt.oid=con.confrelid
    WHERE n.nspname=$1 AND con.contype='f' LIMIT 30`, [SCHEMA])

  const orphans = []
  for (const e of fkEdges) {
    const pairs = await mq(`
      SELECT a.attname AS column_name, ra.attname AS ref_column_name, pos.ordinality AS column_position
      FROM pg_constraint con
      JOIN pg_class ct ON ct.oid=con.conrelid JOIN pg_namespace n ON n.oid=ct.relnamespace
      JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS pos(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid=ct.oid AND a.attnum=pos.attnum
      JOIN pg_class pt ON pt.oid=con.confrelid
      JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS rpos(attnum, ordinality)
             ON rpos.ordinality=pos.ordinality
      JOIN pg_attribute ra ON ra.attrelid=pt.oid AND ra.attnum=rpos.attnum
      WHERE n.nspname=$1 AND ct.relname=$2 AND con.conname=$3
      ORDER BY pos.ordinality`, [SCHEMA, e.child_table, e.constraint_name])

    if (!pairs.length) continue

    const join    = pairs.map(p => `c.${qi(p.column_name)} = p.${qi(p.ref_column_name)}`).join(' AND ')
    const notnull = pairs.map(p => `c.${qi(p.column_name)} IS NOT NULL`).join(' AND ')
    const sql = `SELECT count(*) FROM ${qi(e.child_table)} c
                 LEFT JOIN ${qi(e.parent_table)} p ON ${join}
                 WHERE ${notnull} AND p.${qi(pairs[0].ref_column_name)} IS NULL`
    try {
      const count = await ts(sql)
      orphans.push({ fk: e.constraint_name, child: e.child_table, parent: e.parent_table, pairs, orphan_count: count })
    } catch (err) {
      orphans.push({ fk: e.constraint_name, child: e.child_table, parent: e.parent_table, pairs, error: err.message })
    }
  }

  res.json({
    summary: {
      meta: { tables: metaTables, columns: metaColumns, constraints: metaConstraints },
      target_tables: targetTableCount,
      target_schema: targetSchema,
    },
    missing: { missing_tables: missingTabs, missing_columns: missingColumns, checked_tables_for_columns: checkTabs.length },
    orphans,
  })
}))

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  const { rows } = await metaPool.query('SHOW search_path')
  console.log(`\n  PPDM39 MetaBrowser API`)
  console.log(`  Schema : ${SCHEMA}`)
  console.log(`  Search Path: ${rows[0].search_path}`)
  console.log(`  ➜  http://localhost:${PORT}/api/stats\n`)
})
