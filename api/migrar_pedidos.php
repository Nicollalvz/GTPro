<?php
require_once __DIR__ . '/config.php';

echo "Conectado a la base de datos: $base_datos\n";

function agregarColumnaSiNoExiste($conexion, $tabla, $columna, $definicion) {
    $res = $conexion->query("SHOW COLUMNS FROM `$tabla` LIKE '$columna'");
    if ($res && $res->num_rows > 0) {
        echo "Columna '$columna' ya existe en '$tabla'.\n";
    } else {
        $sql = "ALTER TABLE `$tabla` ADD COLUMN `$columna` $definicion";
        if ($conexion->query($sql)) {
            echo "OK: Creada columna '$columna' en '$tabla'.\n";
        } else {
            echo "Error creando '$columna': " . $conexion->error . "\n";
        }
    }
}

agregarColumnaSiNoExiste($conexion, 'ventas', 'tipo_entrega', "VARCHAR(50) DEFAULT 'domicilio'");
agregarColumnaSiNoExiste($conexion, 'ventas', 'fecha_recogida', "VARCHAR(50) NULL");
agregarColumnaSiNoExiste($conexion, 'ventas', 'estado_pedido', "VARCHAR(50) DEFAULT 'Pendiente'");
agregarColumnaSiNoExiste($conexion, 'ventas', 'notas_entrega', "TEXT NULL");
agregarColumnaSiNoExiste($conexion, 'ventas', 'guia_transporte', "VARCHAR(100) NULL");

// Describir estructura de ventas
echo "\nEstructura actual de tabla ventas:\n";
$res = $conexion->query("DESCRIBE ventas");
while ($row = $res->fetch_assoc()) {
    echo "- " . $row['Field'] . " : " . $row['Type'] . " (Default: " . var_export($row['Default'], true) . ")\n";
}

echo "\nMigración completada con éxito.\n";
?>
