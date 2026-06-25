<?php
/**
 * Konfigurasi koneksi database.
 * Jangan commit file ini ke repo publik.
 */

return [
  'meta_db' => [
    'host'      => '127.0.0.1',
    'port'      => 5432,
    'dbname'    => 'ppdm_meta',
    'user'      => 'postgres',
    'pass'      => 'postgres',
    'schema'    => 'public',
    'system_id' => 'PPDM39',
  ],

  'target_db' => [
    'enabled' => true,
    'host'    => '127.0.0.1',
    'port'    => 5432,
    'dbname'  => 'ppdm_meta',
    'user'    => 'postgres',
    'pass'    => 'postgres',
    'schema'  => 'public',
  ],
];
