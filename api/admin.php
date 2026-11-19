<?php
session_start();
if (!isset($_SESSION['sesion_activa']) || $_SESSION['tipo'] !== 'admin') {
    echo "<script>alert('🔒 Solo el administrador puede acceder a esta página'); window.location.href='login.php';</script>";
    exit;
}
require 'config.php';

// Leer productos
$prod = $conexion->query("SELECT * FROM productos");
$productos = [];
while ($fila = $prod->fetch_assoc()) $productos[] = $fila;

// Leer cotizaciones
$cot = $conexion->query("SELECT * FROM cotizaciones ORDER BY fecha DESC");
$cotizaciones = [];
while ($fila = $cot->fetch_assoc()) $cotizaciones[] = $fila;
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración — Rines y Llantas GT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/estilos.css">
    <style>
        body { background: #f5f5f5; min-height: 100vh; }
        .menu-lateral { position: fixed; left: 0; top: 0; width: 260px; height: 100vh; background: linear-gradient(180deg, #1A1A1A, #2c2c2c); padding: 0; z-index: 100; }
        .menu-titulo { padding: 25px 20px; color: white; font-weight: 900; font-size: 1.3rem; border-bottom: 1px solid #444; }
        .menu-opcion { display: block; padding: 15px 25px; color: #ccc; border-left: 4px solid transparent; cursor: pointer; }
        .menu-opcion:hover, .menu-opcion.activa { background: rgba(140,31,31,0.2); color: white; border-left-color: #8C1F1F; }
        .contenido-principal { margin-left: 260px; padding: 30px; }
        .seccion-panel { display: none; }
        .seccion-panel.visible { display: block; }
        .tarjeta-resumen { background: white; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 3px 15px rgba(0,0,0,0.08); }
        .numero-grande { font-size: 2.5rem; font-weight: 900; color: #8C1F1F; }
        .tabla-admin { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 3px 15px rgba(0,0,0,0.08); }
        .tabla-admin th, .tabla-admin td { padding: 14px 18px; text-align: left; border-bottom: 1px solid #eee; }
        .tabla-admin th { background: linear-gradient(135deg, #8C1F1F, #4A0F0F); color: white; font-weight: 700; }
        .cerrar-sesion { position: absolute; bottom: 20px; width: 100%; padding: 15px 25px; color: #ff6b6b; border-top: 1px solid #444; cursor: pointer; text-decoration: none; display: block; }
    </style>
</head>
<body>
    <div class="menu-lateral">
        <div class="menu-titulo">⚙️ PANEL GT</div>
        <nav>
            <div class="menu-opcion activa" data-seccion="inventario">📦 Inventario</div>
            <div class="menu-opcion" data-seccion="cotizaciones">📋 Cotizaciones</div>
        </nav>
        <a href="cerrar-sesion.php" class="cerrar-sesion">🚪 Cerrar Sesión</a>
    </div>

    <div class="contenido-principal">
        <!-- INVENTARIO -->
        <div id="inventario" class="seccion-panel visible">
            <h2 style="font-weight:900; color:#4A0F0F; margin-bottom:25px;">📦 Inventario General</h2>
            <div class="row g-4 mb-4">
                <div class="col-md-3"><div class="tarjeta-resumen"><h5>Total Productos</h5><p class="numero-grande"><?= count($productos) ?></p></div></div>
                <div class="col-md-3"><div class="tarjeta-resumen"><h5>Rines</h5><p class="numero-grande"><?= count(array_filter($productos, fn($p) => $p['categoria']==='rines')) ?></p></div></div>
                <div class="col-md-3"><div class="tarjeta-resumen"><h5>Llantas</h5><p class="numero-grande"><?= count(array_filter($productos, fn($p) => $p['categoria']==='llantas')) ?></p></div></div>
                <div class="col-md-3"><div class="tarjeta-resumen"><h5>Accesorios</h5><p class="numero-grande"><?= count(array_filter($productos, fn($p) => $p['categoria']==='accesorios')) ?></p></div></div>
            </div>
            <table class="tabla-admin">
                <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead>
                <tbody>
                <?php foreach ($productos as $p): ?>
                    <tr>
                        <td><?= htmlspecialchars($p['nombre']) ?></td>
                        <td style="text-transform:capitalize;"><?= $p['categoria'] ?></td>
                        <td style="font-weight:700; color:#8C1F1F;">$<?= number_format($p['precio'], 0, ',', '.') ?></td>
                        <td><?= $p['stock'] ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- COTIZACIONES -->
        <div id="cotizaciones" class="seccion-panel">
            <h2 style="font-weight:900; color:#4A0F0F; margin-bottom:25px;">📋 Cotizaciones Recibidas</h2>
            <?php if (empty($cotizaciones)): ?>
                <p style="color:#666;">No hay cotizaciones registradas</p>
            <?php else: ?>
                <?php foreach ($cotizaciones as $cot): ?>
                <div style="background:white; padding:18px; border-radius:10px; margin-bottom:12px; border-left:4px solid <?= $cot['estado']==='Pendiente' ? '#dc3545' : '#28a745' ?>;">
                    <h5 style="font-weight:700; margin:0 0 8px;"><?= htmlspecialchars($cot['nombre']) ?></h5>
                    <p style="margin:4px 0;">📞 <?= htmlspecialchars($cot['whatsapp']) ?></p>
                    <p style="margin:4px 0;">📦 <?= htmlspecialchars($cot['producto'] ?? 'Sin producto') ?></p>
                    <p style="margin:8px 0 0 0;">
                        Estado: <strong style="color:<?= $cot['estado']==='Pendiente' ? '#dc3545' : '#28a745' ?>"><?= $cot['estado'] ?></strong>
                    </p>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <script>
        document.querySelectorAll('.menu-opcion').forEach(op => {
            op.addEventListener('click', function() {
                document.querySelectorAll('.menu-opcion').forEach(o => o.classList.remove('activa'));
                this.classList.add('activa');
                const sec = this.getAttribute('data-seccion');
                document.querySelectorAll('.seccion-panel').forEach(s => s.classList.remove('visible'));
                document.getElementById(sec).classList.add('visible');
            });
        });
    </script>
</body>
</html>