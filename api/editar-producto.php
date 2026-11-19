<?php
session_start();
if (!isset($_SESSION["admin_logueado"]) || $_SESSION["admin_logueado"] !== true) {
    http_response_code(403);
    echo json_encode(["exito" => false, "mensaje" => "No autorizado"]);
    exit;
}

include "../config.php";

$id = $_POST["id"] ?? 0;
$nombre = $_POST["nombre"] ?? "";
$categoria = $_POST["categoria"] ?? "";
$precio = $_POST["precio"] ?? 0;
$descripcion = $_POST["descripcion"] ?? "";
$stock = $_POST["stock"] ?? 0;

if (!$id || empty($nombre)) {
    echo json_encode(["exito" => false, "mensaje" => "Faltan datos"]);
    exit;
}

$sql = "UPDATE productos SET nombre=?, categoria=?, precio=?, descripcion=?, stock=? WHERE id=?";
$stmt = $conexion->prepare($sql);
$stmt->bind_param("ssdsii", $nombre, $categoria, $precio, $descripcion, $stock, $id);

if ($stmt->execute()) {
    echo json_encode(["exito" => true, "mensaje" => "Producto actualizado"]);
} else {
    echo json_encode(["exito" => false, "mensaje" => "Error: " . $conexion->error]);
}

$stmt->close();
$conexion->close();
?>