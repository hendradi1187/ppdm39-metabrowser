<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Container;
use App\Services\MetaRepository;
use App\Services\AuditService;
use App\Services\GraphService;

final class ApiController extends BaseController {

  public function stats(): void {
    $repo = new MetaRepository($this->metaDb());
    $cfg  = Container::get('config');
    $this->json([
      'stats'    => $repo->stats(),
      'meta_db'  => $cfg['meta_db']['dbname'] ?? null,
      'target_db'=> !empty($cfg['target_db']['enabled']) ? ($cfg['target_db']['dbname'] ?? null) : null,
    ]);
  }

  public function tables(): void {
    $q    = trim($_GET['q'] ?? '');
    $repo = new MetaRepository($this->metaDb());
    $this->json(['tables' => $repo->tables($q)]);
  }

  public function table(): void {
    $name = trim($_GET['name'] ?? '');
    if ($name === '') { $this->error(400, 'Missing ?name='); return; }

    $repo  = new MetaRepository($this->metaDb());
    $table = $repo->table($name);
    if (!$table) { $this->error(404, "Table not found: $name"); return; }

    $this->json([
      'table'       => $table,
      'columns'     => $repo->columns($name),
      'constraints' => $repo->constraints($name),
      'children'    => $repo->childTables($name),
      'parents'     => $repo->parentTables($name),
      'aliases'     => $repo->aliases($name),
    ]);
  }

  public function erdData(): void {
    $name = trim($_GET['name'] ?? '');
    if ($name === '') { $this->error(400, 'Missing ?name='); return; }

    $repo  = new MetaRepository($this->metaDb());
    $table = $repo->table($name);
    if (!$table) { $this->error(404, "Table not found: $name"); return; }

    $parents = $repo->parentTables($name);
    foreach ($parents as &$p) {
      $p['columns'] = $repo->columns($p['parent_table']);
    }
    unset($p);

    $children = $repo->childTables($name);
    foreach ($children as &$c) {
      $c['columns'] = $repo->columns($c['child_table']);
    }
    unset($c);

    $this->json([
      'table'       => $table,
      'columns'     => $repo->columns($name),
      'constraints' => $repo->constraints($name),
      'parents'     => $parents,
      'children'    => $children,
    ]);
  }

  public function loadOrder(): void {
    $repo   = new MetaRepository($this->metaDb());
    $graph  = new GraphService($repo);
    $this->json($graph->topoSort());
  }

  public function audit(): void {
    $target = $this->targetDb();
    if (!$target) {
      $this->json(['disabled' => true]);
      return;
    }
    $repo    = new MetaRepository($this->metaDb());
    $audit   = new AuditService($repo, $target);
    $this->json([
      'summary' => $audit->summary(),
      'missing' => $audit->missingTablesAndColumns(),
      'orphans' => $audit->orphanSummary(30),
    ]);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private function json(mixed $data): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }

  private function error(int $code, string $msg): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg]);
  }
}
