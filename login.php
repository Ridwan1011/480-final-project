<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../app/db.php';

$input = json_decode(file_get_contents('php://input'), true);
$login = strtolower(trim($input['login'] ?? ''));
$password = $input['password'] ?? '';

if ($login === '' || $password === '') {
  http_response_code(400);
  echo json_encode(['error' => 'invalid_input']);
  exit;
}

// allow login via username OR email
$stmt = $mysqli->prepare("SELECT id, name, username, email, hash FROM users WHERE username=? OR email=? LIMIT 1");
$stmt->bind_param("ss", $login, $login);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
  http_response_code(401);
  echo json_encode(['error' => 'not_found']);
  exit;
}

$user = $res->fetch_assoc();
if (!password_verify($password, $user['hash'])) {
  http_response_code(401);
  echo json_encode(['error' => 'bad_credentials']);
  exit;
}

$_SESSION['user_id'] = (int)$user['id'];
echo json_encode(['ok'=>true, 'id'=>$user['id'], 'name'=>$user['name'], 'username'=>$user['username'], 'email'=>$user['email']]);
