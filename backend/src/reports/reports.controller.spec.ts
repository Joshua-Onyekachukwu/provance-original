import { StreamableFile } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: { getReportPdf: jest.Mock; getReport: jest.Mock; listReports: jest.Mock };

  beforeEach(() => {
    service = {
      getReportPdf: jest.fn(),
      getReport: jest.fn(),
      listReports: jest.fn(),
    };
    controller = new ReportsController(service as unknown as ReportsService);
  });

  it('streams the generated PDF with attachment disposition headers', async () => {
    const pdf = Buffer.from('%PDF-1.3\nmock pdf body');
    service.getReportPdf.mockResolvedValue(pdf);

    const res = { set: jest.fn() };
    const user = { id: 'user-1' };

    const result = await controller.exportReportPdf(
      user as never,
      'scan-1',
      res as never,
    );

    expect(service.getReportPdf).toHaveBeenCalledWith('user-1', 'scan-1');
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.length),
      'Content-Disposition': 'attachment; filename="provance-report-scan-1.pdf"',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('propagates service errors (report not ready / not found)', async () => {
    service.getReportPdf.mockRejectedValue(new Error('Report is not ready yet.'));

    await expect(
      controller.exportReportPdf(
        { id: 'user-1' } as never,
        'scan-1',
        { set: jest.fn() } as never,
      ),
    ).rejects.toThrow('Report is not ready yet.');
  });
});
