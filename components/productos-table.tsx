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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreVertical, Edit, Printer, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  embalaje?: string;
  createdAt: string;
  creadoPor?: {
    nombre: string;
    email: string;
    rol: string;
  };
  editadoPor?: {
    nombre: string;
    email: string;
    rol: string;
  };
}

interface ProductosTableProps {
  productos: Producto[];
  onDelete: (id: string) => void;
  onEdit: (producto: Producto) => void;
}

const ITEMS_POR_PAGINA = 13;

export function ProductosTable({ productos, onDelete, onEdit }: ProductosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('todos');
  const [filtroUnidades, setFiltroUnidades] = useState('todos');
  const [filtroCreadoPor, setFiltroCreadoPor] = useState('todos');
  const { isAdmin } = useAuth();
  const [barcodeModal, setBarcodeModal] = useState<{
    isOpen: boolean;
    codigo: string;
    producto: string;
    embalaje?: string;
    referencia?: string;
  }>({
    isOpen: false,
    codigo: '',
    producto: '',
    embalaje: undefined,
    referencia: undefined,
  });
  const [paginaActual, setPaginaActual] = useState(1);

  // Validar que productos sea un array
  if (!Array.isArray(productos)) {
    productos = [];
  }

  // Filtrar productos según el término de búsqueda y filtros
  const filteredProductos = productos.filter((producto) => {
    const search = searchTerm.toLowerCase();
    const matchSearch = 
      producto.codigo.toLowerCase().includes(search) ||
      producto.producto.toLowerCase().includes(search) ||
      producto.referencia.toLowerCase().includes(search) ||
      producto.proveedor.toLowerCase().includes(search) ||
      (producto.embalaje && producto.embalaje.toLowerCase().includes(search));
    
    const matchProveedor = filtroProveedor === 'todos' || producto.proveedor === filtroProveedor;
    const matchUnidades = filtroUnidades === 'todos' || producto.unidades === filtroUnidades;
    const matchCreadoPor = filtroCreadoPor === 'todos' || producto.creadoPor?.nombre === filtroCreadoPor;
    
    return matchSearch && matchProveedor && matchUnidades && matchCreadoPor;
  });

  // Calcular paginación
  const totalPaginas = Math.ceil(filteredProductos.length / ITEMS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
  const productosEnPagina = filteredProductos.slice(indiceInicio, indiceFin);

  // Resetear a página 1 cuando cambia la búsqueda o filtros
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPaginaActual(1);
  };

  const handleFiltroProveedorChange = (value: string) => {
    setFiltroProveedor(value);
    setPaginaActual(1);
  };

  const handleFiltroUnidadesChange = (value: string) => {
    setFiltroUnidades(value);
    setPaginaActual(1);
  };

  const handleFiltroCreadoPorChange = (value: string) => {
    setFiltroCreadoPor(value);
    setPaginaActual(1);
  };

  // Obtener lista única de proveedores, unidades y usuarios
  const proveedoresUnicos = Array.from(new Set(productos.map(p => p.proveedor))).sort();
  const unidadesUnicas = Array.from(new Set(productos.map(p => p.unidades))).sort();
  const usuariosUnicos = Array.from(
    new Set(productos.map(p => p.creadoPor?.nombre).filter(Boolean))
  ).sort() as string[];

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroProveedor('todos');
    setFiltroUnidades('todos');
    setFiltroCreadoPor('todos');
    setPaginaActual(1);
  };

  // Verificar si hay filtros activos
  const hayFiltrosActivos = searchTerm !== '' || filtroProveedor !== 'todos' || filtroUnidades !== 'todos' || filtroCreadoPor !== 'todos';

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Lista de Productos ({filteredProductos.length})</CardTitle>
          </div>
          
          {/* Filtros y búsqueda */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Búsqueda */}
              <div className="md:col-span-1">
                <Input
                  placeholder="Buscar por código, nombre..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Filtro Proveedor */}
              <div className="md:col-span-1">
                <Select value={filtroProveedor} onValueChange={handleFiltroProveedorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {proveedoresUnicos.map((prov) => (
                      <SelectItem key={prov} value={prov} className="capitalize">
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro Unidades */}
              <div className="md:col-span-1">
                <Select value={filtroUnidades} onValueChange={handleFiltroUnidadesChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las unidades</SelectItem>
                    {unidadesUnicas.map((unidad) => (
                      <SelectItem key={unidad} value={unidad} className="capitalize">
                        {unidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Creado Por - Solo visible para admins */}
              {isAdmin && (
                <div className="md:col-span-1">
                  <Select value={filtroCreadoPor} onValueChange={handleFiltroCreadoPorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los usuarios</SelectItem>
                      {usuariosUnicos.map((usuario) => (
                        <SelectItem key={usuario} value={usuario}>
                          {usuario}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Botón limpiar filtros */}
            {hayFiltrosActivos && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProductos.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">
            No se encontraron productos con &quot;{searchTerm}&quot;
          </p>
        ) : (
          <>
            {/* Mensaje informativo en móvil */}
            <div className="block lg:hidden mb-4 p-3 bg-blue-50 rounded-md text-xs text-blue-700">
              💡 Desliza horizontalmente para ver más columnas
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Embalaje</TableHead>
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
                      {productosEnPagina.map((producto) => (
                        <TableRow key={producto.id}>
                          <TableCell className="font-medium">{producto.codigo}</TableCell>
                          <TableCell>{producto.producto}</TableCell>
                          <TableCell className="capitalize">{producto.proveedor}</TableCell>
                          <TableCell>{producto.referencia}</TableCell>
                          <TableCell>
                            {producto.cantidad} {producto.unidades}
                          </TableCell>
                          <TableCell>
                            {producto.embalaje || '-'}
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
                                      embalaje: producto.embalaje,
                                      referencia: producto.referencia,
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
              </div>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando {indiceInicio + 1} a {Math.min(indiceFin, filteredProductos.length)} de {filteredProductos.length} productos
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irAPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>

                  <div className="flex gap-1">
                    {[...Array(totalPaginas)].map((_, index) => {
                      const numeroPagina = index + 1;
                      
                      // Mostrar solo algunas páginas en móvil
                      if (totalPaginas > 7) {
                        if (
                          numeroPagina === 1 ||
                          numeroPagina === totalPaginas ||
                          (numeroPagina >= paginaActual - 1 && numeroPagina <= paginaActual + 1)
                        ) {
                          return (
                            <Button
                              key={numeroPagina}
                              variant={paginaActual === numeroPagina ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => irAPagina(numeroPagina)}
                              className="w-8 h-8 p-0"
                            >
                              {numeroPagina}
                            </Button>
                          );
                        } else if (
                          numeroPagina === paginaActual - 2 ||
                          numeroPagina === paginaActual + 2
                        ) {
                          return <span key={numeroPagina} className="px-1">...</span>;
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={numeroPagina}
                          variant={paginaActual === numeroPagina ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => irAPagina(numeroPagina)}
                          className="w-8 h-8 p-0"
                        >
                          {numeroPagina}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irAPagina(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                  >
                    <span className="hidden sm:inline mr-1">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Modal de código de barras */}
      <BarcodeDisplay
        codigo={barcodeModal.codigo}
        producto={barcodeModal.producto}
        embalaje={barcodeModal.embalaje}
        referencia={barcodeModal.referencia}
        isOpen={barcodeModal.isOpen}
        onClose={() => setBarcodeModal({ isOpen: false, codigo: '', producto: '', embalaje: undefined, referencia: undefined })}
      />
    </Card>
  );
}