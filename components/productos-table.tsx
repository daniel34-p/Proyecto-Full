'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
import { MoreVertical, Edit, Printer, Trash2, ChevronLeft, ChevronRight, X, Building2, Loader2 } from 'lucide-react';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  seccion?: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  embalaje?: string;
  createdAt: string;
  centroCosto?: {
    id: string;
    nombre: string;
  };
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

interface OpcionesFiltro {
  proveedores: string[];
  unidades: string[];
  secciones: string[];
  creadores: { id: string; nombre: string }[];
  centrosCosto: { id: string; nombre: string }[];
}

interface Paginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filtros {
  search: string;
  proveedor: string;
  unidades: string;
  seccion: string;
  creadoPorId: string;
  centroCostoId: string;
}

interface ProductosTableProps {
  productos: Producto[]; // Solo la página actual (ya viene filtrada/paginada del servidor)
  onDelete: (id: string) => void;
  onEdit: (producto: Producto) => void;
  loading: boolean;
  filtros: Filtros;
  onFiltrosChange: (filtros: Partial<Filtros>) => void;
  onLimpiarFiltros: () => void;
  opciones: OpcionesFiltro;
  paginacion: Paginacion;
  onPageChange: (page: number) => void;
}

export function ProductosTable({
  productos,
  onDelete,
  onEdit,
  loading,
  filtros,
  onFiltrosChange,
  onLimpiarFiltros,
  opciones,
  paginacion,
  onPageChange,
}: ProductosTableProps) {
  const { isAdmin, isSuperAdmin } = useAuth();
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

  // Input de búsqueda local con debounce, para no disparar una petición
  // al servidor en cada tecla presionada.
  const [searchInput, setSearchInput] = useState(filtros.search);

  useEffect(() => {
    setSearchInput(filtros.search);
  }, [filtros.search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filtros.search) {
        onFiltrosChange({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hayFiltrosActivos =
    filtros.search !== '' ||
    filtros.proveedor !== 'todos' ||
    filtros.unidades !== 'todos' ||
    filtros.seccion !== 'todos' ||
    filtros.creadoPorId !== 'todos' ||
    filtros.centroCostoId !== 'todos';

  const irAPagina = (pagina: number) => {
    onPageChange(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Estado totalmente vacío: no hay productos en el sistema y no hay filtros aplicados
  if (!loading && paginacion.total === 0 && !hayFiltrosActivos) {
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

  const indiceInicio = (paginacion.page - 1) * paginacion.pageSize;
  const indiceFin = indiceInicio + productos.length;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              Lista de Productos ({paginacion.total})
              {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </CardTitle>
          </div>
          
          {/* Filtros y búsqueda */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Búsqueda */}
              <div className="md:col-span-1">
                <Input
                  placeholder="Buscar por código, nombre..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Filtro Proveedor */}
              <div className="md:col-span-1">
                <Select value={filtros.proveedor} onValueChange={(v) => onFiltrosChange({ proveedor: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {opciones.proveedores.map((prov) => (
                      <SelectItem key={prov} value={prov} className="capitalize">
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro Unidades */}
              <div className="md:col-span-1">
                <Select value={filtros.unidades} onValueChange={(v) => onFiltrosChange({ unidades: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las unidades</SelectItem>
                    {opciones.unidades.map((unidad) => (
                      <SelectItem key={unidad} value={unidad} className="capitalize">
                        {unidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Sección */}
              <div className="md:col-span-1">
                <Select value={filtros.seccion} onValueChange={(v) => onFiltrosChange({ seccion: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las secciones</SelectItem>
                    {opciones.secciones.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Centro de Costo - Solo visible para SuperAdmin */}
              {isSuperAdmin && opciones.centrosCosto.length > 0 && (
                <div className="md:col-span-1">
                  <Select value={filtros.centroCostoId} onValueChange={(v) => onFiltrosChange({ centroCostoId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los centros</SelectItem>
                      {opciones.centrosCosto.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id}>
                          {centro.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Creado Por - Solo visible para admins */}
              {isAdmin && (
                <div className="md:col-span-1">
                  <Select value={filtros.creadoPorId} onValueChange={(v) => onFiltrosChange({ creadoPorId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los usuarios</SelectItem>
                      {opciones.creadores.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.nombre}
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
                  onClick={() => {
                    setSearchInput('');
                    onLimpiarFiltros();
                  }}
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
        {paginacion.total === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">
            No se encontraron productos con los filtros aplicados
          </p>
        ) : (
          <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
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
                        <TableHead>Sección</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Embalaje</TableHead>
                        <TableHead>Costo</TableHead>
                        {isAdmin && (
                          <TableHead className="bg-blue-50 text-blue-700 font-semibold">
                            Costo Real
                          </TableHead>
                        )}
                        <TableHead>Precio Venta</TableHead>
                        {isSuperAdmin && (
                          <TableHead className="bg-purple-50 text-purple-700 font-semibold">
                            Centro de Costo
                          </TableHead>
                        )}
                        {isAdmin && (
                          <TableHead className="bg-green-50 text-green-700 font-semibold">
                            Creado por
                          </TableHead>
                        )}
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((producto) => (
                        <TableRow key={producto.id}>
                          <TableCell className="font-medium">{producto.codigo}</TableCell>
                          <TableCell>{producto.producto}</TableCell>
                          <TableCell className="capitalize">{producto.proveedor}</TableCell>
                          <TableCell>{producto.referencia}</TableCell>
                          <TableCell>
                            {producto.seccion ? (
                              <Badge variant="outline">{producto.seccion}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
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
                          {isSuperAdmin && (
                            <TableCell className="bg-purple-50">
                              {producto.centroCosto ? (
                                <Badge 
                                  variant="outline" 
                                  className={`${getCentroCostoColor(producto.centroCosto.nombre).bg} ${getCentroCostoColor(producto.centroCosto.nombre).text} ${getCentroCostoColor(producto.centroCosto.nombre).border}`}
                                >
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {producto.centroCosto.nombre}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">Sin asignar</span>
                              )}
                            </TableCell>
                          )}
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
            {paginacion.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando {indiceInicio + 1} a {indiceFin} de {paginacion.total} productos
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irAPagina(paginacion.page - 1)}
                    disabled={paginacion.page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>

                  <div className="flex gap-1">
                    {[...Array(paginacion.totalPages)].map((_, index) => {
                      const numeroPagina = index + 1;
                      
                      // Mostrar solo algunas páginas en móvil
                      if (paginacion.totalPages > 7) {
                        if (
                          numeroPagina === 1 ||
                          numeroPagina === paginacion.totalPages ||
                          (numeroPagina >= paginacion.page - 1 && numeroPagina <= paginacion.page + 1)
                        ) {
                          return (
                            <Button
                              key={numeroPagina}
                              variant={paginacion.page === numeroPagina ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => irAPagina(numeroPagina)}
                              disabled={loading}
                              className="w-8 h-8 p-0"
                            >
                              {numeroPagina}
                            </Button>
                          );
                        } else if (
                          numeroPagina === paginacion.page - 2 ||
                          numeroPagina === paginacion.page + 2
                        ) {
                          return <span key={numeroPagina} className="px-1">...</span>;
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={numeroPagina}
                          variant={paginacion.page === numeroPagina ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => irAPagina(numeroPagina)}
                          disabled={loading}
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
                    onClick={() => irAPagina(paginacion.page + 1)}
                    disabled={paginacion.page === paginacion.totalPages || loading}
                  >
                    <span className="hidden sm:inline mr-1">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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