import { ConfigService } from '@nestjs/config';
import { MidtransService } from './midtrans.service';

function createConfig(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('MidtransService mock-mode policy', () => {
  it('allows placeholder-key mock mode in development', () => {
    const service = new MidtransService(
      createConfig({
        NODE_ENV: 'development',
        MIDTRANS_SERVER_KEY: 'your_midtrans_server_key',
      }),
    );

    expect(service.isMockMode()).toBe(true);
  });

  it('never allows placeholder-key mock mode in production', () => {
    const service = new MidtransService(
      createConfig({
        NODE_ENV: 'production',
        MIDTRANS_SERVER_KEY: 'your_midtrans_server_key',
      }),
    );

    expect(service.isMockMode()).toBe(false);
  });
});
