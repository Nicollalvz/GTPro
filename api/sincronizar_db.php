<?php
require_once __DIR__ . '/config.php';

// Conectar a MySQL sin seleccionar base de datos
$mysqli = new mysqli("localhost", "root", "");
if ($mysqli->connect_error) {
    die("Error MySQL: " . $mysqli->connect_error);
}

echo "=== SINCRONIZANDO rines_gt Y bd_club ===\n";

// Asegurar base de datos rines_gt
$mysqli->query("CREATE DATABASE IF NOT EXISTS rines_gt CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");

// Volcar todas las tablas y estructura de bd_club hacia rines_gt
$tablas = ['usuarios_admin', 'usuarios_clientes', 'productos', 'cotizaciones', 'ventas', 'detalle_ventas', 'disenos_ia'];

foreach ($tablas as $t) {
    // Si no existe en rines_gt, crearla a partir de bd_club
    $check = $mysqli->query("SHOW TABLES FROM rines_gt LIKE '$t'");
    if (!$check || $check->num_rows === 0) {
        $resCreate = $mysqli->query("SHOW CREATE TABLE bd_club.$t")->fetch_row();
        $createSql = $resCreate[1];
        // Quitar constraints fk conflictivas temporalmente
        $mysqli->query("USE rines_gt");
        $mysqli->query("SET FOREIGN_KEY_CHECKS=0");
        $mysqli->query($createSql);
        $mysqli->query("SET FOREIGN_KEY_CHECKS=1");
        echo "Tabla `$t` creada en rines_gt.\n";
    }

    // Copiar columnas que falten si ya existía
    $colsBdClub = $mysqli->query("SHOW COLUMNS FROM bd_club.$t");
    while ($col = $colsBdClub->fetch_assoc()) {
        $cName = $col['Field'];
        $cType = $col['Type'];
        $cNull = $col['Null'] === 'YES' ? 'NULL' : 'NOT NULL';
        $cDef = $col['Default'] !== null ? "DEFAULT '{$col['Default']}'" : ($col['Null'] === 'YES' ? 'DEFAULT NULL' : '');
        $cExtra = $col['Extra'];

        $checkCol = $mysqli->query("SHOW COLUMNS FROM rines_gt.$t LIKE '$cName'");
        if (!$checkCol || $checkCol->num_rows === 0) {
            $alter = "ALTER TABLE rines_gt.$t ADD COLUMN `$cName` $cType $cNull $cDef";
            $mysqli->query($alter);
            echo "Columna `$cName` agregada a rines_gt.$t.\n";
        }
    }
}

// Sincronizar estructura exacta de productos
$mysqli->query("SET FOREIGN_KEY_CHECKS=0");
$mysqli->query("DROP TABLE IF EXISTS rines_gt.productos");
$resCreate = $mysqli->query("SHOW CREATE TABLE bd_club.productos")->fetch_row();
$mysqli->query("USE rines_gt");
$mysqli->query($resCreate[1]);

// Copiar productos
$mysqli->query("INSERT INTO rines_gt.productos SELECT * FROM bd_club.productos");

// Sincronizar clientes
$mysqli->query("INSERT IGNORE INTO rines_gt.usuarios_clientes SELECT * FROM bd_club.usuarios_clientes");

// Sincronizar admin
$mysqli->query("INSERT IGNORE INTO rines_gt.usuarios_admin SELECT * FROM bd_club.usuarios_admin");

// Sincronizar ventas y cotizaciones
$mysqli->query("INSERT IGNORE INTO rines_gt.cotizaciones SELECT * FROM bd_club.cotizaciones");
$mysqli->query("INSERT IGNORE INTO rines_gt.ventas SELECT * FROM bd_club.ventas");
$mysqli->query("INSERT IGNORE INTO rines_gt.detalle_ventas SELECT * FROM bd_club.detalle_ventas");
$mysqli->query("INSERT IGNORE INTO rines_gt.disenos_ia SELECT * FROM bd_club.disenos_ia");
$mysqli->query("SET FOREIGN_KEY_CHECKS=1");

echo "=== SINCRONIZACIÓN EXITOSA: rines_gt TIENE TODAS LAS TABLAS Y DATOS ===\n";
