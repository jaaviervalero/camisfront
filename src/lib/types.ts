import type { Version } from './config';

export interface CartItem {
  id: string;
  descripcion?: string;
  version: Version;
  talla: string;
  nombre?: string;
  dorsal?: string;
  url_imagen: string;
  precio_unitario: number;
}

// Los campos de envío son opcionales: los pedidos comunitarios
// no necesitan dirección (van a casa del vendedor)
export interface ShippingFormData {
  envio_nombre: string;
  envio_email: string;
  envio_telefono: string;
  envio_direccion?: string;
  envio_pais?: string;
  envio_estado_provincia?: string;
  envio_ciudad?: string;
  envio_codigo_postal?: string;
}

export interface PedidoInsert extends ShippingFormData {
  es_comunitario: boolean;
  items_json: CartItem[];
  precio_total: number;
  estado: string;
}
