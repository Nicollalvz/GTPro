<?php
require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header("Content-Type: application/json; charset=UTF-8");
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
    $clienteId = intval($_GET['id'] ?? 0);

    if ($clienteId > 0) {
        // Detalle de un cliente específico con todo su historial
        $stmt = $conexion->prepare("SELECT id, nombre, email, telefono, direccion, ciudad, fecha_registro FROM usuarios_clientes WHERE id = ?");
        $stmt->bind_param("i", $clienteId);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $cliente = $res->fetch_assoc()) {
            // Compras realizadas
            $stmtVentas = $conexion->prepare("SELECT * FROM ventas WHERE cliente_id = ? ORDER BY fecha DESC");
            $stmtVentas->bind_param("i", $clienteId);
            $stmtVentas->execute();
            $resVentas = $stmtVentas->get_result();
            $ventas = [];
            while ($v = $resVentas->fetch_assoc()) {
                $det = $conexion->query("SELECT nombre_producto, cantidad, precio_unitario, subtotal FROM detalle_ventas WHERE venta_id = " . $v['id']);
                $items = [];
                while ($d = $det->fetch_assoc()) $items[] = $d;
                $v['items'] = $items;
                $ventas[] = $v;
            }
            $cliente['compras'] = $ventas;

            // Cotizaciones realizadas
            $stmtCot = $conexion->prepare("SELECT * FROM cotizaciones WHERE cliente_id = ? ORDER BY fecha DESC");
            $stmtCot->bind_param("i", $clienteId);
            $stmtCot->execute();
            $resCot = $stmtCot->get_result();
            $cotizaciones = [];
            while ($c = $resCot->fetch_assoc()) {
                $cotizaciones[] = $c;
            }
            $cliente['cotizaciones'] = $cotizaciones;

            // Diseños con IA generados
            $stmtDis = $conexion->prepare("SELECT * FROM disenos_ia WHERE cliente_id = ? ORDER BY fecha DESC");
            $stmtDis->bind_param("i", $clienteId);
            $stmtDis->execute();
            $resDis = $stmtDis->get_result();
            $disenos = [];
            while ($d = $resDis->fetch_assoc()) {
                $disenos[] = $d;
            }
            $cliente['disenos_ia'] = $disenos;

            echo json_encode(["exito" => true, "cliente" => $cliente]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Cliente no encontrado."]);
        }
        exit;
    }

    // Listar todos los clientes registrados para el administrador
    $sql = "SELECT c.id, c.nombre, c.email, c.telefono, c.direccion, c.ciudad, c.fecha_registro,
                   COUNT(DISTINCT v.id) AS total_compras,
                   COALESCE(SUM(v.total), 0) AS dinero_gastado,
                   COUNT(DISTINCT cot.id) AS total_cotizaciones
            FROM usuarios_clientes c
            LEFT JOIN ventas v ON c.id = v.cliente_id
            LEFT JOIN cotizaciones cot ON c.id = cot.cliente_id
            GROUP BY c.id
            ORDER BY c.fecha_registro DESC";

    $res = $conexion->query($sql);
    $clientes = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $row['total_compras'] = intval($row['total_compras']);
            $row['dinero_gastado'] = floatval($row['dinero_gastado']);
            $row['total_cotizaciones'] = intval($row['total_cotizaciones']);
            $clientes[] = $row;
        }
    }

    echo json_encode(["exito" => true, "clientes" => $clientes]);
    exit;
}

if ($metodo === 'DELETE' || (isset($_POST['accion']) && $_POST['accion'] === 'eliminar')) {
    $id = intval($_GET['id'] ?? ($_POST['id'] ?? 0));
    if ($id <= 0) {
        $input = json_decode(file_get_contents("php://input"), true);
        $id = intval($input['id'] ?? 0);
    }

    if ($id > 0) {
        // Verificar si tiene ventas
        $check = $conexion->query("SELECT COUNT(*) as c FROM ventas WHERE cliente_id = $id")->fetch_assoc();
        if ($check && $check['c'] > 0) {
            echo json_encode(["exito" => false, "mensaje" => "No se puede eliminar un cliente con historial de ventas registradas."]);
            exit;
        }

        $stmt = $conexion->prepare("DELETE FROM usuarios_clientes WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(["exito" => true, "mensaje" => "Cliente eliminado con éxito."]);
        } else {
            echo json_encode(["exito" => false, "mensaje" => "Error al eliminar: " . $conexion->error]);
        }
    } else {
        echo json_encode(["exito" => false, "mensaje" => "ID inválido."]);
    }
    exit;
}
