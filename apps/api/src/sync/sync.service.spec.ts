import { SyncService } from './sync.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException } from '@nestjs/common';

describe('SyncService - Security & Tenant Binding', () => {
  let service: SyncService;
  let mockDbService: jest.Mocked<Partial<DatabaseService>>;
  let mockClientQuery: jest.Mock;

  const orgA = 'org-tenant-a';
  const orgB = 'org-tenant-b';

  beforeEach(() => {
    mockClientQuery = jest.fn();

    mockDbService = {
      withTenant: jest.fn().mockImplementation(async (orgId, callback) => {
        expect(orgId).toBe(orgA); // Always called with authenticated tenant
        return callback({ query: mockClientQuery } as any);
      }),
    };

    service = new SyncService(mockDbService as DatabaseService);
  });

  describe('push', () => {
    it('debe rechazar colecciones que no estén en la lista blanca contra inyección SQL', async () => {
      await expect(
        service.push(orgA, 'users; DROP TABLE users;--', [])
      ).rejects.toThrow(BadRequestException);
    });

    it('fuerza siempre organization_id al tenant autenticado (previene spoofing de Org B)', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const spoofedWrite = {
        id: 'client-1',
        organization_id: orgB, // Intento de inyectar en Org B
        full_name: 'Cliente Malicioso',
      };

      const result = await service.push(orgA, 'clients', [spoofedWrite]);

      expect(result.accepted).toContain('client-1');

      // Verificar la query ejecutada
      const queryCall = mockClientQuery.mock.calls[0];
      const params = queryCall[1];

      // El parámetro organization_id enviado a la BD debe ser orgA, no orgB
      expect(params).toContain(orgA);
      expect(params).not.toContain(orgB);
    });
  });

  describe('pull', () => {
    it('enmascara teléfonos para rol EMPLOYEE', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 'c1', full_name: 'Ana', phone_whatsapp: '+593987654321', updated_at: '2026-01-01' },
        ],
      });

      const result = await service.pull(orgA, 'EMPLOYEE', 'clients', null, 10);

      expect(result.documents[0].phone_whatsapp).toBe('***321');
    });

    it('mantiene el teléfono sin enmascarar para rol OWNER_ADMIN', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 'c1', full_name: 'Ana', phone_whatsapp: '+593987654321', updated_at: '2026-01-01' },
        ],
      });

      const result = await service.pull(orgA, 'OWNER_ADMIN', 'clients', null, 10);

      expect(result.documents[0].phone_whatsapp).toBe('+593987654321');
    });
  });
});
