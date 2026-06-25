<?php
$viewFile = __DIR__ . '/' . $view . '.php';
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PPDM39MetaBrowser</title>
  <link rel="stylesheet" href="/ppdm39metabrowser/public/assets/app.css">
</head>
<body>
  <div class="container">
    <div class="nav" style="margin-bottom:14px">
      <div class="brand">PPDM39MetaBrowser</div>
      <a href="/">Dashboard</a>
      <a href="/tables">Tables</a>
      <a href="/load-order">Load Order</a>
      <a href="/audit">Audit</a>
      <div class="small" style="margin-left:auto">
        Meta DB: <span class="badge"><?= htmlspecialchars($config['meta_db']['dbname']) ?></span>
        <?php if (!empty($config['target_db']['enabled'])): ?>
          Target DB: <span class="badge"><?= htmlspecialchars($config['target_db']['dbname']) ?></span>
        <?php else: ?>
          Target DB: <span class="badge">disabled</span>
        <?php endif; ?>
      </div>
    </div>

    <?php if (file_exists($viewFile)) require $viewFile; else echo "View not found: " . htmlspecialchars($view); ?>
  </div>
</body>
</html>
