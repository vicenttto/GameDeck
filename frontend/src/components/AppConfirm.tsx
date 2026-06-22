export type ConfirmState = {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

type AppConfirmProps = ConfirmState & {
  cancelLabel?: string;
  onCancel: () => void;
};

export default function AppConfirm({
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: AppConfirmProps) {
  return (
    <div className="appc-overlay" onClick={onCancel}>
      <div className="appc-modal" onClick={e => e.stopPropagation()}>
        <p className="appc-message">{message}</p>
        <div className="appc-actions">
          <button className="appc-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`appc-confirm${danger ? " appc-confirm--danger" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
