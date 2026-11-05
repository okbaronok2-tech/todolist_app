// WF-05 캘린더 (SC-05). 뷰·anchorDate는 스토어, 조회는 BR-35 범위 + today, 필터 없음 (BR-36)
import { useNavigate } from 'react-router';
import { useAppStore } from '../stores/app-store';
import { useCategories } from '../queries/use-categories';
import { useTodoRange } from '../queries/use-todos';
import { mmdd, todayLocal, weekdayLabel, yyyymm } from '../lib/date';
import { move, range } from '../lib/calendar-range';
import { errorText } from '../lib/error-text';
import type { CalendarView, Todo } from '../types/todo';
import { TopNav } from '../components/common/TopNav';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: '월' },
  { key: 'week', label: '주' },
  { key: 'day', label: '일' },
];

export function CalendarPage() {
  const today = todayLocal();
  const { view, anchorDate } = useAppStore((s) => s.calendar);
  const setCalendar = useAppStore((s) => s.setCalendar);
  const navigate = useNavigate();
  const { from, to } = range(view, anchorDate);
  const todos = useTodoRange(from, to, today);
  const categories = useCategories();
  const categoryName = (id: number) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const onSelect = (t: Todo) => navigate(`/todos/${t.id}/edit`);

  const label = view === 'month' ? yyyymm(anchorDate) : view === 'week' ? `${mmdd(from)} ~ ${mmdd(to)}` : `${mmdd(anchorDate)}(${weekdayLabel(anchorDate)})`;

  return (
    <>
      <TopNav />
      <main className="page">
        <h1 className="page-title">캘린더</h1>
        <div className="cal__toolbar">
          <div className="btn-group">
            <button type="button" className="btn" onClick={() => setCalendar({ anchorDate: move(view, anchorDate, -1) })}>
              이전
            </button>
            <button type="button" className="btn" onClick={() => setCalendar({ anchorDate: today })}>
              오늘
            </button>
            <button type="button" className="btn" onClick={() => setCalendar({ anchorDate: move(view, anchorDate, 1) })}>
              다음
            </button>
          </div>
          <span className="cal__range">{label}</span>
          <div className="btn-group cal__views" role="group" aria-label="뷰 전환">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" className={`btn${view === v.key ? ' btn--primary' : ''}`} aria-pressed={view === v.key} onClick={() => setCalendar({ view: v.key })}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <ErrorMessage message={todos.error ? errorText(todos.error) : null} />
        {todos.isPending ? (
          <p className="loading">불러오는 중...</p>
        ) : view === 'month' ? (
          <MonthView anchorDate={anchorDate} today={today} todos={todos.data ?? []} onSelect={onSelect} />
        ) : view === 'week' ? (
          <WeekView from={from} to={to} today={today} todos={todos.data ?? []} onSelect={onSelect} />
        ) : (
          <DayView date={anchorDate} today={today} todos={todos.data ?? []} categoryName={categoryName} onSelect={onSelect} />
        )}
      </main>
    </>
  );
}
