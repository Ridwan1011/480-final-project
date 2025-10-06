<?php
$DB_HOST = 'sql304.infinityfree.com';
$DB_USER = 'if0_40035512';
$DB_PASS = 'fJHMFJWP1sl';
$DB_NAME = 'if0_40035512_nosh';

$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($mysqli->connect_errno) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error'=>'db_connect_failed']);
  exit;
}
$mysqli->set_charset('utf8mb4');
