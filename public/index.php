<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

use App\Router;

$router = new Router();
require __DIR__ . '/../src/routes.php';

$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
