<?php
declare(strict_types=1);

spl_autoload_register(function ($class) {
  $prefix = 'App\\';
  $baseDir = __DIR__ . '/';
  if (strncmp($prefix, $class, strlen($prefix)) !== 0) return;
  $relative = substr($class, strlen($prefix));
  $file = $baseDir . str_replace('\\', '/', $relative) . '.php';
  if (file_exists($file)) require $file;
});

$configFile = __DIR__ . '/../config/config.php';
if (!file_exists($configFile)) {
  http_response_code(500);
  echo "Missing config/config.php. Copy config/config.sample.php to config.php and edit.";
  exit;
}
$config = require $configFile;

App\Container::set('config', $config);

// DB connections
$meta = new App\Db($config['meta_db']);
App\Container::set('meta_db', $meta);

$target = null;
if (!empty($config['target_db']['enabled'])) {
  $target = new App\Db($config['target_db']);
}
App\Container::set('target_db', $target);
