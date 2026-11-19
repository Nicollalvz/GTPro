<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/correo_helper.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
    // 0. Ver último correo enviado para un pedido específico
    if (isset($_GET['accion']) && $_GET['accion'] === 'ver_correo') {
        $ventaId = intval($_GET['venta_id'] ?? $_GET['id'] ?? 0);
        $correo = obtenerUltimoCorreoVenta($ventaId);
        if ($correo) {
            echo json_encode(["exito" => true, "correo" => $correo]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Aún no se ha generado una notificación por correo para este pedido."]);
        }
        exit;
    }

    // 1. Obtener una factura específica con todo su detalle
    if (isset($_GET['id']) || isset($_GET['factura_id'])) {
        $id = intval($_GET['id'] ?? $_GET['factura_id']);
        $stmt = $conexion->prepare("SELECT * FROM ventas WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $venta = $res->fetch_assoc()) {
            $stmtDet = $conexion->prepare("SELECT d.*, p.imagen FROM detalle_ventas d LEFT JOIN productos p ON d.producto_id = p.id WHERE d.venta_id = ?");
            $stmtDet->bind_param("i", $id);
            $stmtDet->execute();
            $resDet = $stmtDet->get_result();
            $detalles = [];
            while ($row = $resDet->fetch_assoc()) {
                $detalles[] = $row;
            }
            $venta['detalles'] = $detalles;
            echo json_encode(["exito" => true, "factura" => $venta]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Factura no encontrada."]);
        }
        exit;
    }

    // 2. Obtener pedidos / ventas de un cliente específico
    if (isset($_GET['cliente_id']) || (isset($_SESSION['rol']) && $_SESSION['rol'] === 'cliente')) {
        $clienteId = intval($_GET['cliente_id'] ?? ($_SESSION['cliente_id'] ?? 0));
        if ($clienteId > 0) {
            $stmt = $conexion->prepare("SELECT * FROM ventas WHERE cliente_id = ? ORDER BY id DESC");
            $stmt->bind_param("i", $clienteId);
            $stmt->execute();
            $res = $stmt->get_result();
            $ventas = [];
            while ($row = $res->fetch_assoc()) {
                // Agregar items comprados resumidos
                $det = $conexion->query("SELECT nombre_producto, cantidad, precio_unitario, subtotal FROM detalle_ventas WHERE venta_id = " . intval($row['id']));
                $items = [];
                if ($det) {
                    while ($d = $det->fetch_assoc()) $items[] = $d;
                }
                $row['items'] = $items;
                $ventas[] = $row;
            }
            echo json_encode(["exito" => true, "ventas" => $ventas]);
            exit;
        }
    }

    // 3. Obtener listado de todas las ventas y pedidos (Panel de Administrador)
    $sql = "SELECT v.*, u.nombre AS nombre_cliente_reg 
            FROM ventas v 
            LEFT JOIN usuarios_clientes u ON v.cliente_id = u.id 
            ORDER BY v.id DESC";
    $res = $conexion->query($sql);
    $ventas = [];
    $totalIngresos = 0;
    $totalVentas = 0;
    $pedidosPendientes = 0;

    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $row['total'] = floatval($row['total']);
            $totalIngresos += $row['total'];
            $totalVentas++;
            if (($row['estado_pedido'] ?? 'Pendiente') === 'Pendiente') {
                $pedidosPendientes++;
            }

            // Cargar detalle de productos
            $detRes = $conexion->query("SELECT nombre_producto, cantidad, precio_unitario, subtotal FROM detalle_ventas WHERE venta_id = " . intval($row['id']));
            $items = [];
            if ($detRes) {
                while ($d = $detRes->fetch_assoc()) {
                    $items[] = $d;
                }
            }
            $row['items'] = $items;
            $ventas[] = $row;
        }
    }

    echo json_encode([
        "exito" => true,
        "resumen" => [
            "total_ventas" => $totalVentas,
            "total_ingresos" => $totalIngresos,
            "pedidos_pendientes" => $pedidosPendientes
        ],
        "ventas" => $ventas
    ]);
    exit;
}

if ($metodo === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

    // Acción para actualizar el estado del pedido por el Administrador
    if (isset($input['accion']) && ($input['accion'] === 'actualizar_estado' || $input['accion'] === 'cambiar_estado')) {
        $ventaId = intval($input['id'] ?? 0);
        $nuevoEstado = trim($input['estado_pedido'] ?? $input['estado'] ?? 'Confirmado');
        $guia = trim($input['guia_transporte'] ?? '');

        if ($ventaId <= 0) {
            echo json_encode(["exito" => false, "mensaje" => "ID de venta o pedido no especificado."]);
            exit;
        }

        if (!empty($guia)) {
            $stmtUp = $conexion->prepare("UPDATE ventas SET estado_pedido = ?, guia_transporte = ? WHERE id = ?");
            $stmtUp->bind_param("ssi", $nuevoEstado, $guia, $ventaId);
        } else {
            $stmtUp = $conexion->prepare("UPDATE ventas SET estado_pedido = ? WHERE id = ?");
            $stmtUp->bind_param("si", $nuevoEstado, $ventaId);
        }

        if ($stmtUp->execute()) {
            $comentario = trim($input['comentario'] ?? '');
            $resCorreo = enviarCorreoNotificacionPedido($conexion, $ventaId, $nuevoEstado, $guia, $comentario);

            $mensajeFeedback = "¡Pedido actualizado a $nuevoEstado!";
            if (!empty($resCorreo['enviado'])) {
                $mensajeFeedback .= " Se ha enviado un correo electrónico de notificación a " . $resCorreo['destinatario'] . ".";
            }

            echo json_encode([
                "exito" => true, 
                "mensaje" => $mensajeFeedback,
                "nuevo_estado" => $nuevoEstado,
                "correo" => $resCorreo
            ]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al actualizar pedido: " . $conexion->error]);
        }
        exit;
    }

    // Creación de nueva Venta / Pedido
    $origen = trim($input['origen'] ?? '');
    $clienteId = !empty($input['cliente_id']) ? intval($input['cliente_id']) : null;
    $clienteNombre = trim($input['cliente_nombre'] ?? 'Cliente Mostrador');
    $clienteDocumento = trim($input['cliente_documento'] ?? '222222222222');
    $clienteTelefono = trim($input['cliente_telefono'] ?? '');
    $clienteEmail = trim($input['cliente_email'] ?? '');
    $clienteDireccion = trim($input['cliente_direccion'] ?? 'Sogamoso');
    $metodoPago = trim($input['metodo_pago'] ?? 'Efectivo');
    $tipoEntrega = trim($input['tipo_entrega'] ?? 'domicilio'); // 'domicilio', 'recoger' o 'mostrador'
    $fechaRecogida = !empty($input['fecha_recogida']) ? trim($input['fecha_recogida']) : null;
    $notasEntrega = trim($input['notas_entrega'] ?? '');

    // Si la venta se genera desde el POS/Mostrador del Admin:
    // Queda directamente 'Completada' y NO se envían correos de despacho
    $esVentaAdminPOS = ($origen === 'admin' || $tipoEntrega === 'mostrador');
    if ($esVentaAdminPOS) {
        $tipoEntrega = 'mostrador';
        $estadoPedido = 'Completada';
    } else {
        // Compra en línea hecha por el cliente desde el carrito/panel
        $tipoEntrega = in_array($tipoEntrega, ['recoger', 'domicilio']) ? $tipoEntrega : 'domicilio';
        $estadoPedido = 'Pendiente'; // Inicia 'Pendiente' (En Proceso) para que el admin la apruebe
    }

    $items = $input['items'] ?? [];

    if (empty($items) || !is_array($items)) {
        echo json_encode(["exito" => false, "mensaje" => "La orden debe contener al menos un producto."]);
        exit;
    }

    // Iniciar transacción de base de datos para garantizar consistencia del inventario
    $conexion->begin_transaction();

    try {
        $subtotalTotal = 0;
        $itemsValidados = [];

        foreach ($items as $item) {
            $prodId = intval($item['producto_id'] ?? $item['id'] ?? 0);
            $cantidad = intval($item['cantidad'] ?? 1);

            if ($prodId <= 0 || $cantidad <= 0) {
                throw new Exception("Cantidad o producto inválido en la lista.");
            }

            // Bloquear fila del producto para lectura y actualización segura
            $stmtProd = $conexion->prepare("SELECT id, codigo, nombre, precio, stock, disponible FROM productos WHERE id = ? FOR UPDATE");
            $stmtProd->bind_param("i", $prodId);
            $stmtProd->execute();
            $resProd = $stmtProd->get_result();

            if (!$resProd || $resProd->num_rows === 0) {
                throw new Exception("El producto con ID $prodId no existe en el catálogo.");
            }

            $prod = $resProd->fetch_assoc();

            if (intval($prod['stock']) < $cantidad) {
                throw new Exception("Stock insuficiente para '{$prod['nombre']}'. Disponibles: {$prod['stock']}, Solicitados: $cantidad.");
            }

            $precioUnitario = floatval($prod['precio']);
            $itemSubtotal = $precioUnitario * $cantidad;
            $subtotalTotal += $itemSubtotal;

            $itemsValidados[] = [
                'producto_id' => $prod['id'],
                'codigo' => $prod['codigo'] ?? ('GT-' . str_pad($prod['id'], 3, '0', STR_PAD_LEFT)),
                'nombre' => $prod['nombre'],
                'cantidad' => $cantidad,
                'precio_unitario' => $precioUnitario,
                'subtotal' => $itemSubtotal,
                'nuevo_stock' => intval($prod['stock']) - $cantidad
            ];
        }

        // Calcular IVA (19%) y Total
        $ivaTotal = round($subtotalTotal * 0.19, 2);
        $totalFinal = round($subtotalTotal + $ivaTotal, 2);

        // Generar número de factura consecutivo
        $resConsecutivo = $conexion->query("SELECT MAX(id) as max_id FROM ventas");
        $rowConsecutivo = $resConsecutivo ? $resConsecutivo->fetch_assoc() : null;
        $siguienteId = ($rowConsecutivo['max_id'] ?? 0) + 1;
        $numeroFactura = 'FAC-2026-' . str_pad($siguienteId, 4, '0', STR_PAD_LEFT);

        // Insertar cabecera de venta con soporte para tipo_entrega, fecha_recogida y estado_pedido
        $stmtVenta = $conexion->prepare("INSERT INTO ventas 
            (numero_factura, cliente_id, cliente_nombre, cliente_documento, cliente_telefono, cliente_email, cliente_direccion, subtotal, iva, total, metodo_pago, estado_pago, tipo_entrega, fecha_recogida, estado_pedido, notas_entrega) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completado', ?, ?, ?, ?)");
        
        $stmtVenta->bind_param(
            "sisssssdddsssss",
            $numeroFactura,
            $clienteId,
            $clienteNombre,
            $clienteDocumento,
            $clienteTelefono,
            $clienteEmail,
            $clienteDireccion,
            $subtotalTotal,
            $ivaTotal,
            $totalFinal,
            $metodoPago,
            $tipoEntrega,
            $fechaRecogida,
            $estadoPedido,
            $notasEntrega
        );

        if (!$stmtVenta->execute()) {
            throw new Exception("Error al registrar la orden: " . $conexion->error);
        }

        $ventaId = $conexion->insert_id;

        // Insertar items en detalle_ventas y descontar inventario
        $stmtDetalle = $conexion->prepare("INSERT INTO detalle_ventas (venta_id, producto_id, codigo, nombre_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtDescontar = $conexion->prepare("UPDATE productos SET stock = ? WHERE id = ?");

        foreach ($itemsValidados as $itemVal) {
            $stmtDetalle->bind_param(
                "iissidd",
                $ventaId,
                $itemVal['producto_id'],
                $itemVal['codigo'],
                $itemVal['nombre'],
                $itemVal['cantidad'],
                $itemVal['precio_unitario'],
                $itemVal['subtotal']
            );
            if (!$stmtDetalle->execute()) {
                throw new Exception("Error al guardar detalle: " . $conexion->error);
            }

            // Descontar existencias
            $stmtDescontar->bind_param("ii", $itemVal['nuevo_stock'], $itemVal['producto_id']);
            if (!$stmtDescontar->execute()) {
                throw new Exception("Error al actualizar existencias del producto.");
            }
        }

        // Confirmar transacción
        $conexion->commit();

        // Enviar notificación por correo al cliente si es una compra en línea
        $resCorreoInicial = null;
        if (!$esVentaAdminPOS) {
            $resCorreoInicial = enviarCorreoNotificacionPedido($conexion, $ventaId, 'Pendiente', '', 'Tu orden en línea fue recibida exitosamente y está en proceso de revisión por nuestro equipo.');
        }

        $mensajeExito = "¡Venta de mostrador registrada con éxito!";
        if (!$esVentaAdminPOS) {
            $mensajeExito = ($tipoEntrega === 'recoger') 
                ? "¡Apartado realizado con éxito! Tu pedido quedó guardado para recoger en tienda el $fechaRecogida."
                : "¡Pedido y compra registrada con éxito! En breve el administrador confirmará tu despacho.";
        }

        echo json_encode([
            "exito" => true,
            "mensaje" => $mensajeExito,
            "venta_id" => $ventaId,
            "numero_factura" => $numeroFactura,
            "factura" => [
                "id" => $ventaId,
                "numero_factura" => $numeroFactura,
                "fecha" => date('Y-m-d H:i:s'),
                "cliente_nombre" => $clienteNombre,
                "cliente_documento" => $clienteDocumento,
                "cliente_telefono" => $clienteTelefono,
                "cliente_email" => $clienteEmail,
                "cliente_direccion" => $clienteDireccion,
                "tipo_entrega" => $tipoEntrega,
                "fecha_recogida" => $fechaRecogida,
                "estado_pedido" => $estadoPedido,
                "notas_entrega" => $notasEntrega,
                "subtotal" => $subtotalTotal,
                "iva" => $ivaTotal,
                "total" => $totalFinal,
                "metodo_pago" => $metodoPago,
                "detalles" => $itemsValidados
            ]
        ]);
    } catch (Exception $e) {
        $conexion->rollback();
        echo json_encode([
            "exito" => false,
            "mensaje" => $e->getMessage()
        ]);
    }
    exit;
}
