<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Container;

abstract class BaseController {
  protected function render(string $view, array $vars = []): void {
    extract($vars);
    $config = Container::get('config');
    require __DIR__ . '/../Views/layout.php';
  }

  protected function metaDb() { return \App\Container::get('meta_db'); }
  protected function targetDb() { return \App\Container::get('target_db'); }
}
