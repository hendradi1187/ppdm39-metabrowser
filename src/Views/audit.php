<div class="card" style="margin-bottom:16px">
  <h2 style="margin-top:0">Audit</h2>
  <div class="small">Target schema: <b><?= htmlspecialchars($summary['target_schema']) ?></b></div>
  <div class="kpi" style="margin-top:10px">
    <div class="box"><div class="small">Target tables</div><div style="font-size:22px;font-weight:700"><?= (int)$summary['target_tables'] ?></div></div>
    <div class="box"><div class="small">Meta tables</div><div style="font-size:22px;font-weight:700"><?= (int)$summary['meta']['tables'] ?></div></div>
    <div class="box"><div class="small">Meta constraints</div><div style="font-size:22px;font-weight:700"><?= (int)$summary['meta']['constraints'] ?></div></div>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h3 style="margin-top:0">Missing tables</h3>
    <div class="small">Meta table yang tidak ditemukan pada target:</div>
    <ul>
      <?php foreach ($missing['missing_tables'] as $t): ?>
        <li><?= htmlspecialchars($t) ?></li>
      <?php endforeach; ?>
      <?php if (count($missing['missing_tables'])===0): ?><li class="small">Tidak ada</li><?php endif; ?>
    </ul>

    <h3>Missing columns</h3>
    <div class="small">Dicek pada <?= (int)$missing['checked_tables_for_columns'] ?> table pertama (untuk performa).</div>
    <table>
      <thead><tr><th>TABLE</th><th>COLUMN</th></tr></thead>
      <tbody>
      <?php foreach ($missing['missing_columns'] as $m): ?>
        <tr><td><?= htmlspecialchars($m['table']) ?></td><td><?= htmlspecialchars($m['column']) ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Orphan FK (sample)</h3>
    <div class="small">Cek orphan untuk max 30 FK pertama (bisa dinaikkan di code). Jika error: biasanya karena tabel tidak ada/beda schema/nama column beda.</div>
    <?php foreach ($orphans as $o): ?>
      <div class="card" style="padding:12px;margin-bottom:10px;background:rgba(255,255,255,0.02)">
        <div><span class="badge">FK</span><b><?= htmlspecialchars($o['fk']) ?></b></div>
        <div class="small"><?= htmlspecialchars($o['child']) ?> → <?= htmlspecialchars($o['parent']) ?></div>
        <div class="small">
          <?php foreach ($o['pairs'] as $p): ?>
            <div><?= htmlspecialchars($p['column_name']) ?> → <?= htmlspecialchars($p['ref_column_name']) ?></div>
          <?php endforeach; ?>
        </div>
        <?php if (isset($o['orphan_count'])): ?>
          <div style="margin-top:6px"><span class="badge">orphan_count</span> <b><?= (int)$o['orphan_count'] ?></b></div>
        <?php else: ?>
          <div style="margin-top:6px"><span class="badge">error</span> <span class="small"><?= htmlspecialchars($o['error'] ?? 'unknown') ?></span></div>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</div>
