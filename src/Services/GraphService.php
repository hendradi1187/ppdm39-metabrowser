<?php
declare(strict_types=1);

namespace App\Services;

final class GraphService {
  public function __construct(private MetaRepository $repo) {}

  public function topoSort(): array {
    $tables = array_map(fn($r) => $r['table_name'], $this->repo->allTables());
    $edges = $this->repo->foreignKeyEdges();

    // adjacency: parent <- child edge child->parent
    $adj = [];
    $indeg = [];
    foreach ($tables as $t) { $adj[$t] = []; $indeg[$t] = 0; }

    foreach ($edges as $e) {
      $child = $e['child_table'];
      $parent = $e['parent_table'];
      if (!isset($adj[$child]) || !isset($adj[$parent])) continue;
      // we want graph from parent to children for Kahn
      $adj[$parent][] = $child;
      $indeg[$child] += 1;
    }

    $queue = [];
    foreach ($indeg as $t => $d) if ($d === 0) $queue[] = $t;

    $order = [];
    $levels = [];
    $levelIndex = 0;

    while (!empty($queue)) {
      $next = [];
      $levels[$levelIndex] = [];
      foreach ($queue as $node) {
        $order[] = $node;
        $levels[$levelIndex][] = $node;
        foreach ($adj[$node] as $child) {
          $indeg[$child] -= 1;
          if ($indeg[$child] === 0) $next[] = $child;
        }
      }
      $queue = $next;
      $levelIndex++;
    }

    // cycles: nodes left with indeg>0
    $cycles = [];
    foreach ($indeg as $t => $d) {
      if ($d > 0) $cycles[] = ['table' => $t, 'remaining_in_degree' => $d];
    }

    return [
      'order' => $order,
      'levels' => $levels,
      'cycles' => $cycles,
      'edges_count' => count($edges),
      'nodes_count' => count($tables),
    ];
  }
}
