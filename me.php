<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../app/db.php';

if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['auth'=>false]);
  exit;
}

$uid = (int)$_SESSION['user_id'];
$stmt = $mysqli->prepare("SELECT id, name, username, email, created_at FROM users WHERE id=? LIMIT 1");
$stmt->bind_param("i", $uid);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
  echo json_encode(['auth'=>true, 'user'=>$res->fetch_assoc()]);
} else {
  http_response_code(404);
  echo json_encode(['auth'=>false]);
}
