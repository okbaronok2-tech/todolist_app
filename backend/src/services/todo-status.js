// ST-01~04 상태 판정 순수 함수. 날짜는 YYYY-MM-DD 문자열 비교 (도메인 4.1·4.2)
export const STATUS = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
});

export function todoStatus({ isCompleted, startDate, endDate }, today) {
  if (isCompleted) return STATUS.COMPLETED; // ST-01
  if (today > endDate) return STATUS.OVERDUE; // ST-02
  if (today < startDate) return STATUS.NOT_STARTED; // ST-03
  return STATUS.IN_PROGRESS; // ST-04
}
