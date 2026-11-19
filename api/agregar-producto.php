<?php
session_start();
if (!isset($_SESSION["admin_logueado"]) || $_SESSION["admin_logueado"] !== true) {
    http_response_code(403);
    echo json_encode(["exito" => false, "mensaje" => "No autorizado"]);
    exit;
}

include "config.php";

$nombre = $_POST["nombre"] ?? "";
$categoria = $_POST["categoria"] ?? "";
$precio = $_POST["precio"] ?? 0;
$descripcion = $_POST["descripcion"] ?? "";
$stock = $_POST["stock"] ?? 10; // Stock por defecto

if (empty($nombre) || empty($categoria) || empty($precio)) {
    echo json_encode(["exito" => false, "mensaje" => "Faltan datos obligatorios"]);
    exit;
}

$sql = "INSERT INTO productos (nombre, categoria, precio, descripcion, stock) VALUES (?, ?, ?, ?, ?)";
$stmt = $conexion->prepare($sql);
$stmt->bind_param("ssdsi", $nombre, $categoria, $precio, $descripcion, $stock);

if ($stmt->execute()) {
    echo json_encode(["exito" => true, "mensaje" => "Producto agregado correctamente"]);
} else {
    echo json_encode(["exito" => false, "mensaje" => "Error: " . $conexion->error]);
}

$stmt->close();
$conexion->close();
?>