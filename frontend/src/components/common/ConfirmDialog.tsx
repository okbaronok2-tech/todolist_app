// CP-03 확인 대화상자. 열리면 [취소]에 포커스, Esc로 닫힘, 닫히면 연 요소로 포커스 복귀 (스타일 가이드 3.5, 5장)
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, busy = false, danger = true, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="dialog__backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        <p className="dialog__message">{message}</p>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger-fill' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
