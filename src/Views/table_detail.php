<div class="card" style="margin-bottom:16px">
  <h2 style="margin:0"><?= htmlspecialchars($table['table_name']) ?></h2>
  <div class="small" style="margin-top:6px"><?= htmlspecialchars($table['table_comment'] ?? '') ?></div>
  <?php if (!empty($aliases)): ?>
    <div style="margin-top:10px">
      <?php foreach ($aliases as $a): ?>
        <span class="badge"><?= htmlspecialchars($a['alias_type'] ?? 'ALIAS') ?>: <?= htmlspecialchars($a['table_alias']) ?></span>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <div style="margin-top:10px">
    <span class="badge">Parents: <?= count($parents) ?></span>
    <span class="badge">Children: <?= count($children) ?></span>
    <span class="badge">Columns: <?= count($columns) ?></span>
    <span class="badge">Constraints: <?= count($constraints) ?></span>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h3 style="margin-top:0">Relationships</h3>

    <div style="margin-bottom:14px">
      <div class="small"><b>Parent tables</b> (tabel yang direferensikan oleh <?= htmlspecialchars($table['table_name']) ?>)</div>
      <ul>
        <?php foreach ($parents as $p): ?>
          <li><a href="/table?name=<?= urlencode($p['parent_table']) ?>"><?= htmlspecialchars($p['parent_table']) ?></a>
            <span class="small">via <?= htmlspecialchars($p['constraint_name']) ?></span></li>
        <?php endforeach; ?>
        <?php if (count($parents)===0): ?><li class="small">Tidak ada</li><?php endif; ?>
      </ul>
    </div>

    <div>
      <div class="small"><b>Child tables</b> (tabel yang mereferensikan <?= htmlspecialchars($table['table_name']) ?>)</div>
      <ul>
        <?php foreach ($children as $c): ?>
          <li><a href="/table?name=<?= urlencode($c['child_table']) ?>"><?= htmlspecialchars($c['child_table']) ?></a>
            <span class="small">via <?= htmlspecialchars($c['constraint_name']) ?></span></li>
        <?php endforeach; ?>
        <?php if (count($children)===0): ?><li class="small">Tidak ada</li><?php endif; ?>
      </ul>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Columns</h3>
    <table>
      <thead>
        <tr>
          <th>NAME</th><th>TYPE</th><th>DOMAIN</th><th>COMMENT</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($columns as $c): ?>
        <tr>
          <td><b><?= htmlspecialchars($c['column_name']) ?></b></td>
          <td class="small">
            <?= htmlspecialchars($c['data_type'] ?? '') ?>
            <?php if (!empty($c['column_length'])): ?> (<?= (int)$c['column_length'] ?>)<?php endif; ?>
            <?php if (!empty($c['decimal_precision'])): ?> (<?= (int)$c['decimal_precision'] ?>,<?= (int)($c['decimal_scale'] ?? 0) ?>)<?php endif; ?>
          </td>
          <td class="small"><?= htmlspecialchars($c['domain'] ?? '') ?></td>
          <td class="small"><?= htmlspecialchars($c['column_comment'] ?? '') ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

    <h3 style="margin-top:18px">Constraints</h3>
    <?php foreach ($constraints as $con): ?>
      <div class="card" style="padding:12px;margin-bottom:10px;background:rgba(255,255,255,0.02)">
        <div>
          <span class="badge"><?= htmlspecialchars($con['constraint_type']) ?></span>
          <b><?= htmlspecialchars($con['constraint_name']) ?></b>
          <?php if (!empty($con['ref_table_name'])): ?>
            <span class="small">→ <a href="/table?name=<?= urlencode($con['ref_table_name']) ?>"><?= htmlspecialchars($con['ref_table_name']) ?></a></span>
          <?php endif; ?>
        </div>

        <?php if (!empty($con['columns'])): ?>
          <div class="small" style="margin-top:6px">
            <?php foreach ($con['columns'] as $cc): ?>
              <div>
                <?= htmlspecialchars($cc['column_position']) ?>.
                <b><?= htmlspecialchars($cc['column_name']) ?></b>
                <?php if (!empty($cc['ref_column_name'])): ?>
                  → <b><?= htmlspecialchars($cc['ref_column_name']) ?></b>
                <?php endif; ?>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($con['constraint_text'])): ?>
          <pre style="margin-top:8px"><?= htmlspecialchars($con['constraint_text']) ?></pre>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</div>
