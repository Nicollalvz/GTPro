<?php
// Configuración de base de datos para Rines GT Pro
$servidor = "localhost";
$usuario_db = "root";
$clave_db = "";

// Intentar primero con rines_gt (base de datos nativa del proyecto), fallback a bd_club
$base_datos = "rines_gt";
$conexion = @new mysqli($servidor, $usuario_db, $clave_db, "rines_gt");

if ($conexion->connect_error) {
    $base_datos = "bd_club";
    $conexion = new mysqli($servidor, $usuario_db, $clave_db, "bd_club");
}

if ($conexion->connect_error) {
    if (!headers_sent()) {
        header("Content-Type: application/json; charset=UTF-8");
    }
    echo json_encode(["exito" => false, "mensaje" => "❌ Error de conexión a la base de datos: " . $conexion->connect_error]);
    exit;
}

$conexion->set_charset("utf8mb4");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>
