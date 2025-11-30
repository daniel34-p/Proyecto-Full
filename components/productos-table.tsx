'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { formatearCostoReal } from '@/lib/encryption';
import { BarcodeDisplay } from '@/components/barcode-display';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Printer, Trash2 } from 'lucide-react';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  createdAt: string;
}

interface ProductosTableProps {
  productos: Producto[];
  onDelete: (id: string) => void;
  onEdit: (producto: Producto) => void;
}

export function ProductosTable({ productos, onDelete, onEdit }: ProductosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAuth();
  const [barcodeModal, setBarcodeModal] = useState<{
    isOpen: boolean;
    codigo: string;
    producto: string;
  }>({
    isOpen: false,
    codigo: '',
    producto: '',
  });

  // Validar que productos sea un array
  if (!Array.isArray(productos)) {
    productos = [];
  }

  // Filtrar productos según el término de búsqueda
  const filteredProductos = productos.filter((producto) => {
    const search = searchTerm.toLowerCase();
    return (
      producto.codigo.toLowerCase().includes(search) ||
      producto.producto.toLowerCase().includes(search) ||
      producto.referencia.toLowerCase().includes(search) ||
      producto.proveedor.toLowerCase().includes(search)
    );
  });

  if (productos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            No hay productos registrados. Agrega uno usando el formulario.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Lista de Productos ({filteredProductos.length})</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por código, nombre, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProductos.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No se encontraron productos con &quot;{searchTerm}&quot;
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Código de Barras</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Costo</TableHead>
                {isAdmin && (
                  <TableHead className="bg-blue-50 text-blue-700 font-semibold">
                    Costo Real
                  </TableHead>
                )}
                <TableHead>Precio Venta</TableHead>
                {isAdmin && (
                  <TableHead className="bg-green-50 text-green-700 font-semibold">
                    Creado por
                  </TableHead>
                )}
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {filteredProductos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-medium">{producto.codigo}</TableCell>
                    <TableCell className="font-mono text-sm bg-gray-50">
                      {producto.codigoBarras}
                    </TableCell>
                    <TableCell>{producto.producto}</TableCell>
                    <TableCell className="capitalize">{producto.proveedor}</TableCell>
                    <TableCell>{producto.referencia}</TableCell>
                    <TableCell>
                      {producto.cantidad} {producto.unidades}
                    </TableCell>
                    <TableCell className="uppercase font-mono">
                      {producto.costo}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="bg-blue-50 font-semibold text-blue-900">
                        ${formatearCostoReal(producto.costoReal)}
                      </TableCell>
                    )}
                    <TableCell>${producto.precioVenta}</TableCell>
                      {isAdmin && (
                        <TableCell className="bg-green-50 text-green-900 text-sm">
                          {producto.creadoPor?.nombre || 'Sin info'}
                        </TableCell>
                      )}
                      <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(producto)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setBarcodeModal({
                                isOpen: true,
                                codigo: producto.codigoBarras,
                                producto: producto.producto,
                              });
                            }}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir Código
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(producto.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal de código de barras */}
      <BarcodeDisplay
        codigo={barcodeModal.codigo}
        producto={barcodeModal.producto}
        isOpen={barcodeModal.isOpen}
        onClose={() => setBarcodeModal({ isOpen: false, codigo: '', producto: '' })}
      />
    </Card>
  );
}