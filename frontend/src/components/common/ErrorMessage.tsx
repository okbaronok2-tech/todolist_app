// CP-02 오류 메시지 영역. message가 비면 렌더하지 않는다
export function ErrorMessage({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="alert" role="alert">
      {message}
    </div>
  );
}
