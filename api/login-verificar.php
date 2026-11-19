<?php
include "config.php";

// Recibir datos del formulario
$datos = json_decode(file_get_contents("php://input"), true);

$usuario = $datos["usuario"] ?? "";
$clave = $datos["clave"] ?? "";

// Buscar en la base de datos
$sql = "SELECT * FROM usuarios_admin WHERE usuario = ? AND clave = ?";
$stmt = $conexion->prepare($sql);
$stmt->bind_param("ss", $usuario, $clave);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows === 1) {
    $usuario_datos = $resultado->fetch_assoc();
    session_start();
    $_SESSION["admin_logueado"] = true;
    $_SESSION["admin_nombre"] = $usuario_datos["nombre_completo"];
    
    echo json_encode([
        "exito" => true,
        "mensaje" => "Bienvenido, " . $usuario_datos["nombre_completo"],
        // ✅ Agregamos esto para que tu admin.html lo reconozca
        "sesionLocalStorage" => [
            "clave" => "sesionActiva",
            "valor" => "true",
            "nombre" => "nombreCompleto",
            "valorNombre" => $usuario_datos["nombre_completo"]
        ]
    ]);
} else {
    echo json_encode([
        "exito" => false,
        "mensaje" => "Usuario o contraseña incorrectos"
    ]);
}

$stmt->close();
$conexion->close();
?>