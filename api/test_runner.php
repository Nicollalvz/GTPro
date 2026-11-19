<?php
$phpBin = 'C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe';

function ejecutarEndpoint($queryString, $metodo = 'GET', $body = null) {
    global $phpBin;
    $script = "
        \$_SERVER['REQUEST_METHOD'] = '$metodo';
        parse_str('$queryString', \$_GET);
    ";
    if ($body !== null) {
        $encoded = addslashes(json_encode($body));
        $script .= "
            \$GLOBALS['mock_input'] = '$encoded';
            file_put_contents('php://memory', \$GLOBALS['mock_input']);
        ";
    }
    // Ejecutar vía php -r
}

echo "=== VERIFICACIÓN DE ENDPOINTS API DIRECTA ===\n";

// 1. Catálogo público
$out1 = shell_exec("\"$phpBin\" -r \"\$_SERVER['REQUEST_METHOD']='GET'; \$_GET['public']='1'; include 'api/productos.php';\"");
$j1 = json_decode($out1, true);
echo "1. Productos Públicos: " . (is_array($j1) && count($j1) > 0 ? "OK (" . count($j1) . " productos)" : "FALLÓ") . "\n";
if (is_array($j1) && count($j1) > 0) {
    echo "   Primer producto: " . $j1[0]['nombre'] . " | Estado: " . $j1[0]['estado'] . " | Disponible: " . ($j1[0]['disponible'] ? "SI" : "NO") . "\n";
    echo "   Stock numérico oculto: " . (!isset($j1[0]['stock']) ? "SI (Correcto)" : "NO") . "\n";
}

// 2. Búsqueda por código para POS
$out2 = shell_exec("\"$phpBin\" -r \"\$_SERVER['REQUEST_METHOD']='GET'; \$_GET['codigo']='GT-RIN-001'; include 'api/productos.php';\"");
$j2 = json_decode($out2, true);
echo "2. Búsqueda por SKU (GT-RIN-001): " . (!empty($j2['exito']) ? "OK (" . $j2['producto']['nombre'] . ")" : "FALLÓ") . "\n";

// 3. Listado de clientes para Admin
$out3 = shell_exec("\"$phpBin\" -r \"\$_SERVER['REQUEST_METHOD']='GET'; include 'api/clientes.php';\"");
$j3 = json_decode($out3, true);
echo "3. Clientes Registrados: " . (!empty($j3['exito']) ? "OK (" . count($j3['clientes']) . " clientes)" : "FALLÓ") . "\n";

// 4. Listado de cotizaciones
$out4 = shell_exec("\"$phpBin\" -r \"\$_SERVER['REQUEST_METHOD']='GET'; include 'api/cotizaciones.php';\"");
$j4 = json_decode($out4, true);
echo "4. Cotizaciones: " . (!empty($j4['exito']) ? "OK (" . count($j4['cotizaciones']) . " cotizaciones)" : "FALLÓ") . "\n";

// 5. Historial de ventas
$out5 = shell_exec("\"$phpBin\" -r \"\$_SERVER['REQUEST_METHOD']='GET'; include 'api/ventas.php';\"");
$j5 = json_decode($out5, true);
echo "5. Historial de Ventas / Facturas: " . (!empty($j5['exito']) ? "OK (" . count($j5['ventas']) . " ventas, Total: $" . number_format($j5['resumen']['total_ingresos'], 0, ',', '.') . ")" : "FALLÓ") . "\n";

echo "=== TODAS LAS VERIFICACIONES COMPLETADAS ===\n";
