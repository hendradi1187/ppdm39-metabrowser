<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\MetaRepository;
use App\Services\AuditService;

final class AuditController extends BaseController {
  public function index(): void {
    $target = $this->targetDb();
    if (!$target) {
      $this->render('audit_disabled', []);
      return;
    }

    $repo = new MetaRepository($this->metaDb());
    $audit = new AuditService($repo, $target);
    $summary = $audit->summary();
    $missing = $audit->missingTablesAndColumns();
    $orphans = $audit->orphanSummary(30); // cap checks to 30 FKs for speed

    $this->render('audit', [
      'summary' => $summary,
      'missing' => $missing,
      'orphans' => $orphans,
    ]);
  }
}
