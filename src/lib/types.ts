import type { Version } from './config';

export interface CartItem {
  id: string;
  equipo: string;
  temporada: string;
  version: Version;
  talla: string;
  nombre?: string;
  dorsal?: string;
  url_imagen: string;
  precio_unitario: number;
}

export interface ShippingFormData {
  envio_nombre: string;
  envio_direccion: string;
  envio_pais: string;
  envio_estado_provincia: string;
  envio_ciudad: string;
  envio_codigo_postal: string;
  envio_telefono: string;
}

export interface PedidoInsert extends ShippingFormData {
  usa_codigo_descuento: boolean;
  es_comunitario: boolean;
  items_json: CartItem[];
  precio_total: number;
  estado: string;
}

