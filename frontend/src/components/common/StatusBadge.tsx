// CP-04 상태 배지. 글자로 구분, 색은 보조 (스타일 가이드 3.6)
import type { TodoStatus } from '../../types/todo';
import { statusLabel, statusModifier, statusShort } from '../../lib/status';

export function StatusBadge({ status, compact = false }: { status: TodoStatus; compact?: boolean }) {
  return (
    <span className={`badge badge--${statusModifier(status)}${compact ? ' badge--short' : ''}`} title={compact ? statusLabel(status) : undefined}>
      {compact ? statusShort(status) : statusLabel(status)}
    </span>
  );
}
