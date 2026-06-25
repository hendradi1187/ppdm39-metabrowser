<div class="card" style="margin-bottom:16px">
  <h2 style="margin-top:0">Load Order (Urutan Pengisian Tabel)</h2>
  <div class="small">Graph FK: <?= (int)$nodes ?> tables, <?= (int)$edges ?> foreign keys.</div>
  <p class="small" style="margin-bottom:0">
    Prinsip: tabel yang tidak bergantung pada tabel lain (indegree=0) muncul di level awal.
    Jika ada <i>cycle</i>, tampilkan sebagai daftar “remaining indegree”.
  </p>
</div>

<div class="grid">
  <div class="card">
    <h3 style="margin-top:0">Level-by-level</h3>
    <?php foreach ($levels as $i => $lv): ?>
      <div style="margin-bottom:10px">
        <span class="badge">Level <?= (int)$i ?></span>
        <div class="small"><?= count($lv) ?> tables</div>
        <ul>
          <?php foreach ($lv as $t): ?>
            <li><a href="/table?name=<?= urlencode($t) ?>"><?= htmlspecialchars($t) ?></a></li>
          <?php endforeach; ?>
        </ul>
      </div>
    <?php endforeach; ?>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Linear order</h3>
    <ol>
      <?php foreach ($order as $t): ?>
        <li><a href="/table?name=<?= urlencode($t) ?>"><?= htmlspecialchars($t) ?></a></li>
      <?php endforeach; ?>
    </ol>

    <h3>Cycles</h3>
    <?php if (count($cycles)===0): ?>
      <div class="small">Tidak terdeteksi cycle.</div>
    <?php else: ?>
      <div class="small">Ada cycle / dependensi melingkar. Ini daftar tabel yang masih punya indegree &gt; 0:</div>
      <table>
        <thead><tr><th>TABLE</th><th>remaining indegree</th></tr></thead>
        <tbody>
          <?php foreach ($cycles as $c): ?>
          <tr><td><a href="/table?name=<?= urlencode($c['table']) ?>"><?= htmlspecialchars($c['table']) ?></a></td><td><?= (int)$c['remaining_in_degree'] ?></td></tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <p class="small">Strategi cycle: gunakan <i>deferred constraint</i>, atau insert placeholder parent dulu, atau load per subject area.</p>
    <?php endif; ?>
  </div>
</div>
