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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Power, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  createdAt: string;
  _count?: {
    productosCreados: number;
    productosEditados: number;
  };
}

interface UsuariosTableProps {
  usuarios: Usuario[];
  onEdit: (usuario: Usuario) => void;
  onToggleStatus: (id: string, activo: boolean) => void;
  onDelete: (id: string) => void;
}

export function UsuariosTable({ usuarios, onEdit, onToggleStatus, onDelete }: UsuariosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsuarios = usuarios.filter((usuario) => {
    const search = searchTerm.toLowerCase();
    return (
      usuario.nombre.toLowerCase().includes(search) ||
      usuario.email.toLowerCase().includes(search) ||
      usuario.rol.toLowerCase().includes(search)
    );
  });

  const getRolBadge = (rol: string) => {
    const roles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      superadmin: { label: 'Super Admin', variant: 'destructive' },
      admin: { label: 'Admin', variant: 'default' },
      asesor: { label: 'Asesor', variant: 'secondary' },
    };

    const roleInfo = roles[rol] || { label: rol, variant: 'outline' };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  if (usuarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            No hay usuarios registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Usuarios del Sistema ({filteredUsuarios.length})</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsuarios.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No se encontraron usuarios con &quot;{searchTerm}&quot;
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{getRolBadge(usuario.rol)}</TableCell>
                    <TableCell>
                      {usuario.activo ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Activo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Inactivo</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Creados: {usuario._count?.productosCreados || 0}</div>
                        <div className="text-gray-500">Editados: {usuario._count?.productosEditados || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(usuario.createdAt).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(usuario)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onToggleStatus(usuario.id, !usuario.activo)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {usuario.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(usuario.id)}
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
    </Card>
  );
}