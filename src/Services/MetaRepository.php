<?php
declare(strict_types=1);

namespace App\Services;

use App\Db;

final class MetaRepository {
  public function __construct(private Db $db) {}

  public function stats(): array {
    return [
      'tables' => (int)$this->db->scalar("select count(*) from ppdm_table"),
      'columns' => (int)$this->db->scalar("select count(*) from ppdm_column"),
      'constraints' => (int)$this->db->scalar("select count(*) from ppdm_constraint"),
      'cons_columns' => (int)$this->db->scalar("select count(*) from ppdm_cons_column"),
      'domains' => (int)($this->db->scalar("select count(*) from ppdm_domain") ?? 0),
      'check_values' => (int)($this->db->scalar("select count(*) from ppdm_check_cons_value") ?? 0),
    ];
  }

  public function tables(string $q = ''): array {
    if ($q === '') {
      return $this->db->query("select table_name, table_comment from ppdm_table order by table_name");
    }
    return $this->db->query(
      "select table_name, table_comment
       from ppdm_table
       where table_name ilike :q or coalesce(table_comment,'') ilike :q
       order by table_name",
      [':q' => '%' . $q . '%']
    );
  }

  public function table(string $table): ?array {
    return $this->db->queryOne(
      "select table_name, table_comment from ppdm_table where table_name = :t",
      [':t' => $table]
    );
  }

  public function aliases(string $table): array {
    // PPDM_TABLE_ALIAS (dari SYN)
    return $this->db->query(
      "select table_alias, alias_type from ppdm_table_alias where table_name = :t order by table_alias",
      [':t' => $table]
    );
  }

  public function columns(string $table): array {
    return $this->db->query(
      "select column_name, data_type, column_length, decimal_scale, decimal_precision,
              null_allowed_ba_id, domain, column_comment
       from ppdm_column
       where table_name = :t
       order by column_name",
      [':t' => $table]
    );
  }

  public function constraints(string $table): array {
    // Kumpulkan constraint dengan kolomnya
    $cons = $this->db->query(
      "select c.constraint_name, c.constraint_type, c.constraint_text, c.ref_table_name
       from ppdm_constraint c
       where c.table_name = :t
       order by c.constraint_type, c.constraint_name",
      [':t' => $table]
    );
    $cols = $this->db->query(
      "select constraint_name, table_name, column_name, ref_table_name, ref_column_name, column_position
       from ppdm_cons_column
       where table_name = :t
       order by constraint_name, column_position",
      [':t' => $table]
    );

    $map = [];
    foreach ($cons as $c) {
      $key = $c['constraint_name'];
      $map[$key] = $c;
      $map[$key]['columns'] = [];
    }
    foreach ($cols as $cc) {
      $key = $cc['constraint_name'];
      if (!isset($map[$key])) continue;
      $map[$key]['columns'][] = $cc;
    }
    return array_values($map);
  }

  public function childTables(string $parentTable): array {
    // tabel yang memiliki FK ke parentTable
    return $this->db->query(
      "select distinct c.table_name as child_table, c.constraint_name
       from ppdm_constraint c
       where c.constraint_type = 'FOREIGN_KEY'
         and c.ref_table_name = :p
       order by c.table_name, c.constraint_name",
      [':p' => $parentTable]
    );
  }

  public function parentTables(string $childTable): array {
    return $this->db->query(
      "select distinct c.ref_table_name as parent_table, c.constraint_name
       from ppdm_constraint c
       where c.constraint_type = 'FOREIGN_KEY'
         and c.table_name = :c
       order by c.ref_table_name, c.constraint_name",
      [':c' => $childTable]
    );
  }

  public function foreignKeyEdges(): array {
    // edges: child -> parent
    return $this->db->query(
      "select table_name as child_table, ref_table_name as parent_table, constraint_name
       from ppdm_constraint
       where constraint_type = 'FOREIGN_KEY'
         and ref_table_name is not null"
    );
  }

  public function allTables(): array {
    return $this->db->query("select table_name from ppdm_table");
  }
}
