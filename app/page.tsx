// 'use client';

// import { useState, useEffect } from 'react';
// import { ProductoForm } from '@/components/producto-form';
// import { ProductosTable } from '@/components/productos-table';
// import { InventoryStats } from '@/components/inventory-stats';


// interface Producto {
//   id: string;
//   proveedor: string;
//   referencia: string;
//   producto: string;
//   cantidad: number;
//   unidades: string;
//   costo: string;
//   costoReal: number;
//   precioVenta: string;
//   codigo: string;
//   createdAt: string;
// }

// export default function Home() {
//   const [productos, setProductos] = useState<Producto[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);

//   const fetchProductos = async () => {
//     try {
//       const response = await fetch('/api/productos');
//       const data = await response.json();
//       setProductos(data);
//     } catch (error) {
//       console.error('Error al cargar productos:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchProductos();
//   }, []);

//   const handleDelete = async (id: string) => {
//     if (!confirm('¿Estás seguro de eliminar este producto?')) return;

//     try {
//       const response = await fetch(`/api/productos/${encodeURIComponent(id)}`, {
//         method: 'DELETE',
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         alert(errorData.error || 'Error al eliminar producto');
//         return;
//       }

//       await fetchProductos();
//       alert('Producto eliminado correctamente');
//     } catch (error) {
//       console.error('Error al eliminar producto:', error);
//       alert('Error al eliminar producto');
//     }
//   };

//   const handleEdit = (producto: Producto) => {
//     setProductoToEdit(producto);
//     // Scroll al formulario
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleCancelEdit = () => {
//     setProductoToEdit(null);
//   };

//   const handleSuccess = () => {
//     fetchProductos();
//     setProductoToEdit(null);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p className="text-lg">Cargando...</p>
//       </div>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-7xl mx-auto space-y-8">
//         <div className="space-y-6">
//           <div className="text-center">
//             <h1 className="text-4xl font-bold text-gray-900">
//               Sistema de Inventario
//             </h1>
//             <p className="text-gray-600 mt-2">
//               Gestiona tu inventario de productos
//             </p>
//           </div>
  
//   {/* Estadísticas */}
//   <InventoryStats productos={productos} />
// </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Formulario */}
//           <div className="lg:col-span-1">
//             <ProductoForm 
//               onSuccess={handleSuccess}
//               productoToEdit={productoToEdit}
//               onCancelEdit={handleCancelEdit}
//             />
//           </div>

//           {/* Tabla */}
//           <div className="lg:col-span-2">
//             <ProductosTable 
//               productos={productos} 
//               onDelete={handleDelete}
//               onEdit={handleEdit}
//             />
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }

'use client';

import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/login-form';
import { AdminView } from '@/components/admin-view';
import { AsesorView } from '@/components/asesor-view';
import { SuperAdminView } from '@/components/superadmin-view';

export default function Home() {
  const { isAuthenticated, isAdmin, isAsesor, isSuperAdmin } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (isSuperAdmin) {
    return <SuperAdminView />;
  }

  if (isAdmin) {
    return <AdminView />;
  }

  if (isAsesor) {
    return <AsesorView />;
  }

  return null;
}