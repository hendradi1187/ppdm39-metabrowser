<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\MetaRepository;
use App\Services\GraphService;

final class GraphController extends BaseController {
  public function loadOrder(): void {
    $repo = new MetaRepository($this->metaDb());
    $graph = new GraphService($repo);
    $result = $graph->topoSort();

    $this->render('load_order', [
      'order' => $result['order'],
      'levels' => $result['levels'],
      'cycles' => $result['cycles'],
      'edges' => $result['edges_count'],
      'nodes' => $result['nodes_count'],
    ]);
  }
}
