import { DatabaseService } from './database.service';
import { Pool, PoolClient } from 'pg';

describe('DatabaseService - Multi-Tenant withTenant Transaction Protocol', () => {
  let service: DatabaseService;
  let mockClient: jest.Mocked<Partial<PoolClient>>;
  let mockPool: jest.Mocked<Partial<Pool>>;
  let queryLog: string[];

  beforeEach(() => {
    queryLog = [];

    mockClient = {
      query: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        queryLog.push(typeof sql === 'string' ? sql : (sql as any).text);
        if (sql.includes('set_config')) {
          // Verify that is_local is strictly true ($1=org, true)
          expect(params?.[0]).toBe('test-org-123');
        }
        return { rows: [], rowCount: 0 } as any;
      }),
      release: jest.fn().mockImplementation(() => {
        queryLog.push('CLIENT_RELEASED');
      }),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient as PoolClient),
      query: jest.fn(),
      end: jest.fn(),
    };

    service = new DatabaseService();
    // @ts-ignore
    service['pool'] = mockPool as Pool;
  });

  it('debe ejecutar la secuencia estricta: BEGIN -> set_config(local) -> SET LOCAL ROLE glamos_app -> callback -> COMMIT -> RESET ROLE -> release', async () => {
    const orgId = 'test-org-123';
    let callbackExecuted = false;

    const result = await service.withTenant(orgId, async (client) => {
      callbackExecuted = true;
      await client.query('SELECT * FROM clients');
      return 'OK';
    });

    expect(result).toBe('OK');
    expect(callbackExecuted).toBe(true);

    // Validar el orden exacto de comandos emitidos
    expect(queryLog).toEqual([
      'BEGIN',
      "SELECT set_config('app.current_organization_id', $1, true)",
      'SET LOCAL ROLE glamos_app',
      'SELECT * FROM clients',
      'COMMIT',
      'RESET ROLE',
      'CLIENT_RELEASED',
    ]);

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('debe ejecutar ROLLBACK -> RESET ROLE -> release si el callback falla', async () => {
    const orgId = 'test-org-123';

    await expect(
      service.withTenant(orgId, async (client) => {
        await client.query('SELECT * FROM sales');
        throw new Error('Database error or RLS policy violation');
      })
    ).rejects.toThrow('Database error or RLS policy violation');

    // Validar secuencia en caso de error
    expect(queryLog).toEqual([
      'BEGIN',
      "SELECT set_config('app.current_organization_id', $1, true)",
      'SET LOCAL ROLE glamos_app',
      'SELECT * FROM sales',
      'ROLLBACK',
      'RESET ROLE',
      'CLIENT_RELEASED',
    ]);

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('garantiza que set_config utiliza el parámetro local (is_local = true) para prevenir fuga entre requests pooled', async () => {
    const orgId = 'test-org-123';

    await service.withTenant(orgId, async () => 'done');

    const setConfigCall = (mockClient.query as jest.Mock).mock.calls.find((call) =>
      call[0].includes('set_config')
    );

    expect(setConfigCall).toBeDefined();
    // Parámetro 1: nombre del setting 'app.current_organization_id'
    // Parámetro 2: $1 (orgId)
    // Parámetro 3: true (LOCAL a la transacción actual)
    expect(setConfigCall[0]).toContain("SELECT set_config('app.current_organization_id', $1, true)");
    expect(setConfigCall[1]).toEqual([orgId]);
  });
});
