<?php
session_start();
if (!isset($_SESSION["admin_logueado"]) || $_SESSION["admin_logueado"] !== true) {
    http_response_code(403);
    echo json_encode(["exito" => false, "mensaje" => "No autorizado"]);
    exit;
}

include "../config.php";

$datos = json_decode(file_get_contents("php://input"), true);
$id = $datos["id"] ?? 0;

if (!$id) {
    echo json_encode(["exito" => false, "mensaje" => "ID no válido"]);
    exit;
}

$sql = "DELETE FROM productos WHERE id=?";
$stmt = $conexion->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["exito" => true, "mensaje" => "Producto eliminado"]);
} else {
    echo json_encode(["exito" => false, "mensaje" => "Error al eliminar"]);
}

$stmt->close();
$conexion->close();
?>