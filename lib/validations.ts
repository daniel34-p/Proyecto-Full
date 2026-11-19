import { z } from 'zod';

export const productoSchema = z.object({
  proveedor: z.string().min(1, 'El proveedor es requerido'),
  referencia: z.string().min(1, 'La referencia es requerida'),
  producto: z.string().min(1, 'El nombre del producto es requerido'),
  // Cantidad en BUEN estado (conteo físico). El total que se guarda y se
  // suma al Gran Total es esto + cantidadDanada, calculado al enviar el
  // formulario (ver producto-form.tsx) - acá ya no se validan entre sí
  // porque son dos cantidades independientes, no una subdivisión.
  cantidad: z.string()
    .min(1, 'La cantidad es requerida')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'La cantidad en buen estado debe ser un número mayor o igual a 0'),
  // Cantidad en mal estado (conteo físico). Opcional, 0 por defecto - no
  // afecta a nadie que no lo use.
  cantidadDanada: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Debe ser un número mayor o igual a 0'),
  unidades: z.string().min(1, 'La unidad es requerida'),
  seccion: z.string().min(1, 'El departamento es requerido'),
  costo: z.string()
    .min(1, 'El costo es requerido')
    .regex(/^[HUBIERAMOShubieramos\s]+$/, 'El costo solo puede contener las letras: H, U, B, I, E, R, A, M, O, S'),
  precioVenta: z.string()
    .min(1, 'El precio de venta es requerido')
    .regex(/^\d+(\.\d+)?$/, 'El precio de venta solo puede contener números'),
  codigo: z.string()
    .min(1, 'El código es requerido')
    .regex(/^[0-9]+$/, 'El código solo puede contener números'),
  embalaje: z.string().optional(),
});

export type ProductoFormData = z.infer<typeof productoSchema>;