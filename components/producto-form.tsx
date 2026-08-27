'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productoSchema, ProductoFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Plus, Search, X, PackagePlus, ChevronRight, Printer } from 'lucide-react';
import { OpcionesConfig } from '@/components/opciones-config';
import { BarcodeDisplay } from '@/components/barcode-display';
import { useAuth } from '@/lib/auth-context';

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

interface ProductoFormProps {
  onSuccess: (producto?: Producto, wasEditing?: boolean) => void;
  productoToEdit?: Producto | null;
  onCancelEdit?: () => void;
  mostrarBusqueda?: boolean; // Nuevo prop para controlar si se muestra la búsqueda
  centroCostoId?: string;       // NUEVO: centro de costo activo (multi-centro)
  centroCostoNombre?: string;   // NUEVO: nombre del centro activo, para mensajes
}

// Resultado del buscador cruzado entre agencias (GET /api/productos/buscar-referencia).
// Es intencionalmente más liviano que Producto: no trae id, costoReal, ni
// datos de la agencia salvo el nombre (no está disponible ni debería
// mostrarse info de otra sucursal más allá de lo necesario para clonar).
interface CatalogoResultado {
  proveedor: string;
  referencia: string;
  producto: string;
  unidades: string;
  seccion: string | null;
  costo: string;
  precioVenta: string;
  codigo: string;
  embalaje: string | null;
  agencias: string[];
}

export function ProductoForm({
  onSuccess,
  productoToEdit,
  onCancelEdit,
  mostrarBusqueda = false,
  centroCostoId,       // NUEVO
  centroCostoNombre,   // NUEVO
}: ProductoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Cuando una acción falla por sesión vencida (401), se muestra un aviso
  // claro y accionable en vez del mensaje crudo "Token inválido".
  const [sessionExpired, setSessionExpired] = useState(false);
  const { logout, centroCosto } = useAuth();
  // NUEVO: nombre del centro activo, priorizando el prop explícito
  // (multi-centro) sobre el centro único del contexto de auth.
  const nombreCentroActivo = centroCostoNombre ?? centroCosto?.nombre;
  const [configModal, setConfigModal] = useState<'proveedores' | 'unidades' | 'secciones' | null>(null);
  const [proveedores, setProveedores] = useState<string[]>(['BODEGA', 'ALEA']);
  const [unidades, setUnidades] = useState<string[]>(['METROS', 'YARDAS', 'GRAMOS', 'UNIDAD']);
  const [secciones, setSecciones] = useState<string[]>(['HERRAJES ALEA', 'SESGOS', 'HILOS', 'ENTRETELAS', 'CIERRES', 'REATAS',
        'HERRAJES', 'NAVIDAD', 'MILLARES','ADORNOS', 'CACHARRERIA', 'ELASTICO', 'CORDONES', 'BISUTERIA', 'CINTAS', 'BOTONES',
        'ENCAJES', 'VARIOS', 'APLIQUES']);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [selectedUnidades, setSelectedUnidades] = useState('');
  const [selectedSeccion, setSelectedSeccion] = useState('');
  const isEditing = !!productoToEdit;

  // Modal de código de barras para el botón "Guardar e Imprimir"
  const [barcodeModal, setBarcodeModal] = useState<{
    isOpen: boolean;
    codigo: string;
    producto: string;
    embalaje?: string;
    referencia?: string;
  }>({ isOpen: false, codigo: '', producto: '' });

  // Estados para búsqueda por referencia
  const [searchRef, setSearchRef] = useState('');
  const [searching, setSearching] = useState(false);
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [modoAgregar, setModoAgregar] = useState(false);

  // Buscador de catálogo entre agencias (para clonar un producto que ya
  // existe en otra sucursal, en vez de llenar el formulario desde cero)
  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [resultadosCatalogo, setResultadosCatalogo] = useState<CatalogoResultado[]>([]);
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false);
  const [mostrarResultadosCatalogo, setMostrarResultadosCatalogo] = useState(false);
  const [avisoYaExisteEnMiAgencia, setAvisoYaExisteEnMiAgencia] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
  });

  // Cargar opciones personalizadas
  useEffect(() => {
    const customProveedores = localStorage.getItem('custom_proveedores');
    const customUnidades = localStorage.getItem('custom_unidades');
    const customSecciones = localStorage.getItem('custom_secciones');

    if (customProveedores) {
      setProveedores(JSON.parse(customProveedores));
    }
    if (customUnidades) {
      setUnidades(JSON.parse(customUnidades));
    }
    if (customSecciones) {
      setSecciones(JSON.parse(customSecciones));
    }
  }, [configModal]);

  // Cargar datos cuando se va a editar
  useEffect(() => {
    if (productoToEdit) {
      setValue('proveedor', productoToEdit.proveedor);
      setValue('referencia', productoToEdit.referencia);
      setValue('producto', productoToEdit.producto);
      setValue('cantidad', productoToEdit.cantidad.toString());
      setValue('unidades', productoToEdit.unidades);
      setValue('seccion', productoToEdit.seccion || '');
      setValue('costo', productoToEdit.costo);
      setValue('precioVenta', productoToEdit.precioVenta);
      setValue('codigo', productoToEdit.codigo);
      setValue('embalaje', productoToEdit.embalaje || '');
      setSelectedProveedor(productoToEdit.proveedor);
      setSelectedUnidades(productoToEdit.unidades);
      setSelectedSeccion(productoToEdit.seccion || '');
    } else {
      reset();
      setSelectedProveedor('');
      setSelectedUnidades('');
      setSelectedSeccion('');
      setAvisoYaExisteEnMiAgencia(null);
    }
  }, [productoToEdit, setValue, reset]);

  // Buscador de catálogo entre agencias, con debounce: espera a que el
  // usuario deje de escribir ~350ms antes de consultar, y solo busca a
  // partir de 2 caracteres para no disparar consultas por cada tecla.
  useEffect(() => {
    if (searchCatalogo.trim().length < 2) {
      setResultadosCatalogo([]);
      setMostrarResultadosCatalogo(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoCatalogo(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/productos/buscar-referencia?q=${encodeURIComponent(searchCatalogo.trim())}`,
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        );
        if (response.ok) {
          const data = await response.json();
          setResultadosCatalogo(data.resultados || []);
          setMostrarResultadosCatalogo(true);
        }
      } catch (err) {
        console.error('Error buscando en el catálogo de otras agencias:', err);
      } finally {
        setBuscandoCatalogo(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchCatalogo]);

  // Prellena el formulario con un producto encontrado en otra agencia.
  // Cantidad siempre en 0 (editable) - es un producto nuevo para ESTA
  // agencia, aunque ya exista en otra.
  const seleccionarDeCatalogo = (item: CatalogoResultado) => {
    setValue('proveedor', item.proveedor);
    setValue('referencia', item.referencia);
    setValue('producto', item.producto);
    setValue('cantidad', '0');
    setValue('unidades', item.unidades);
    setValue('seccion', item.seccion || '');
    setValue('costo', item.costo);
    setValue('precioVenta', item.precioVenta);
    setValue('codigo', item.codigo);
    setValue('embalaje', item.embalaje || '');

    setSelectedProveedor(item.proveedor);
    setSelectedUnidades(item.unidades);
    setSelectedSeccion(item.seccion || '');

    // Si el proveedor/unidad/sección de la otra agencia no está en las
    // listas desplegables de este navegador (son personalizadas por
    // dispositivo, vía localStorage), lo agregamos para que el Select lo
    // pueda mostrar en vez de quedar en blanco.
    setProveedores((prev) => (prev.includes(item.proveedor) ? prev : [...prev, item.proveedor]));
    setUnidades((prev) => (prev.includes(item.unidades) ? prev : [...prev, item.unidades]));
    if (item.seccion) {
      setSecciones((prev) => (prev.includes(item.seccion!) ? prev : [...prev, item.seccion!]));
    }

    setSearchCatalogo('');
    setMostrarResultadosCatalogo(false);

    // Aviso (no bloqueante) si esta referencia ya existe en la propia
    // agencia del usuario - probablemente debería usar "Agregar Cantidad"
    // en vez de crear un producto nuevo, pero se le deja decidir.
    // NUEVO: usa el centro activo (prop, multi-centro) con fallback al
    // centro único del contexto de auth.
    if (nombreCentroActivo && item.agencias.includes(nombreCentroActivo)) {
      setAvisoYaExisteEnMiAgencia(nombreCentroActivo);
    } else {
      setAvisoYaExisteEnMiAgencia(null);
    }
  };

  // Buscar producto por referencia
  const buscarPorReferencia = async () => {
    if (!searchRef.trim()) {
      setError('Ingresa una referencia para buscar');
      return;
    }

    setSearching(true);
    setError('');
    setProductosEncontrados([]);
    setProductoSeleccionado(null);

    try {
      const token = localStorage.getItem('token');
      // NUEVO: si hay un centro activo explícito (multi-centro), la
      // búsqueda se restringe a ese centro - cada módulo/centro se
      // comporta como su propio inventario independiente.
      const centroQuery = centroCostoId ? `&centroCostoId=${encodeURIComponent(centroCostoId)}` : '';
      const response = await fetch(`/api/productos?referencia=${encodeURIComponent(searchRef.trim())}&pageSize=100${centroQuery}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Error al buscar productos');
      }

      const data = await response.json();
      const encontrados: Producto[] = data.productos;

      if (encontrados.length > 0) {
        setProductosEncontrados(encontrados);
        
        // Si solo hay uno, seleccionarlo automáticamente
        if (encontrados.length === 1) {
          setProductoSeleccionado(encontrados[0]);
          setModoAgregar(true);
        }
        // Si hay múltiples, mostrar lista para elegir
        else {
          setModoAgregar(false); // Mostrar lista de selección primero
        }
        
        setCantidadAgregar('');
      } else {
        setError(`No se encontró ningún producto con la referencia "${searchRef}"`);
      }
    } catch (err) {
      setError('Error al buscar el producto');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Agregar cantidad al producto encontrado
  const agregarCantidad = async () => {
    if (!productoSeleccionado) return;
    if (!cantidadAgregar || parseFloat(cantidadAgregar) <= 0) {
      setError('Ingresa una cantidad válida para agregar');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSessionExpired(false);

    try {
      const nuevaCantidad = parseFloat(productoSeleccionado.cantidad.toString()) + parseFloat(cantidadAgregar);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productos/${productoSeleccionado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          proveedor: productoSeleccionado.proveedor,
          referencia: productoSeleccionado.referencia,
          producto: productoSeleccionado.producto,
          cantidad: nuevaCantidad.toString(),
          unidades: productoSeleccionado.unidades,
          costo: productoSeleccionado.costo,
          precioVenta: productoSeleccionado.precioVenta,
          codigo: productoSeleccionado.codigo,
          embalaje: productoSeleccionado.embalaje,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
        }),
      });

      if (response.status === 401) {
        // La sesión venció justo al momento de guardar. En vez del mensaje
        // crudo del servidor, mostramos un aviso claro con la opción de
        // volver a iniciar sesión - sin perder de golpe lo que el usuario
        // ya tenía en pantalla.
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar cantidad');
      }

      const productoActualizado = await response.json();

      // Limpiar formulario de búsqueda
      setSearchRef('');
      setProductosEncontrados([]);
      setProductoSeleccionado(null);
      setCantidadAgregar('');
      setModoAgregar(false);
      
      onSuccess(productoActualizado, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar modo agregar
  const cancelarAgregar = () => {
    setSearchRef('');
    setProductosEncontrados([]);
    setProductoSeleccionado(null);
    setCantidadAgregar('');
    setModoAgregar(false);
    setError('');
  };

  const onSubmit = async (data: ProductoFormData, imprimir: boolean = false) => {
    setIsSubmitting(true);
    setError('');
    setSessionExpired(false);

    try {
      const url = isEditing 
        ? `/api/productos/${productoToEdit.id}`
        : '/api/productos';
      
      const method = isEditing ? 'PUT' : 'POST';

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...data,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
          // NUEVO: solo al crear (nunca al editar) - le dice al backend en
          // qué centro de costo (módulo activo) se está registrando el
          // producto. Si no viene, el backend usa el centro principal del
          // usuario, igual que siempre.
          ...(!isEditing && centroCostoId ? { centroCostoId } : {}),
        }),
      });

      if (response.status === 401) {
        // La sesión venció justo al momento de guardar. En vez del mensaje
        // crudo del servidor, mostramos un aviso claro con la opción de
        // volver a iniciar sesión - sin perder de golpe lo que el usuario
        // ya tenía en el formulario.
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar producto');
      }

      const productoGuardado = await response.json();

      reset();
      onSuccess(productoGuardado, isEditing);
      if (onCancelEdit) onCancelEdit();
      setSelectedProveedor('');
      setSelectedUnidades('');
      setSelectedSeccion('');
      setAvisoYaExisteEnMiAgencia(null);

      // "Guardar e Imprimir": mismo diálogo de código de barras que se usa
      // en la tabla de productos ("Imprimir Código"), con los datos del
      // producto recién guardado.
      if (imprimir && productoGuardado?.codigoBarras) {
        setBarcodeModal({
          isOpen: true,
          codigo: productoGuardado.codigoBarras,
          producto: productoGuardado.producto,
          embalaje: productoGuardado.embalaje || undefined,
          referencia: productoGuardado.referencia || undefined,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {modoAgregar ? '📦 Agregar Cantidad' : isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* LISTA DE SELECCIÓN - Cuando hay múltiples productos */}
          {productosEncontrados.length > 1 && !modoAgregar ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Se encontraron {productosEncontrados.length} productos con la referencia "{searchRef}"
                </h3>
                <p className="text-sm text-blue-700">Selecciona el producto al que quieres agregar cantidad:</p>
              </div>

              {/* Lista de productos encontrados */}
              <div className="space-y-2">
                {productosEncontrados.map((producto) => (
                  <button
                    key={producto.id}
                    onClick={() => {
                      setProductoSeleccionado(producto);
                      setModoAgregar(true);
                    }}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{producto.producto}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                          <p><strong>Código:</strong> {producto.codigo}</p>
                          <p><strong>Proveedor:</strong> {producto.proveedor}</p>
                          <p><strong>Cantidad:</strong> {producto.cantidad} {producto.unidades}</p>
                          {producto.embalaje && <p><strong>Embalaje:</strong> {producto.embalaje}</p>}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Botón cancelar */}
              <Button 
                type="button" 
                variant="outline" 
                onClick={cancelarAgregar}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          ) : /* MODO AGREGAR CANTIDAD */
          modoAgregar && productoSeleccionado ? (
            <div className="space-y-4">
              {/* Info del producto encontrado */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Producto Seleccionado:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Producto:</strong> {productoSeleccionado.producto}</p>
                  <p><strong>Referencia:</strong> {productoSeleccionado.referencia}</p>
                  <p><strong>Código:</strong> {productoSeleccionado.codigo}</p>
                  <p><strong>Proveedor:</strong> {productoSeleccionado.proveedor}</p>
                  <p className="text-lg font-bold text-blue-700">
                    Cantidad actual: {productoSeleccionado.cantidad} {productoSeleccionado.unidades}
                  </p>
                </div>
              </div>

              {/* Input para agregar cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidadAgregar">Cantidad a Agregar *</Label>
                <Input
                  id="cantidadAgregar"
                  type="number"
                  step="0.01"
                  value={cantidadAgregar}
                  onChange={(e) => setCantidadAgregar(e.target.value)}
                  placeholder="Ej: 62.2"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">
                  Nueva cantidad será: <strong>{productoSeleccionado.cantidad + (parseFloat(cantidadAgregar) || 0)} {productoSeleccionado.unidades}</strong>
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {/* Sesión vencida al guardar */}
              {sessionExpired && (
                <div className="p-3 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200 space-y-2">
                  <p>No se pudo guardar porque tu sesión expiró. Antes de continuar, puedes anotar estos datos - al iniciar sesión de nuevo vas a tener que volver a ingresarlos.</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => logout('Tu sesión expiró. Por favor inicia sesión de nuevo.')}
                  >
                    Iniciar sesión de nuevo
                  </Button>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={agregarCantidad} 
                  disabled={isSubmitting || !cantidadAgregar}
                  className="flex-1 w-full"
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Agregando...' : 'Agregar Cantidad'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={cancelarAgregar}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* MODO NORMAL - FORMULARIO COMPLETO */
            <div className="space-y-4">
              {/* Búsqueda por referencia */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <Label htmlFor="searchRef" className="text-blue-900 font-semibold mb-2 block">
                  🔍 Buscar por Referencia
                </Label>
                <p className="text-xs text-blue-700 mb-3">
                  Si el producto ya existe, podrás agregar cantidad directamente
                </p>
                <div className="flex gap-2">
                  <Input
                    id="searchRef"
                    value={searchRef}
                    onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
                    placeholder="Ej: ABG-69"
                    className="flex-1 uppercase"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarPorReferencia();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={buscarPorReferencia} 
                    disabled={searching || !searchRef.trim()}
                    variant="default"
                  >
                    <Search className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">
                      {searching ? 'Buscando...' : 'Buscar'}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Buscador de catálogo entre agencias - solo al crear, no al editar */}
              {!isEditing && (
                <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 rounded-lg border border-purple-200">
                  <Label htmlFor="searchCatalogo" className="text-purple-900 font-semibold mb-2 block">
                    🏢 Buscar en otras agencias
                  </Label>
                  <p className="text-xs text-purple-700 mb-3">
                    Si el producto ya existe en otra sucursal, se prellenan sus datos (cantidad en 0 para esta agencia)
                  </p>
                  <div className="relative">
                    <Input
                      id="searchCatalogo"
                      value={searchCatalogo}
                      onChange={(e) => setSearchCatalogo(e.target.value)}
                      onFocus={() => {
                        if (resultadosCatalogo.length > 0) setMostrarResultadosCatalogo(true);
                      }}
                      onBlur={() => {
                        // Pequeño retraso para que el clic en un resultado
                        // alcance a registrarse antes de cerrar la lista.
                        setTimeout(() => setMostrarResultadosCatalogo(false), 150);
                      }}
                      placeholder="Busca por referencia o nombre del producto..."
                    />
                    {buscandoCatalogo && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-500">
                        Buscando...
                      </span>
                    )}

                    {mostrarResultadosCatalogo && resultadosCatalogo.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-purple-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
                        {resultadosCatalogo.map((item, idx) => (
                          <button
                            key={`${item.proveedor}-${item.referencia}-${idx}`}
                            type="button"
                            onClick={() => seleccionarDeCatalogo(item)}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-b-0 text-sm"
                          >
                            <div className="font-medium text-gray-900">{item.producto}</div>
                            <div className="text-xs text-gray-500">
                              Ref: {item.referencia} · {item.proveedor}
                            </div>
                            <div className="text-xs text-purple-600 mt-0.5">
                              Ya existe en: {item.agencias.join(', ')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {mostrarResultadosCatalogo &&
                      resultadosCatalogo.length === 0 &&
                      !buscandoCatalogo &&
                      searchCatalogo.trim().length >= 2 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
                          No se encontró en ninguna agencia. Puedes registrarlo como nuevo abajo.
                        </div>
                      )}
                  </div>

                  {avisoYaExisteEnMiAgencia && (
                    <div className="mt-3 p-2 text-xs text-amber-800 bg-amber-50 rounded border border-amber-200">
                      ⚠️ Esta referencia ya existe en tu agencia ({avisoYaExisteEnMiAgencia}). Si es el mismo
                      producto, considera usar &quot;Buscar por Referencia&quot; arriba para agregarle cantidad en
                      vez de crear uno nuevo. Aun así, puedes continuar y guardarlo si es intencional.
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  O registra un producto nuevo:
                </p>

                <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4">
                  {/* Proveedor */}
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedProveedor}
                        onValueChange={(value) => {
                          setValue('proveedor', value);
                          setSelectedProveedor(value);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona un proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {proveedores.map((prov) => (
                            <SelectItem key={prov} value={prov}>
                              {prov}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setConfigModal('proveedores')}
                        title="Gestionar proveedores"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.proveedor && (
                      <p className="text-sm text-red-500">{errors.proveedor.message}</p>
                    )}
                  </div>

                  {/* Referencia */}
                  <div className="space-y-2">
                    <Label htmlFor="referencia">Referencia *</Label>
                    <Input
                      id="referencia"
                      {...register('referencia')}
                      placeholder="Ej: REF-001"
                      className="uppercase"
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                        register('referencia').onChange(e);
                      }}
                    />
                    {errors.referencia && (
                      <p className="text-sm text-red-500">{errors.referencia.message}</p>
                    )}
                  </div>

                  {/* Producto */}
                  <div className="space-y-2">
                    <Label htmlFor="producto">Producto *</Label>
                    <Input
                      id="producto"
                      {...register('producto')}
                      placeholder="Nombre del producto"
                    />
                    {errors.producto && (
                      <p className="text-sm text-red-500">{errors.producto.message}</p>
                    )}
                  </div>

                  {/* Cantidad - AHORA ACEPTA DECIMALES */}
                  <div className="space-y-2">
                    <Label htmlFor="cantidad">Cantidad *</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      step="0.01"
                      {...register('cantidad')}
                      placeholder="Ej: 10 o 62.5"
                    />
                    {errors.cantidad && (
                      <p className="text-sm text-red-500">{errors.cantidad.message}</p>
                    )}
                    <p className="text-xs text-gray-500">Acepta números enteros y decimales, incluyendo 0</p>
                  </div>

                  {/* Unidades */}
                  <div className="space-y-2">
                    <Label htmlFor="unidades">Unidades *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedUnidades}
                        onValueChange={(value) => {
                          setValue('unidades', value);
                          setSelectedUnidades(value);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {unidades.map((unidad) => (
                            <SelectItem key={unidad} value={unidad}>
                              {unidad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setConfigModal('unidades')}
                        title="Gestionar unidades"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.unidades && (
                      <p className="text-sm text-red-500">{errors.unidades.message}</p>
                    )}
                  </div>

                  {/* Sección */}
                  <div className="space-y-2">
                    <Label htmlFor="seccion">Departamento *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSeccion}
                        onValueChange={(value) => {
                          setValue('seccion', value);
                          setSelectedSeccion(value);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona un departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {secciones.map((sec) => (
                            <SelectItem key={sec} value={sec}>
                              {sec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setConfigModal('secciones')}
                        title="Gestionar departamentos"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.seccion && (
                      <p className="text-sm text-red-500">{errors.seccion.message}</p>
                    )}
                  </div>

                  {/* Costo */}
                  <div className="space-y-2">
                    <Label htmlFor="costo">Costo (Código) *</Label>
                    <Input
                      id="costo"
                      {...register('costo')}
                      placeholder="X"
                      className="uppercase"
                    />
                    {errors.costo && (
                      <p className="text-sm text-red-500">{errors.costo.message}</p>
                    )}
                  </div>

                  {/* Precio de Venta */}
                  <div className="space-y-2">
                    <Label htmlFor="precioVenta">Precio de Venta *</Label>
                    <Input
                      id="precioVenta"
                      {...register('precioVenta')}
                      placeholder="0.00"
                    />
                    {errors.precioVenta && (
                      <p className="text-sm text-red-500">{errors.precioVenta.message}</p>
                    )}
                  </div>

                  {/* Código */}
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      type="number"
                      {...register('codigo')}
                      placeholder="Ej: 123"
                    />
                    {errors.codigo && (
                      <p className="text-sm text-red-500">{errors.codigo.message}</p>
                    )}
                    <p className="text-xs text-gray-500">Solo números</p>
                  </div>

                  {/* Embalaje */}
                  <div className="space-y-2">
                    <Label htmlFor="embalaje">Embalaje</Label>
                    <Input
                      id="embalaje"
                      {...register('embalaje')}
                      placeholder="Ej: Caja, Paquete, Bolsa (Opcional)"
                    />
                    {errors.embalaje && (
                      <p className="text-sm text-red-500">{errors.embalaje.message}</p>
                    )}
                  </div>

                  {/* Error general del formulario (solo si no es error de búsqueda) */}
                  {error && (mostrarBusqueda ? modoAgregar : true) && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Sesión vencida al guardar */}
                  {sessionExpired && (
                    <div className="p-3 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200 space-y-2">
                      <p>No se pudo guardar porque tu sesión expiró. Antes de continuar, puedes anotar estos datos - al iniciar sesión de nuevo vas a tener que volver a ingresarlos.</p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => logout('Tu sesión expiró. Por favor inicia sesión de nuevo.')}
                      >
                        Iniciar sesión de nuevo
                      </Button>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1 w-full">
                      {isSubmitting 
                        ? 'Guardando...' 
                        : isEditing 
                          ? 'Actualizar Producto' 
                          : 'Guardar Producto'}
                    </Button>
                    {!isEditing && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSubmitting}
                        onClick={handleSubmit((data) => onSubmit(data, true))}
                        className="flex-1 w-full"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Guardando...' : 'Guardar e Imprimir'}
                      </Button>
                    )}
                    {isEditing && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onCancelEdit}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales de configuración */}
      {configModal && (
        <OpcionesConfig
          isOpen={true}
          onClose={() => setConfigModal(null)}
          tipo={configModal}
        />
      )}

      {/* Modal de código de barras (botón "Guardar e Imprimir") */}
      <BarcodeDisplay
        isOpen={barcodeModal.isOpen}
        onClose={() => setBarcodeModal((prev) => ({ ...prev, isOpen: false }))}
        codigo={barcodeModal.codigo}
        producto={barcodeModal.producto}
        embalaje={barcodeModal.embalaje}
        referencia={barcodeModal.referencia}
      />
    </>
  );
}