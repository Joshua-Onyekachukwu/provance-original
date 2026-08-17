import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import type { CreateCrashReportsDto } from './dto/create-crash-reports.dto';

describe('TelemetryController', () => {
  const service = {
    recordErrors: jest.fn(),
  } as unknown as TelemetryService;

  const controller = new TelemetryController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates the batch to the service and returns the accepted count', async () => {
    service.recordErrors = jest.fn().mockResolvedValue({ accepted: 2 });

    const dto = {
      errors: [{ client_id: 'cr-1' }, { client_id: 'cr-2' }],
    } as unknown as CreateCrashReportsDto;

    const result = await controller.recordErrors(dto);

    expect(service.recordErrors).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accepted: 2 });
  });

  it('propagates service failures to the caller', async () => {
    service.recordErrors = jest
      .fn()
      .mockRejectedValue(new Error('Failed to record crash reports.'));

    await expect(
      controller.recordErrors({ errors: [] } as unknown as CreateCrashReportsDto),
    ).rejects.toThrow('Failed to record crash reports.');
  });
});
