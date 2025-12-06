import { z } from 'zod';

export const productoSchema = z.object({
  proveedor: z.string().min(1, 'El proveedor es requerido'),
  referencia: z.string().min(1, 'La referencia es requerida'),
  producto: z.string().min(1, 'El nombre del producto es requerido'),
  cantidad: z.string()
    .min(1, 'La cantidad es requerida')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'La cantidad debe ser un número positivo'),
  unidades: z.string().min(1, 'La unidad es requerida'),
  costo: z.string()
    .min(1, 'El costo es requerido')
    .regex(/^[HUBIERAMOShubieramos\s]+$/, 'El costo solo puede contener las letras: H, U, B, I, E, R, A, M, O, S'),
  precioVenta: z.string().min(1, 'El precio de venta es requerido'),
  codigo: z.string()
    .min(1, 'El código es requerido')
    .regex(/^[0-9]+$/, 'El código solo puede contener números'),
  embalaje: z.string().optional(),
});

export type ProductoFormData = z.infer<typeof productoSchema>;