<?php
require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$accion = $_GET['accion'] ?? $_POST['accion'] ?? '';

// GET: Consultar cotizaciones
if ($metodo === 'GET') {
    $clienteId = intval($_GET['cliente_id'] ?? ($_SESSION['cliente_id'] ?? 0));
    $soloCliente = isset($_GET['mis_cotizaciones']) || (isset($_SESSION['rol']) && $_SESSION['rol'] === 'cliente');

    if ($soloCliente && $clienteId > 0) {
        $stmt = $conexion->prepare("SELECT * FROM cotizaciones WHERE cliente_id = ? ORDER BY fecha DESC");
        $stmt->bind_param("i", $clienteId);
        $stmt->execute();
        $res = $stmt->get_result();
        $cotizaciones = [];
        while ($row = $res->fetch_assoc()) {
            $cotizaciones[] = $row;
        }
        echo json_encode(["exito" => true, "cotizaciones" => $cotizaciones]);
        exit;
    }

    // Para el panel del administrador: todas las cotizaciones con filtros
    $filtroEstado = $_GET['estado'] ?? '';
    if (!empty($filtroEstado) && $filtroEstado !== 'todas') {
        $stmt = $conexion->prepare("SELECT * FROM cotizaciones WHERE estado = ? ORDER BY fecha DESC");
        $stmt->bind_param("s", $filtroEstado);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conexion->query("SELECT * FROM cotizaciones ORDER BY fecha DESC");
    }

    $cotizaciones = [];
    while ($row = $res->fetch_assoc()) {
        $cotizaciones[] = $row;
    }
    echo json_encode(["exito" => true, "cotizaciones" => $cotizaciones]);
    exit;
}

// POST: Crear cotización o actualizar estado
if ($metodo === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

    if ($accion === 'actualizar_estado' || (isset($input['accion']) && $input['accion'] === 'actualizar_estado')) {
        $id = intval($input['id'] ?? 0);
        $nuevoEstado = trim($input['estado'] ?? 'Atendido');

        if ($id <= 0) {
            echo json_encode(["exito" => false, "mensaje" => "ID de cotización inválido."]);
            exit;
        }

        $stmt = $conexion->prepare("UPDATE cotizaciones SET estado = ? WHERE id = ?");
        $stmt->bind_param("si", $nuevoEstado, $id);
        if ($stmt->execute()) {
            echo json_encode(["exito" => true, "mensaje" => "Estado de cotización actualizado a '$nuevoEstado'."]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al actualizar estado: " . $conexion->error]);
        }
        exit;
    }

    // Registrar nueva cotización
    $clienteId = !empty($input['cliente_id']) ? intval($input['cliente_id']) : ($_SESSION['cliente_id'] ?? null);
    $nombre = trim($input['nombre'] ?? ($_SESSION['nombre'] ?? ''));
    $whatsapp = trim($input['whatsapp'] ?? ($input['telefono'] ?? ''));
    $email = trim($input['email'] ?? ($_SESSION['email'] ?? ''));
    $producto = trim($input['producto'] ?? 'Cotización General');
    $disenoRin = trim($input['diseno_rin'] ?? '');
    $imagenGenerada = $input['imagen_generada'] ?? null;
    $mensaje = trim($input['mensaje'] ?? '');
    $total = !empty($input['total']) ? floatval($input['total']) : null;

    if (empty($nombre) || empty($whatsapp)) {
        echo json_encode(["exito" => false, "mensaje" => "Nombre y número de contacto/WhatsApp son requeridos."]);
        exit;
    }

    $stmt = $conexion->prepare("INSERT INTO cotizaciones (cliente_id, nombre, whatsapp, email, producto, diseno_rin, imagen_generada, mensaje, total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')");
    $stmt->bind_param("isssssssd", $clienteId, $nombre, $whatsapp, $email, $producto, $disenoRin, $imagenGenerada, $mensaje, $total);

    if ($stmt->execute()) {
        $cotizacionId = $conexion->insert_id;

        // Si venía de un diseño generado por IA, marcarlo como cotizado en disenos_ia si aplica
        if (!empty($input['diseno_id']) && $clienteId) {
            $disenoId = intval($input['diseno_id']);
            $conexion->query("UPDATE disenos_ia SET cotizado = 1, cotizacion_id = $cotizacionId WHERE id = $disenoId AND cliente_id = $clienteId");
        }

        echo json_encode([
            "exito" => true,
            "mensaje" => "¡Cotización enviada con éxito! El administrador la revisará a la brevedad.",
            "cotizacion_id" => $cotizacionId
        ]);
    } else {
        echo json_encode(["exito" => false, "mensaje" => "Error al guardar cotización: " . $conexion->error]);
    }
    exit;
}
