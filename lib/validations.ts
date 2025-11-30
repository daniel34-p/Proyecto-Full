import { z } from 'zod';

export const productoSchema = z.object({
  proveedor: z.enum(['bodega', 'alea'], {
    required_error: 'Selecciona un proveedor',
  }),
  referencia: z.string().min(1, 'La referencia es requerida'),
  producto: z.string().min(1, 'El nombre del producto es requerido'),
  cantidad: z.string().min(1, 'La cantidad es requerida'),
  unidades: z.enum(['metros', 'yardas', 'gramos', 'unidad'], {
    required_error: 'Selecciona una unidad',
  }),
  costo: z.string()
    .min(1, 'El costo es requerido')
    .regex(/^[A-Za-z]+$/, 'El costo solo puede contener letras'),
  precioVenta: z.string().min(1, 'El precio de venta es requerido'),
  codigo: z.string().min(1, 'El código es requerido'), // Ya no es unique
});

export type ProductoFormData = z.infer<typeof productoSchema>;