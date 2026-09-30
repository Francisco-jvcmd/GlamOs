import { useCollection } from '../hooks/useCollection';
import { Card } from '../components/ui/Card';
import { maskPhone } from '../lib/utils';
import { Cake } from 'lucide-react';

export function ClientsPage() {
  const { docs: clients, loading } = useCollection('clients');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>

      {loading ? (
        <div>Cargando...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
          Aún no hay clientes registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <Card key={client.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{client.phone ? maskPhone(client.phone) : 'Sin teléfono'}</p>
                </div>
                {client.birth_date && (
                  <div className="bg-rose-50 p-2 rounded-full text-rose-500" title="Tiene fecha de nacimiento">
                    <Cake className="w-4 h-4" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
