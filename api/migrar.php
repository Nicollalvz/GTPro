<?php
require_once __DIR__ . '/config.php';

function columnExists($conexion, $table, $column) {
    $res = $conexion->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    return ($res && $res->num_rows > 0);
}

function addColumnIfNotExists($conexion, $table, $column, $definition) {
    if (!columnExists($conexion, $table, $column)) {
        $sql = "ALTER TABLE `$table` ADD COLUMN `$column` $definition";
        if ($conexion->query($sql)) {
            echo "Columna `$column` agregada a `$table`.\n";
        } else {
            echo "Error al agregar `$column` a `$table`: " . $conexion->error . "\n";
        }
    } else {
        echo "Columna `$column` ya existe en `$table`.\n";
    }
}

echo "=== MIGRACIÓN BD_CLUB ===\n";

// 1. usuarios_clientes
addColumnIfNotExists($conexion, 'usuarios_clientes', 'telefono', 'VARCHAR(30) NULL AFTER `email`');
addColumnIfNotExists($conexion, 'usuarios_clientes', 'direccion', 'VARCHAR(200) NULL AFTER `telefono`');
addColumnIfNotExists($conexion, 'usuarios_clientes', 'ciudad', 'VARCHAR(100) NULL AFTER `direccion`');
addColumnIfNotExists($conexion, 'usuarios_clientes', 'google_id', 'VARCHAR(100) NULL AFTER `ciudad`');
addColumnIfNotExists($conexion, 'usuarios_clientes', 'avatar', 'VARCHAR(255) NULL AFTER `google_id`');

// 2. productos
addColumnIfNotExists($conexion, 'productos', 'codigo', 'VARCHAR(50) NULL AFTER `id`');

// Asignar códigos a productos existentes
$conexion->query("UPDATE productos SET codigo = 'GT-RIN-001' WHERE id = 1 AND (codigo IS NULL OR codigo = '')");
$conexion->query("UPDATE productos SET codigo = 'GT-RIN-002' WHERE id = 2 AND (codigo IS NULL OR codigo = '')");
$conexion->query("UPDATE productos SET codigo = 'GT-LLAN-001' WHERE id = 3 AND (codigo IS NULL OR codigo = '')");
$conexion->query("UPDATE productos SET codigo = 'GT-ACC-001' WHERE id = 4 AND (codigo IS NULL OR codigo = '')");

// 3. cotizaciones
addColumnIfNotExists($conexion, 'cotizaciones', 'cliente_id', 'INT NULL AFTER `id`');
addColumnIfNotExists($conexion, 'cotizaciones', 'email', 'VARCHAR(100) NULL AFTER `whatsapp`');
addColumnIfNotExists($conexion, 'cotizaciones', 'diseno_rin', 'VARCHAR(200) NULL AFTER `producto`');
addColumnIfNotExists($conexion, 'cotizaciones', 'imagen_generada', 'LONGTEXT NULL AFTER `diseno_rin`');
addColumnIfNotExists($conexion, 'cotizaciones', 'total', 'DECIMAL(12,2) NULL AFTER `imagen_generada`');

// 4. ventas
addColumnIfNotExists($conexion, 'ventas', 'numero_factura', 'VARCHAR(50) NULL AFTER `id`');
addColumnIfNotExists($conexion, 'ventas', 'cliente_nombre', 'VARCHAR(150) NULL AFTER `cliente_id`');
addColumnIfNotExists($conexion, 'ventas', 'cliente_documento', 'VARCHAR(50) NULL AFTER `cliente_nombre`');
addColumnIfNotExists($conexion, 'ventas', 'cliente_telefono', 'VARCHAR(50) NULL AFTER `cliente_documento`');
addColumnIfNotExists($conexion, 'ventas', 'cliente_email', 'VARCHAR(100) NULL AFTER `cliente_telefono`');
addColumnIfNotExists($conexion, 'ventas', 'cliente_direccion', 'VARCHAR(200) NULL AFTER `cliente_email`');
addColumnIfNotExists($conexion, 'ventas', 'subtotal', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `cliente_direccion`');
addColumnIfNotExists($conexion, 'ventas', 'iva', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `subtotal`');
addColumnIfNotExists($conexion, 'ventas', 'metodo_pago', 'VARCHAR(50) DEFAULT "Efectivo" AFTER `total`');

// 5. detalle_ventas
addColumnIfNotExists($conexion, 'detalle_ventas', 'codigo', 'VARCHAR(50) NULL AFTER `producto_id`');
addColumnIfNotExists($conexion, 'detalle_ventas', 'nombre_producto', 'VARCHAR(200) NULL AFTER `codigo`');
addColumnIfNotExists($conexion, 'detalle_ventas', 'subtotal', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `precio_unitario`');

// 6. disenos_ia
$sqlDisenos = "CREATE TABLE IF NOT EXISTS disenos_ia (
  id INT NOT NULL AUTO_INCREMENT,
  cliente_id INT NOT NULL,
  nombre_rin VARCHAR(200) NOT NULL,
  imagen_vehiculo LONGTEXT NULL,
  imagen_resultado LONGTEXT NOT NULL,
  tamano_pulgadas INT DEFAULT 20,
  cotizado TINYINT(1) DEFAULT 0,
  cotizacion_id INT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
if ($conexion->query($sqlDisenos)) {
    echo "Tabla disenos_ia verificada / creada.\n";
} else {
    echo "Error tabla disenos_ia: " . $conexion->error . "\n";
}

// 7. Productos extra si no existen
$res = $conexion->query("SELECT COUNT(*) as c FROM productos");
$fila = $res->fetch_assoc();
if ($fila['c'] <= 6) {
    $nuevos = [
        ['GT-RIN-003', 'Rin Forjado 21" — Dark Spider', 'rines', 1650000.00, 'Rin forjado de alta resistencia en aleación aeroespacial, acabado negro satinado.', 'imagenes/rin-spider.png', 8, 1],
        ['GT-RIN-004', 'Rin Deportivo 19" — Hyper Silver', 'rines', 1350000.00, 'Diseño multirradio deportivo con terminación plateada brillante y corte diamante.', 'imagenes/rin-silver.png', 12, 1],
        ['GT-RIN-005', 'Rin Off-Road 17" — All-Terrain', 'rines', 1100000.00, 'Rin reforzado todoterreno especial para camionetas SUV y camperos 4x4.', 'imagenes/rin-terreno.png', 10, 1],
        ['GT-LLAN-001', 'Llanta Todo Terreno All-Terrain 4x4', 'llantas', 420000.00, 'Labrado agresivo para máxima tracción en barro, roca y carretera.', 'imagenes/llanta-terreno.png', 14, 1],
        ['GT-LLAN-002', 'Llanta Deportiva Ultra Grip 245/40R19', 'llantas', 580000.00, 'Compuesto de sílice para máxima adherencia en seco y mojado.', 'imagenes/llanta-sport.png', 16, 1],
        ['GT-ACC-002', 'Kit Calipers Rojos Sport Look (x4)', 'accesorios', 240000.00, 'Cubiertas para mordazas de freno resistentes a altas temperaturas.', 'imagenes/acc-calipers.png', 20, 1],
        ['GT-ACC-003', 'Pernos de Seguridad Cromados con Llave', 'accesorios', 95000.00, 'Juego de 4 birlos antirrobo de acero forjado cromado con llave codificada.', 'imagenes/acc-pernos.png', 30, 1]
    ];
    $stmt = $conexion->prepare("INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($nuevos as $n) {
        $check = $conexion->query("SELECT id FROM productos WHERE codigo = '{$n[0]}'");
        if (!$check || $check->num_rows === 0) {
            $stmt->bind_param("sssdsiii", $n[0], $n[1], $n[2], $n[3], $n[4], $n[5], $n[6], $n[7]);
            $stmt->execute();
        }
    }
    echo "Productos adicionales insertados con éxito.\n";
}

// 8. Crear cliente de prueba si no existe
$checkCliente = $conexion->query("SELECT id FROM usuarios_clientes WHERE email = 'cliente@rinesgt.com'");
if ($checkCliente->num_rows === 0) {
    $conexion->query("INSERT INTO usuarios_clientes (nombre, email, clave, telefono, direccion, ciudad) VALUES ('Carlos Gómez', 'cliente@rinesgt.com', '123456', '3104567890', 'Carrera 11 # 18-30', 'Sogamoso')");
    echo "Cliente de prueba creado: cliente@rinesgt.com / 123456\n";
}

// 9. Asegurar admin
$checkAdmin = $conexion->query("SELECT id FROM usuarios_admin WHERE usuario = 'admin'");
if ($checkAdmin->num_rows === 0) {
    $conexion->query("INSERT INTO usuarios_admin (usuario, clave, nombre_completo) VALUES ('admin', '123456', 'Administrador General GT')");
    echo "Admin creado: admin / 123456\n";
}

echo "=== MIGRACIÓN FINALIZADA CON ÉXITO ===\n";

// Actualizar nombres limpios e imágenes
$conexion->query('UPDATE productos SET nombre="Rin Deportivo 20\" — Modelo Titan", imagen="imagenes/rin-titan.png" WHERE id=1');
$conexion->query('UPDATE productos SET nombre="Rin Clásico 18\" — Estilo Elegante", imagen="imagenes/rin-clasico.png" WHERE id=2');
$conexion->query('UPDATE productos SET nombre="Llanta Todo Terreno — Calidad Premium", imagen="imagenes/llanta-terreno.png" WHERE id=3');
$conexion->query('UPDATE productos SET nombre="Luces LED — Kit Iluminación Premium", imagen="imagenes/luces-led.png" WHERE id=4');
$conexion->query('UPDATE productos SET imagen="imagenes/rin-spider.png" WHERE id=5');
$conexion->query('UPDATE productos SET imagen="imagenes/rin-silver.png" WHERE id=6');
$conexion->query('UPDATE productos SET imagen="imagenes/llanta-sport.png" WHERE id=7');
$conexion->query('UPDATE productos SET imagen="imagenes/acc-calipers.png" WHERE id=8');
$conexion->query('UPDATE productos SET imagen="imagenes/acc-pernos.png" WHERE id=9');
echo "Imagenes y titulos actualizados correctamente.\n";
