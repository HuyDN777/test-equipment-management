import { ReportsService } from './reports.service';

describe('ReportsService calibration due', () => {
  it('chỉ lấy lần hiệu chuẩn đạt mới nhất, chưa xử lý và trong khoảng cần nhắc', async () => {
    const query: any = {
      innerJoinAndSelect: jest.fn(), leftJoinAndSelect: jest.fn(), where: jest.fn(),
      andWhere: jest.fn(), orderBy: jest.fn(), getMany: jest.fn().mockResolvedValue([]),
    };
    for (const method of ['innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy']) {
      query[method].mockReturnValue(query);
    }
    const calibrationRepository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new ReportsService({} as any, calibrationRepository as any, {} as any, {} as any, {} as any);

    await service.getCalibrationDueDevices(30, new Date('2026-09-20T18:00:00.000Z'), 30);

    expect(query.where).toHaveBeenCalledWith('calib.next_due_date <= :futureDate', { futureDate: '2026-10-21' });
    expect(query.andWhere).toHaveBeenCalledWith('calib.next_due_date >= :oldestDate', { oldestDate: '2026-08-22' });
    expect(query.andWhere.mock.calls.some(([clause]: [string]) => clause.includes('latest.id'))).toBe(true);
    expect(query.andWhere.mock.calls.some(([clause]: [string]) => clause.includes('active.status'))).toBe(true);
  });
});
