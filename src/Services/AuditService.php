<?php
declare(strict_types=1);

namespace App\Services;

use App\Db;

final class AuditService {
  public function __construct(private MetaRepository $repo, private Db $targetDb) {}

  public function summary(): array {
    $meta = $this->repo->stats();
    $targetTables = (int)$this->targetDb->scalar(
      "select count(*) from information_schema.tables where table_schema = :s and table_type='BASE TABLE'",
      [':s' => $this->targetSchema()]
    );
    return [
      'meta' => $meta,
      'target_tables' => $targetTables,
      'target_schema' => $this->targetSchema(),
    ];
  }

  public function missingTablesAndColumns(): array {
    $schema = $this->targetSchema();

    $metaTables = array_map(fn($r) => $r['table_name'], $this->repo->tables('')); // all
    $targetTables = $this->targetDb->query(
      "select table_name from information_schema.tables where table_schema = :s and table_type='BASE TABLE'",
      [':s' => $schema]
    );
    $targetSet = [];
    foreach ($targetTables as $r) $targetSet[$r['table_name']] = true;

    $missingTables = [];
    foreach ($metaTables as $t) if (!isset($targetSet[strtolower($t)]) && !isset($targetSet[$t])) $missingTables[] = $t;

    // Missing columns for tables that exist (limit for speed)
    $missingColumns = [];
    $checkTables = array_slice(array_diff($metaTables, $missingTables), 0, 200);

    foreach ($checkTables as $t) {
      $metaCols = $this->targetNormalizeCols($this->repo->columns($t), 'column_name');
      $tcols = $this->targetDb->query(
        "select column_name from information_schema.columns where table_schema=:s and table_name=:t",
        [':s'=>$schema, ':t'=> $t]
      );
      $targetCols = [];
      foreach ($tcols as $c) $targetCols[strtolower($c['column_name'])] = true;

      foreach ($metaCols as $colLower => $orig) {
        if (!isset($targetCols[$colLower])) {
          $missingColumns[] = ['table' => $t, 'column' => $orig];
        }
      }
    }

    return [
      'missing_tables' => $missingTables,
      'missing_columns' => $missingColumns,
      'checked_tables_for_columns' => count($checkTables),
    ];
  }

  public function orphanSummary(int $maxFks = 30): array {
    // Jalankan orphan check pada sebagian FK dulu (biar cepat). Bisa dinaikkan nanti.
    $edges = $this->repo->foreignKeyEdges();
    $edges = array_slice($edges, 0, $maxFks);

    $out = [];
    foreach ($edges as $e) {
      $child = $e['child_table'];
      $parent = $e['parent_table'];
      $fk = $e['constraint_name'];

      // Ambil pasangan kolom child-parent dari meta
      $pairs = $this->repoFkPairs($child, $fk);
      if (count($pairs) === 0) continue;

      // Bangun join condition & null filter
      $joinParts = [];
      $nullParts = [];
      foreach ($pairs as $p) {
        $cc = $this->qi($p['column_name']);
        $pc = $this->qi($p['ref_column_name']);
        $joinParts[] = "c.$cc = p.$pc";
        $nullParts[] = "c.$cc is not null";
      }
      $join = implode(' and ', $joinParts);
      $notnull = implode(' and ', $nullParts);

      $sql = "select count(*) as orphan_count
              from {$this->qi($child)} c
              left join {$this->qi($parent)} p on $join
              where $notnull and p." . $this->qi($pairs[0]['ref_column_name']) . " is null";

      try {
        $cnt = (int)$this->targetDb->scalar($sql);
        $out[] = [
          'fk' => $fk,
          'child' => $child,
          'parent' => $parent,
          'pairs' => $pairs,
          'orphan_count' => $cnt,
        ];
      } catch (\Throwable $ex) {
        $out[] = [
          'fk' => $fk,
          'child' => $child,
          'parent' => $parent,
          'pairs' => $pairs,
          'error' => $ex->getMessage(),
        ];
      }
    }
    return $out;
  }

  private function repoFkPairs(string $child, string $constraintName): array {
    // PPDM_CONS_COLUMN menyimpan mapping ref column (untuk FK)
    // Kita query langsung dari meta DB lewat repo->db? (repo tidak expose). Jadi fallback:
    // trick: pakai reflection? tidak. Lebih sederhana: query via targetDb? tidak.
    // SOLUSI: MetaRepository belum punya method, jadi di AuditService kita bangun query manual melalui meta_db:
    $metaDb = \App\Container::get('meta_db');
    return $metaDb->query(
      "select column_name, ref_column_name, column_position
       from ppdm_cons_column
       where table_name=:t and constraint_name=:c
       order by column_position",
      [':t'=>$child, ':c'=>$constraintName]
    );
  }

  private function targetSchema(): string {
    $cfg = \App\Container::get('config');
    return $cfg['target_db']['schema'] ?? 'public';
  }

  private function qi(string $ident): string {
    return '"' . str_replace('"','""',$ident) . '"';
  }

  private function targetNormalizeCols(array $rows, string $key): array {
    $out = [];
    foreach ($rows as $r) {
      $out[strtolower($r[$key])] = $r[$key];
    }
    return $out;
  }
}
