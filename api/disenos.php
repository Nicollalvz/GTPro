<?php
require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// GET: Obtener diseños del cliente autenticado
if ($metodo === 'GET') {
    $clienteId = intval($_GET['cliente_id'] ?? ($_SESSION['cliente_id'] ?? 0));

    if ($clienteId <= 0) {
        echo json_encode(["exito" => false, "mensaje" => "Debes iniciar sesión para consultar tus diseños.", "disenos" => []]);
        exit;
    }

    $stmt = $conexion->prepare("SELECT d.*, c.estado AS estado_cotizacion 
                                FROM disenos_ia d 
                                LEFT JOIN cotizaciones c ON d.cotizacion_id = c.id 
                                WHERE d.cliente_id = ? 
                                ORDER BY d.fecha DESC");
    $stmt->bind_param("i", $clienteId);
    $stmt->execute();
    $res = $stmt->get_result();

    $disenos = [];
    while ($row = $res->fetch_assoc()) {
        $disenos[] = $row;
    }

    echo json_encode(["exito" => true, "disenos" => $disenos]);
    exit;
}

// POST: Guardar nuevo diseño generado o enviar a cotizar
if ($metodo === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
    $accion = $input['accion'] ?? ($_GET['accion'] ?? 'guardar');

    $clienteId = !empty($input['cliente_id']) ? intval($input['cliente_id']) : ($_SESSION['cliente_id'] ?? null);

    // Si no hay sesión, intentar buscar por email si se proporcionó
    if (!$clienteId && !empty($input['email'])) {
        $emailBuscar = trim($input['email']);
        $resCli = $conexion->query("SELECT id FROM usuarios_clientes WHERE email = '" . $conexion->real_escape_string($emailBuscar) . "' LIMIT 1");
        if ($resCli && $rowCli = $resCli->fetch_assoc()) {
            $clienteId = intval($rowCli['id']);
        }
    }

    if ($accion === 'guardar' && !$clienteId) {
        echo json_encode(["exito" => false, "mensaje" => "Para guardar tu diseño en el panel personal debes iniciar sesión o crear una cuenta."]);
        exit;
    }

    if ($accion === 'guardar' || $accion === 'cotizar') {
        $nombreRin = trim($input['nombre_rin'] ?? 'Rin Deportivo');
        $imagenResultado = $input['imagen_resultado'] ?? '';
        $imagenVehiculo = $input['imagen_vehiculo'] ?? null;
        $tamanoPulgadas = intval($input['tamano_pulgadas'] ?? 20);
        $enviarCotizacion = ($accion === 'cotizar' || !empty($input['cotizar']));

        if (empty($imagenResultado)) {
            echo json_encode(["exito" => false, "mensaje" => "La imagen generada por IA es requerida."]);
            exit;
        }

        // Si la imagen viene en base64 muy pesada o podemos guardarla en disco
        if (strpos($imagenResultado, 'data:image') === 0) {
            $partes = explode(',', $imagenResultado);
            if (count($partes) === 2) {
                $decodificada = base64_decode($partes[1]);
                $nombreArchivo = 'diseno_ia_' . $clienteId . '_' . time() . '.png';
                $rutaDestino = __DIR__ . '/../imagenes/' . $nombreArchivo;
                if (file_put_contents($rutaDestino, $decodificada)) {
                    $imagenResultado = 'imagenes/' . $nombreArchivo;
                }
            }
        }

        $cotizadoVal = $enviarCotizacion ? 1 : 0;
        $disenoId = null;

        if ($clienteId) {
            $stmt = $conexion->prepare("INSERT INTO disenos_ia (cliente_id, nombre_rin, imagen_vehiculo, imagen_resultado, tamano_pulgadas, cotizado) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssii", $clienteId, $nombreRin, $imagenVehiculo, $imagenResultado, $tamanoPulgadas, $cotizadoVal);
            if ($stmt->execute()) {
                $disenoId = $conexion->insert_id;
            }
        }

        $cotizacionId = null;

        // Si se seleccionó cotizar inmediatamente
        if ($enviarCotizacion) {
            $clienteInfo = null;
            if ($clienteId) {
                $resInfo = $conexion->query("SELECT nombre, email, telefono FROM usuarios_clientes WHERE id = $clienteId");
                if ($resInfo) $clienteInfo = $resInfo->fetch_assoc();
            }

            $nombreCli = !empty($input['nombre']) ? trim($input['nombre']) : ($clienteInfo['nombre'] ?? 'Cliente');
            $telCli = !empty($input['whatsapp']) ? trim($input['whatsapp']) : ($clienteInfo['telefono'] ?? 'Sin teléfono');
            $emailCli = !empty($input['email']) ? trim($input['email']) : ($clienteInfo['email'] ?? '');
            $productoNombre = "Visualizador Virtual: $nombreRin ($tamanoPulgadas pulgadas)";
            $mensaje = !empty($input['mensaje']) ? trim($input['mensaje']) : "Montaje personalizado creado con el Visualizador Virtual en Rines GT Pro para mi vehículo.";

            $stmtCot = $conexion->prepare("INSERT INTO cotizaciones (cliente_id, nombre, whatsapp, email, producto, diseno_rin, imagen_generada, mensaje, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')");
            $stmtCot->bind_param("isssssss", $clienteId, $nombreCli, $telCli, $emailCli, $productoNombre, $nombreRin, $imagenResultado, $mensaje);
            if ($stmtCot->execute()) {
                $cotizacionId = $conexion->insert_id;
                if ($disenoId) {
                    $conexion->query("UPDATE disenos_ia SET cotizacion_id = $cotizacionId WHERE id = $disenoId");
                }
            }
        }

        echo json_encode([
            "exito" => true,
            "mensaje" => $enviarCotizacion ? "¡Diseño y cotización enviados al administrador exitosamente!" : "¡Diseño personalizado guardado en tu cuenta!",
            "diseno_id" => $disenoId,
            "cotizacion_id" => $cotizacionId,
            "imagen_url" => $imagenResultado
        ]);
        exit;
    }
}
