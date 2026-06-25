<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\MetaRepository;

final class HomeController extends BaseController {
  public function index(): void {
    $repo = new MetaRepository($this->metaDb());
    $stats = $repo->stats();
    $this->render('home', ['stats' => $stats]);
  }
}
