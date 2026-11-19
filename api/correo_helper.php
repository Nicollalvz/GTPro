<?php
// ==========================================================================
// RINES Y LLANTAS GT PRO — SISTEMA DE NOTIFICACIONES POR CORREO ELECTRÓNICO
// ==========================================================================

function enviarCorreoNotificacionPedido($conexion, $ventaId, $nuevoEstado, $guia = '', $comentarioAdmin = '') {
    // 1. Cargar datos completos de la venta
    $stmt = $conexion->prepare("SELECT * FROM ventas WHERE id = ?");
    $stmt->bind_param("i", $ventaId);
    $stmt->execute();
    $res = $stmt->get_result();

    if (!$res || $res->num_rows === 0) {
        return ["exito" => false, "mensaje" => "Pedido no encontrado."];
    }

    $venta = $res->fetch_assoc();

    // 2. Determinar correo destinatario
    $destinatario = !empty($venta['cliente_email']) ? trim($venta['cliente_email']) : '';
    if (empty($destinatario) && !empty($venta['cliente_id'])) {
        $resCli = $conexion->query("SELECT email FROM usuarios_clientes WHERE id = " . intval($venta['cliente_id']));
        if ($resCli && $cli = $resCli->fetch_assoc()) {
            $destinatario = trim($cli['email'] ?? '');
        }
    }

    if (empty($destinatario)) {
        $destinatario = 'cliente@rinesgt.com'; // Correo de respaldo si no fue ingresado
    }

    // 3. Cargar items del pedido
    $detRes = $conexion->query("SELECT nombre_producto, cantidad, precio_unitario, subtotal FROM detalle_ventas WHERE venta_id = " . intval($ventaId));
    $items = [];
    $itemsHtml = '';
    if ($detRes) {
        while ($it = $detRes->fetch_assoc()) {
            $items[] = $it;
            $itemsHtml .= "<li style='padding:4px 0;'><strong>" . intval($it['cantidad']) . "x</strong> " . htmlspecialchars($it['nombre_producto']) . " — <span style='color:#8C1F1F; font-weight:bold;'>$" . number_format(floatval($it['subtotal']), 0, ',', '.') . " COP</span></li>";
        }
    }
    if (empty($itemsHtml)) {
        $itemsHtml = "<li>Rines y Llantas deportivas GT Pro</li>";
    }

    $nombre = !empty($venta['cliente_nombre']) ? $venta['cliente_nombre'] : 'Estimado Cliente';
    $numFac = !empty($venta['numero_factura']) ? $venta['numero_factura'] : ('FAC-' . $venta['id']);
    $tipoEntrega = $venta['tipo_entrega'] ?? 'domicilio';
    $fechaRecogida = $venta['fecha_recogida'] ?? 'Pronto';
    $direccion = !empty($venta['cliente_direccion']) ? $venta['cliente_direccion'] : 'Sogamoso, Boyacá';
    $total = number_format(floatval($venta['total']), 0, ',', '.');

    // 4. Determinar Asunto, Mensaje y Encabezado según el estado y la modalidad
    $asunto = '';
    $tituloCaja = '';
    $mensajeCaja = '';
    $colorCaja = '#198754'; // Verde por defecto
    $bgCaja = '#e8f8f0';

    if ($nuevoEstado === 'Confirmado' || $nuevoEstado === 'Aceptada') {
        if ($tipoEntrega === 'recoger') {
            $asunto = "🚗 ¡Tu pedido $numFac ya se apartó en Rines GT Pro!";
            $tituloCaja = "¡TUS RINES/LLANTAS YA FUERON APARTADOS EN BODEGA!";
            $mensajeCaja = "Hola <strong>$nombre</strong>, el administrador de <strong>Rines & Llantas GT Pro</strong> ha aceptado tu pedido. Tus productos ya están <strong>apartados y reservados</strong> a tu nombre para que pases a recogerlos el día <strong>$fechaRecogida</strong> en nuestra sede principal.";
            $colorCaja = '#6f42c1';
            $bgCaja = '#f3e8ff';
        } else {
            $asunto = "✅ ¡Tu pedido $numFac ha sido aceptado! — Rines GT Pro";
            $tituloCaja = "¡PEDIDO ACEPTADO CON ÉXITO!";
            $mensajeCaja = "Hola <strong>$nombre</strong>, el administrador ha aceptado tu compra en línea. Tu pedido se encuentra en preparación para ser despachado a tu dirección: <strong>$direccion</strong>.";
            $colorCaja = '#0d6efd';
            $bgCaja = '#e7f1ff';
        }
    } elseif ($nuevoEstado === 'En camino' || $nuevoEstado === 'Enviada') {
        $asunto = "🚚 ¡Tu pedido $numFac va en camino! — Rines GT Pro";
        $guiaTxt = !empty($guia) ? $guia : 'En reparto local / Despacho nacional';
        $tituloCaja = "¡TU PEDIDO VA EN CAMINO A TU DIRECCIÓN!";
        $mensajeCaja = "Hola <strong>$nombre</strong>, tu pedido ya fue despachado desde nuestro centro de distribución y va en camino a <strong>$direccion</strong>.<br><br>📦 <strong>Número de Guía / Transporte:</strong> <span style='font-size:16px; font-weight:bold; color:#0d6efd;'>$guiaTxt</span>";
        $colorCaja = '#0dcaf0';
        $bgCaja = '#e0f7fa';
    } elseif ($nuevoEstado === 'Listo para recoger') {
        $asunto = "🏪 ¡Tus rines están listos para recoger en taller! — Rines GT Pro";
        $tituloCaja = "¡TUS PRODUCTOS ESTÁN LISTOS EN NUESTRO TALLER!";
        $mensajeCaja = "Hola <strong>$nombre</strong>, tus rines y llantas ya están preparados y listos en nuestro taller para que pases hoy o el día programado: <strong>$fechaRecogida</strong>. ¡Te esperamos para entrega y montaje!";
        $colorCaja = '#6f42c1';
        $bgCaja = '#f3e8ff';
    } elseif ($nuevoEstado === 'Entregado') {
        $asunto = "★ Pedido Entregado — ¡Gracias por tu compra en Rines GT Pro!";
        $tituloCaja = "¡PEDIDO ENTREGADO CON ÉXITO!";
        $mensajeCaja = "Hola <strong>$nombre</strong>, confirmamos que tu pedido <strong>$numFac</strong> ha sido entregado a satisfacción. ¡Gracias por confiar en Rines & Llantas GT Pro!";
        $colorCaja = '#198754';
        $bgCaja = '#d1e7dd';
    } else {
        $asunto = "📦 Actualización de tu pedido $numFac — Rines GT Pro";
        $tituloCaja = "ESTADO DE TU PEDIDO: " . strtoupper($nuevoEstado);
        $mensajeCaja = "Hola <strong>$nombre</strong>, te informamos que el estado de tu pedido ha sido actualizado a: <strong>$nuevoEstado</strong>.";
    }

    if (!empty($comentarioAdmin)) {
        $mensajeCaja .= "<br><br>💬 <strong>Nota del Administrador:</strong> <em>" . htmlspecialchars($comentarioAdmin) . "</em>";
    }

    // 5. Construir plantilla HTML profesional del correo
    $htmlEmail = "
    <!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <title>$asunto</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #222; }
            .contenedor { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 5px solid #8C1F1F; }
            .header { background: #121212; color: #ffffff; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff; }
            .header h1 span { color: #ff3333; }
            .sub-header { color: #bbb; font-size: 13px; margin-top: 5px; }
            .cuerpo { padding: 30px; }
            .alerta-estado { background: $bgCaja; border-left: 5px solid $colorCaja; padding: 18px 20px; border-radius: 8px; margin: 20px 0; }
            .alerta-estado h3 { margin: 0 0 8px 0; font-size: 17px; font-weight: 800; color: $colorCaja; }
            .alerta-estado p { margin: 0; font-size: 14px; line-height: 1.5; color: #222; }
            .tabla-info { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fafafa; border-radius: 8px; }
            .tabla-info td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #eee; }
            .footer { background: #f8f9fa; padding: 22px 30px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; }
            .btn-panel { display: inline-block; background: #8C1F1F; color: #ffffff !important; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class='contenedor'>
            <div class='header'>
                <h1>RINES & LLANTAS GT <span>PRO</span></h1>
                <div class='sub-header'>Notificación Oficial de Compra y Pedido en Línea</div>
            </div>
            <div class='cuerpo'>
                <p style='font-size: 16px; margin: 0 0 15px;'>Hola <strong>" . htmlspecialchars($nombre) . "</strong>,</p>
                
                <div class='alerta-estado'>
                    <h3>$tituloCaja</h3>
                    <p>$mensajeCaja</p>
                </div>

                <h4 style='font-size: 15px; margin: 20px 0 10px; color:#111;'>📋 Resumen del Pedido:</h4>
                <table class='tabla-info'>
                    <tr>
                        <td><strong>N° Factura:</strong></td>
                        <td><strong style='color:#8C1F1F; font-size:15px;'>" . htmlspecialchars($numFac) . "</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Modalidad:</strong></td>
                        <td>" . ($tipoEntrega === 'recoger' ? '🏪 <strong>Apartar y Recoger en Tienda</strong><br><small style=\"color:#8C1F1F;\">Fecha programada: ' . htmlspecialchars($fechaRecogida) . '</small>' : '🚚 <strong>Envío a Domicilio</strong><br><small>' . htmlspecialchars($direccion) . '</small>') . "</td>
                    </tr>
                    " . (!empty($guia) ? "<tr><td><strong>Guía de Despacho:</strong></td><td><strong style='color:#0d6efd; font-size:15px;'>" . htmlspecialchars($guia) . "</strong></td></tr>" : "") . "
                    <tr>
                        <td><strong>Total de la Orden:</strong></td>
                        <td><strong style='color:#198754; font-size:16px;'>$" . $total . " COP</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Sede del Taller:</strong></td>
                        <td>Carrera 11 # 18-30, Sogamoso, Boyacá — Tel: (608) 770 1234</td>
                    </tr>
                </table>

                <h4 style='font-size: 15px; margin: 20px 0 10px; color:#111;'>🛞 Productos Incluidos:</h4>
                <ul style='font-size: 14px; color:#444; padding-left: 20px;'>
                    $itemsHtml
                </ul>

                <div style='text-align: center; margin-top: 30px;'>
                    <a href='http://rines-gt-pro.test/panel-cliente.html' class='btn-panel'>
                        Ver Mi Panel y Rastrear Pedido en Tiempo Real
                    </a>
                </div>
            </div>
            <div class='footer'>
                <p style='margin: 0 0 5px;'><strong>Rines y Llantas GT Pro</strong> — Calidad, lujo y rendimiento para tu vehículo.</p>
                <p style='margin: 0;'>Carrera 11 # 18-30, Sogamoso, Boyacá | WhatsApp: +57 322 581 7510 | Email: soporte@rinesgt.com</p>
            </div>
        </div>
    </body>
    </html>";

    // 6. Enviar mediante función mail() de PHP (compatible con Laragon Mailer / MailHog y servidores en producción)
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Rines GT Pro <pedidos@rinesgt.com>\r\n";
    $headers .= "Reply-To: soporte@rinesgt.com\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    @mail($destinatario, $asunto, $htmlEmail, $headers);

    // 7. Guardar en historial_correos.json para trazabilidad y visualización en el Panel de Administrador
    $logFile = __DIR__ . '/historial_correos.json';
    $historial = file_exists($logFile) ? json_decode(file_get_contents($logFile), true) : [];
    if (!is_array($historial)) $historial = [];

    $nuevoRegistro = [
        "id" => uniqid('mail_'),
        "venta_id" => intval($ventaId),
        "numero_factura" => $numFac,
        "destinatario" => $destinatario,
        "cliente_nombre" => $nombre,
        "asunto" => $asunto,
        "nuevo_estado" => $nuevoEstado,
        "tipo_entrega" => $tipoEntrega,
        "fecha_envio" => date('Y-m-d H:i:s'),
        "resumen" => strip_tags(str_replace(['<br>', '<br/>'], "\n", $mensajeCaja)),
        "html" => $htmlEmail
    ];

    array_unshift($historial, $nuevoRegistro);
    if (count($historial) > 50) array_pop($historial);
    @file_put_contents($logFile, json_encode($historial, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return [
        "exito" => true,
        "enviado" => true,
        "destinatario" => $destinatario,
        "asunto" => $asunto,
        "nuevo_estado" => $nuevoEstado,
        "resumen" => strip_tags($mensajeCaja),
        "html" => $htmlEmail
    ];
}

function obtenerUltimoCorreoVenta($ventaId) {
    $logFile = __DIR__ . '/historial_correos.json';
    if (!file_exists($logFile)) return null;
    $historial = json_decode(file_get_contents($logFile), true);
    if (!is_array($historial)) return null;

    foreach ($historial as $correo) {
        if (intval($correo['venta_id']) === intval($ventaId)) {
            return $correo;
        }
    }
    return null;
}
?>
