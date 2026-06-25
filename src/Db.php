<?php
declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

final class Db {
  private PDO $pdo;
  private string $schema;

  public function __construct(array $cfg) {
    $this->schema = $cfg['schema'] ?? 'public';
    $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $cfg['host'], (string)$cfg['port'], $cfg['dbname']);
    try {
      $this->pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]);
      // set search_path
      $this->pdo->exec("SET search_path TO " . $this->quoteIdent($this->schema) . ", public");
    } catch (PDOException $e) {
      http_response_code(500);
      echo "DB connection error: " . htmlspecialchars($e->getMessage());
      exit;
    }
  }

  public function query(string $sql, array $params = []): array {
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
  }

  public function queryOne(string $sql, array $params = []): ?array {
    $rows = $this->query($sql, $params);
    return $rows[0] ?? null;
  }

  public function scalar(string $sql, array $params = []): mixed {
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute($params);
    $val = $stmt->fetchColumn();
    return $val;
  }

  public function pdo(): PDO { return $this->pdo; }

  private function quoteIdent(string $ident): string {
    return '"' . str_replace('"', '""', $ident) . '"';
  }
}
