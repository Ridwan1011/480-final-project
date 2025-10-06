<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../app/db.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$username = strtolower(trim($input['username'] ?? ''));
$email = strtolower(trim($input['email'] ?? ''));
$password = $input['password'] ?? '';

if ($name === '' || $username === '' || $email === '' || strlen($password) < 6) {
  http_response_code(400);
  echo json_encode(['error' => 'invalid_input']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'invalid_email']);
  exit;
}

// Ensure unique username and email
$stmt = $mysqli->prepare("SELECT id, username, email FROM users WHERE username=? OR email=? LIMIT 1");
$stmt->bind_param("ss", $username, $email);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
  $row = $res->fetch_assoc();
  $conflict = ($row['username'] === $username) ? 'username_taken' : 'email_taken';
  http_response_code(409);
  echo json_encode(['error' => $conflict]);
  exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $mysqli->prepare("INSERT INTO users (name, username, email, hash) VALUES (?,?,?,?)");
$stmt->bind_param("ssss", $name, $username, $email, $hash);
$ok = $stmt->execute();

if (!$ok) {
  http_response_code(500);
  echo json_encode(['error' => 'insert_failed']);
  exit;
}

$user_id = $stmt->insert_id;
$_SESSION['user_id'] = $user_id;

echo json_encode(['ok' => true, 'id' => $user_id, 'username' => $username, 'email' => $email]);
