-- Migración y actualización de base de datos bd_club para Rines y Llantas GT Pro
USE bd_club;

-- 1. Actualizar tabla usuarios_clientes
ALTER TABLE usuarios_clientes 
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(200) NULL AFTER telefono,
  ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100) NULL AFTER direccion;

-- 2. Actualizar tabla productos con columna codigo (SKU)
ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) NULL AFTER id;

-- Actualizar códigos para los productos existentes
UPDATE productos SET codigo = 'GT-RIN-001' WHERE id = 1 AND (codigo IS NULL OR codigo = '');
UPDATE productos SET codigo = 'GT-RIN-002' WHERE id = 2 AND (codigo IS NULL OR codigo = '');
UPDATE productos SET codigo = 'GT-LLAN-001' WHERE id = 3 AND (codigo IS NULL OR codigo = '');
UPDATE productos SET codigo = 'GT-ACC-001' WHERE id = 4 AND (codigo IS NULL OR codigo = '');

-- Agregar productos de muestra adicionales si no existen
INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible)
SELECT * FROM (SELECT 'GT-RIN-003' AS codigo, 'Rin Forjado 21" — Dark Spider' AS nombre, 'rines' AS categoria, 1650000.00 AS precio, 'Rin forjado de alta resistencia en aleación de aluminio aeroespacial, acabado negro mate.' AS descripcion, 'imagenes/rin-spider.png' AS imagen, 8 AS stock, 1 AS disponible) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'GT-RIN-003') LIMIT 1;

INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible)
SELECT * FROM (SELECT 'GT-RIN-004' AS codigo, 'Rin Deportivo 19" — Hyper Silver' AS nombre, 'rines' AS categoria, 1350000.00 AS precio, 'Diseño multirradio deportivo acabado plateado brillante con corte diamante.' AS descripcion, 'imagenes/rin-silver.png' AS imagen, 12 AS stock, 1 AS disponible) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'GT-RIN-004') LIMIT 1;

INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible)
SELECT * FROM (SELECT 'GT-LLAN-002' AS codigo, 'Llanta Deportiva Ultra Grip 245/40R19' AS nombre, 'llantas' AS categoria, 580000.00 AS precio, 'Compuesto de sílice para máximo agarre en seco y mojado a altas velocidades.' AS descripcion, 'imagenes/llanta-sport.png' AS imagen, 16 AS stock, 1 AS disponible) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'GT-LLAN-002') LIMIT 1;

INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible)
SELECT * FROM (SELECT 'GT-ACC-002' AS codigo, 'Kit Calipers Rojos Sport Look (x4)' AS nombre, 'accesorios' AS categoria, 240000.00 AS precio, 'Cubiertas para mordazas de freno resistentes al calor estilo Brembo.' AS descripcion, 'imagenes/acc-calipers.png' AS imagen, 20 AS stock, 1 AS disponible) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'GT-ACC-002') LIMIT 1;

INSERT INTO productos (codigo, nombre, categoria, precio, descripcion, imagen, stock, disponible)
SELECT * FROM (SELECT 'GT-ACC-003' AS codigo, 'Pernos de Seguridad Cromados con Llave' AS nombre, 'accesorios' AS categoria, 95000.00 AS precio, 'Juego de 4 birlos antirrobo de acero forjado cromado.' AS descripcion, 'imagenes/acc-pernos.png' AS imagen, 30 AS stock, 1 AS disponible) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'GT-ACC-003') LIMIT 1;

-- 3. Actualizar tabla cotizaciones
ALTER TABLE cotizaciones 
  ADD COLUMN IF NOT EXISTS cliente_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL AFTER whatsapp,
  ADD COLUMN IF NOT EXISTS diseno_rin VARCHAR(200) NULL AFTER producto,
  ADD COLUMN IF NOT EXISTS imagen_generada LONGTEXT NULL AFTER diseno_rin,
  ADD COLUMN IF NOT EXISTS total DECIMAL(12,2) NULL AFTER imagen_generada;

-- 4. Actualizar tabla ventas
ALTER TABLE ventas 
  ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(50) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(150) NULL AFTER cliente_id,
  ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(50) NULL AFTER cliente_nombre,
  ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(50) NULL AFTER cliente_documento,
  ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(100) NULL AFTER cliente_telefono,
  ADD COLUMN IF NOT EXISTS cliente_direccion VARCHAR(200) NULL AFTER cliente_email,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER cliente_direccion,
  ADD COLUMN IF NOT EXISTS iva DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER subtotal,
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'Efectivo' AFTER total;

-- 5. Actualizar tabla detalle_ventas
ALTER TABLE detalle_ventas 
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) NULL AFTER producto_id,
  ADD COLUMN IF NOT EXISTS nombre_producto VARCHAR(200) NULL AFTER codigo,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER precio_unitario;

-- 6. Crear tabla de diseños guardados de IA por clientes
CREATE TABLE IF NOT EXISTS disenos_ia (
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
  KEY (cliente_id),
  CONSTRAINT fk_disenos_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios_clientes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. Asegurar un usuario cliente de prueba
INSERT INTO usuarios_clientes (nombre, email, clave, telefono, direccion, ciudad)
SELECT * FROM (SELECT 'Carlos Gómez' AS nombre, 'cliente@rinesgt.com' AS email, '123456' AS clave, '3104567890' AS telefono, 'Calle 15 # 12-45' AS direccion, 'Sogamoso' AS ciudad) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM usuarios_clientes WHERE email = 'cliente@rinesgt.com') LIMIT 1;
