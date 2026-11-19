<?php
session_start();
require 'config.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $usuario = trim($_POST['usuario']);
    $clave = trim($_POST['clave']);

    // Buscar administrador
    $sql = "SELECT * FROM usuarios_admin WHERE usuario = ? AND clave = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("ss", $usuario, $clave);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows === 1) {
        $admin = $resultado->fetch_assoc();
        $_SESSION['sesion_activa'] = true;
        $_SESSION['nombre'] = $admin['nombre_completo'];
        $_SESSION['tipo'] = 'admin';
        header("Location: admin.php");
        exit;
    }

    $error = "⚠️ Usuario o contraseña incorrectos";
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión — Rines y Llantas GT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/estilos.css">
    <style>
        .login-seccion { padding: 120px 0 60px; min-height: 100vh; background: #f9f9f9; }
        .login-caja { background: white; padding: 35px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 450px; margin: 0 auto; }
        .btn-primario { background: linear-gradient(135deg, #8C1F1F, #4A0F0F); color: white; border: none; padding: 12px; font-weight: 700; border-radius: 8px; width: 100%; }
        .mensaje-error { color: #dc3545; margin-top: 15px; font-weight: 600; text-align: center; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg fixed-top">
        <div class="container">
            <a class="navbar-brand" href="index.html"><span class="logo-texto">RINES Y LLANTAS GT</span></a>
        </div>
    </nav>

    <section class="login-seccion">
        <div class="login-caja">
            <h2 class="text-center mb-4" style="font-weight:900; color:#4A0F0F;">Iniciar Sesión</h2>
            
            <?php if (isset($error)) echo "<p class='mensaje-error'>$error</p>"; ?>
            
            <form method="POST" action="login.php">
                <div class="mb-3">
                    <label class="form-label">Usuario</label>
                    <input type="text" name="usuario" class="form-control" required placeholder="admin">
                </div>
                <div class="mb-4">
                    <label class="form-label">Contraseña</label>
                    <input type="password" name="clave" class="form-control" required placeholder="123456">
                </div>
                <button type="submit" class="btn-primario">Ingresar</button>
            </form>
        </div>
    </section>
</body>
</html>