<div class="grid">
  <div class="card">
    <h3 style="margin-top:0">Cari Tabel</h3>
    <form method="get" action="/tables">
      <input class="search" name="q" placeholder="mis. WELL, BA_, ENT_, PPDM_" value="<?= htmlspecialchars($q) ?>">
    </form>
    <p class="small" style="margin-bottom:0">Klik nama tabel untuk membuka detail (kolom, constraint, child/parent).</p>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Daftar Tabel (<?= count($tables) ?>)</h3>
    <table>
      <thead>
        <tr><th style="width:260px">TABLE_NAME</th><th>COMMENT</th></tr>
      </thead>
      <tbody>
        <?php foreach ($tables as $t): ?>
        <tr>
          <td><a href="/table?name=<?= urlencode($t['table_name']) ?>"><?= htmlspecialchars($t['table_name']) ?></a></td>
          <td class="small"><?= htmlspecialchars($t['table_comment'] ?? '') ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
