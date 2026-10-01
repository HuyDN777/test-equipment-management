import { addCalendarDays, calendarDate, daysBetweenDates } from './calendar-date';

describe('calendar-date', () => {
  it('tính ngày theo múi giờ ứng dụng và không bị lệch bởi UTC', () => {
    expect(calendarDate(new Date('2026-09-20T18:00:00.000Z'), 'Asia/Bangkok')).toBe('2026-09-21');
    expect(addCalendarDays('2026-09-21', 30)).toBe('2026-10-21');
    expect(daysBetweenDates('2026-09-21', '2026-09-20')).toBe(-1);
  });
});
