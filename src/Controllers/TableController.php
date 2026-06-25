<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\MetaRepository;

final class TableController extends BaseController {
  public function list(): void {
    $q = trim($_GET['q'] ?? '');
    $repo = new MetaRepository($this->metaDb());
    $tables = $repo->tables($q);
    $this->render('tables', ['tables' => $tables, 'q' => $q]);
  }

  public function detail(): void {
    $name = trim($_GET['name'] ?? '');
    if ($name === '') { http_response_code(400); echo "Missing ?name="; return; }

    $repo = new MetaRepository($this->metaDb());
    $table = $repo->table($name);
    if (!$table) { http_response_code(404); echo "Table not found in meta: " . htmlspecialchars($name); return; }

    $columns = $repo->columns($name);
    $constraints = $repo->constraints($name);
    $children = $repo->childTables($name);
    $parents = $repo->parentTables($name);
    $aliases = $repo->aliases($name);

    $this->render('table_detail', [
      'table' => $table,
      'columns' => $columns,
      'constraints' => $constraints,
      'children' => $children,
      'parents' => $parents,
      'aliases' => $aliases,
    ]);
  }
}
