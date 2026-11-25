'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validarCostoEncriptado } from '@/lib/encryption';
import {
  ScanLine,
  Search,
  PackagePlus,
  PackageMinus,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  cantidadDanada: number;
  unidades: string;
  costo: string;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  embalaje?: string | null;
}

interface EscaneoRapidoViewProps {
  // Se llama después de guardar un cambio, para que la vista que montó este
  // componente refresque su propia lista/estadísticas (igual patrón que
  // ScannedProductView.onUpdate) - opcional porque no todas las vistas
  // mantienen una lista de productos propia (ej. superadmin-view.tsx).
  onUpdate?: () => void;
}

export function EscaneoRapidoView({ onUpdate }: EscaneoRapidoViewProps) {
  const [codigoInput, setCodigoInput] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [operacionCantidad, setOperacionCantidad] = useState<'sumar' | 'restar'>('sumar');
  const [cantidadInput, setCantidadInput] = useState('');
  const [cantidadDanadaInput, setCantidadDanadaInput] = useState('');
  const [costoInput, setCostoInput] = useState('');
  const [precioVentaInput, setPrecioVentaInput] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  // Evita disparar dos búsquedas si llegan eventos de más mientras una
  // búsqueda ya está en curso (mismo patrón que procesandoRef en
  // barcode-scanner.tsx).
  const procesandoRef = useRef(false);
  // Espejo de "guardando" en un ref, para poder leerlo dentro del listener
  // global de teclado (más abajo) sin tener que re-registrar ese listener
  // cada vez que cambia el estado.
  const guardandoRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    guardandoRef.current = guardando;
  }, [guardando]);

  // Captura de escaneo "en cualquier parte" de esta pantalla: permite leer
  // un código con la pistola sin tener que volver a hacer clic en el campo
  // de búsqueda cada vez. Solo se activa cuando el foco NO está dentro de
  // un campo editable (input/textarea) - así no interfiere si el usuario
  // está escribiendo a mano en cantidad dañada, costo o precio de venta; en
  // esos campos el tecleo se comporta exactamente igual que siempre.
  //
  // Para distinguir un escaneo real de alguien tecleando: la pistola manda
  // cada carácter con 1-5ms de diferencia, mientras que una persona no baja
  // de ~80-100ms entre teclas. Se guarda todo en refs (no en estado) para
  // no causar un re-render en cada tecla - exactamente el mismo motivo por
  // el que barcode-scanner.tsx cuenta los intentos de escaneo en un ref.
  useEffect(() => {
    const bufferRef = { current: '' };
    const ultimaTeclaRef = { current: 0 };
    const INTERVALO_MAX_MS = 50;
    const LARGO_MINIMO = 4;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tagActivo = document.activeElement?.tagName;
      if (tagActivo === 'INPUT' || tagActivo === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (guardandoRef.current || procesandoRef.current) return;

      const ahora = Date.now();
      const intervalo = ahora - ultimaTeclaRef.current;

      if (e.key === 'Enter') {
        const codigo = bufferRef.current;
        bufferRef.current = '';
        if (codigo.length >= LARGO_MINIMO && intervalo <= INTERVALO_MAX_MS) {
          e.preventDefault();
          buscarProducto(codigo);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current = intervalo <= INTERVALO_MAX_MS ? bufferRef.current + e.key : e.key;
        ultimaTeclaRef.current = ahora;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enfocarInput = () => {
    // Pequeño delay para que el campo quede listo después de que React
    // termine de re-renderizar (por ejemplo, tras ocultar la tarjeta del
    // producto anterior).
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  const limpiarTarjeta = () => {
    setProducto(null);
    setOperacionCantidad('sumar');
    setCantidadInput('');
    setCantidadDanadaInput('');
    setCostoInput('');
    setPrecioVentaInput('');
  };

  const buscarProducto = async (codigo: string) => {
    if (!codigo.trim() || procesandoRef.current) return;
    procesandoRef.current = true;
    setBuscando(true);
    setError('');
    setSessionExpired(false);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/productos/buscar?codigoBarras=${encodeURIComponent(codigo.trim())}`, {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Producto no encontrado con ese código');
        limpiarTarjeta();
        return;
      }

      const data: Producto = await response.json();
      setProducto(data);
      setOperacionCantidad('sumar');
      setCantidadInput('');
      setCantidadDanadaInput(data.cantidadDanada.toString());
      setCostoInput(data.costo);
      setPrecioVentaInput(data.precioVenta);
    } catch (err) {
      console.error('Error buscando producto:', err);
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setBuscando(false);
      setCodigoInput('');
      procesandoRef.current = false;
      enfocarInput();
    }
  };

  const handleKeyDownCodigo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarProducto(codigoInput);
    }
  };

  const cantidadDelta = parseFloat(cantidadInput) || 0;
  const nuevaCantidad = producto
    ? operacionCantidad === 'sumar'
      ? producto.cantidad + cantidadDelta
      : producto.cantidad - cantidadDelta
    : 0;

  const cantidadDanadaNum = parseFloat(cantidadDanadaInput) || 0;
  const cantidadDanadaPreview = Math.min(Math.max(0, cantidadDanadaNum), Math.max(0, nuevaCantidad));

  const guardarCambios = async (confirmarPrecioMenorCosto = false) => {
    if (!producto) return;

    if (operacionCantidad === 'restar' && nuevaCantidad < 0) {
      setError(
        `No puedes descontar más de lo que hay en stock (cantidad actual: ${producto.cantidad} ${producto.unidades})`
      );
      return;
    }

    if (!costoInput.trim() || !validarCostoEncriptado(costoInput)) {
      setError('El costo solo puede contener las letras: H, U, B, I, E, R, A, M, O, S');
      return;
    }

    if (!precioVentaInput.trim() || !/^\d+(\.\d+)?$/.test(precioVentaInput.trim())) {
      setError('El precio de venta solo puede contener números');
      return;
    }

    setGuardando(true);
    setError('');
    setSessionExpired(false);

    try {
      const response = await fetch(`/api/productos/${producto.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          proveedor: producto.proveedor,
          referencia: producto.referencia,
          producto: producto.producto,
          cantidad: nuevaCantidad.toString(),
          cantidadDanada: cantidadDanadaInput,
          unidades: producto.unidades,
          costo: costoInput,
          precioVenta: precioVentaInput,
          codigo: producto.codigo,
          embalaje: producto.embalaje ?? null,
          ...(confirmarPrecioMenorCosto ? { confirmarPrecioMenorCosto: true } : {}),
        }),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.precioMenorCosto && !confirmarPrecioMenorCosto) {
          const continuar = confirm(
            `${errorData.error}\n\n¿Deseas guardar de todas formas? Quedará registrado en el Historial para revisión.`
          );
          if (continuar) {
            await guardarCambios(true);
            return;
          }
          return;
        }

        setError(errorData.error || 'Error al actualizar producto');
        return;
      }

      setSuccessMessage(`"${producto.producto}" actualizado correctamente`);
      limpiarTarjeta();
      onUpdate?.();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setGuardando(false);
      enfocarInput();
    }
  };

  const cancelar = () => {
    limpiarTarjeta();
    setError('');
    enfocarInput();
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Escaneo Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigoEscaneo">Código de barras</Label>
            <div className="flex gap-2">
              <Input
                id="codigoEscaneo"
                ref={inputRef}
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                onKeyDown={handleKeyDownCodigo}
                placeholder="Escanea con la pistola o escribe el código"
                className="text-lg"
                disabled={buscando}
                autoComplete="off"
              />
              <Button
                type="button"
                onClick={() => buscarProducto(codigoInput)}
                disabled={buscando || !codigoInput.trim()}
              >
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Conecta el lector físico y escanea - no hace falta hacer clic aquí primero, solo evita estar escribiendo
              en otro campo de esta pantalla. También puedes escribir el código a mano y presionar Enter.
            </p>
          </div>

          {sessionExpired && (
            <div className="p-3 text-sm bg-amber-50 text-amber-800 rounded-md border border-amber-200">
              Tu sesión expiró. Inicia sesión de nuevo para poder continuar.
            </div>
          )}

          {error && !sessionExpired && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-sm text-green-800 bg-green-50 rounded-md border border-green-200 flex gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {producto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{producto.producto}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Proveedor</p>
                <p className="font-medium capitalize">{producto.proveedor}</p>
              </div>
              <div>
                <p className="text-gray-600">Referencia</p>
                <p className="font-medium">{producto.referencia}</p>
              </div>
              <div>
                <p className="text-gray-600">Código</p>
                <p className="font-medium">{producto.codigo}</p>
              </div>
              <div>
                <p className="text-gray-600">Cantidad actual</p>
                <p className="font-bold">
                  {producto.cantidad} {producto.unidades}
                </p>
              </div>
            </div>

            {/* Entrada / Salida de cantidad */}
            <div className="space-y-2">
              <Label>Entrada / Salida de mercancía</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setOperacionCantidad('sumar')}
                  className={`flex-1 ${
                    operacionCantidad === 'sumar'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Entrada
                </Button>
                <Button
                  type="button"
                  onClick={() => setOperacionCantidad('restar')}
                  className={`flex-1 ${
                    operacionCantidad === 'restar'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <PackageMinus className="h-4 w-4 mr-2" />
                  Salida
                </Button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                placeholder="0"
                className="text-lg"
              />
              <p className={`text-xs ${operacionCantidad === 'restar' && nuevaCantidad < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Nueva cantidad será: <strong>{nuevaCantidad} {producto.unidades}</strong>
              </p>
            </div>

            {/* Cantidad dañada */}
            <div className="space-y-2">
              <Label htmlFor="cantidadDanada">Cantidad en mal estado</Label>
              <Input
                id="cantidadDanada"
                type="number"
                step="0.01"
                min="0"
                value={cantidadDanadaInput}
                onChange={(e) => setCantidadDanadaInput(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">
                Se guardará como: <strong>{cantidadDanadaPreview} {producto.unidades}</strong>
              </p>
            </div>

            {/* Costo */}
            <div className="space-y-2">
              <Label htmlFor="costoEscaneo">Costo (código)</Label>
              <Input
                id="costoEscaneo"
                value={costoInput}
                onChange={(e) => setCostoInput(e.target.value.toUpperCase())}
                placeholder="ABC (solo letras)"
                className="uppercase"
              />
            </div>

            {/* Precio de venta */}
            <div className="space-y-2">
              <Label htmlFor="precioVentaEscaneo">Precio de venta</Label>
              <Input
                id="precioVentaEscaneo"
                type="number"
                step="0.01"
                min="0"
                value={precioVentaInput}
                onChange={(e) => setPrecioVentaInput(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => guardarCambios(false)}
                disabled={guardando}
                className="flex-1"
              >
                {guardando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelar} disabled={guardando}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
