<div class="card">
  <h2 style="margin-top:0">Dashboard</h2>
  <div class="kpi">
    <div class="box"><div class="small">Tables</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['tables'] ?></div></div>
    <div class="box"><div class="small">Columns</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['columns'] ?></div></div>
    <div class="box"><div class="small">Constraints</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['constraints'] ?></div></div>
    <div class="box"><div class="small">Constraint Columns</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['cons_columns'] ?></div></div>
    <div class="box"><div class="small">Domains</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['domains'] ?></div></div>
    <div class="box"><div class="small">Check Values</div><div style="font-size:22px;font-weight:700"><?= (int)$stats['check_values'] ?></div></div>
  </div>
  <p class="small">Gunakan menu <b>Tables</b> untuk eksplorasi detail, <b>Load Order</b> untuk urutan pengisian berdasarkan FK, dan <b>Audit</b> untuk membandingkan dengan Target DB.</p>
</div>
