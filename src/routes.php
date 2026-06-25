<?php
use App\Container;
use App\Controllers\HomeController;
use App\Controllers\TableController;
use App\Controllers\GraphController;
use App\Controllers\AuditController;
use App\Controllers\ApiController;

$router->get('/', function() {
  (new HomeController())->index();
});

$router->get('/tables', function() {
  (new TableController())->list();
});

$router->get('/table', function() {
  (new TableController())->detail();
});

$router->get('/load-order', function() {
  (new GraphController())->loadOrder();
});

$router->get('/audit', function() {
  (new AuditController())->index();
});

// ── JSON API (consumed by React frontend) ────────────────────────────────
$router->get('/api/stats',      function() { (new ApiController())->stats();     });
$router->get('/api/tables',     function() { (new ApiController())->tables();    });
$router->get('/api/table',      function() { (new ApiController())->table();     });
$router->get('/api/erd-data',   function() { (new ApiController())->erdData();   });
$router->get('/api/load-order', function() { (new ApiController())->loadOrder(); });
$router->get('/api/audit',      function() { (new ApiController())->audit();     });
