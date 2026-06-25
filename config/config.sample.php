<?php
/**
 * Copy file ini menjadi config.php lalu isi sesuai environment Anda.
 * Jangan commit config.php ke repo publik (berisi credential).
 */

return [
  'meta_db' => [
    'host' => '127.0.0.1',
    'port' => 5432,
    'dbname' => 'ppdm_meta',
    'user' => 'postgres',
    'pass' => 'postgres',
    'schema' => 'public', // biasanya public
    'system_id' => 'PPDM39', // SYSTEM_ID yang dipakai pada seed meta
  ],

  // optional: untuk audit DB PPDM39 real
  'target_db' => [
    'enabled' => false,
    'host' => '127.0.0.1',
    'port' => 5432,
    'dbname' => 'ppdm_target',
    'user' => 'postgres',
    'pass' => 'postgres',
    'schema' => 'public',
  ],
];
