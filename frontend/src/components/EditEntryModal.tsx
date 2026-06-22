import { useEffect, useState } from "react";
import { Globe, Heart, Lock, LockKeyhole, Trash2, X } from "lucide-react";
import {
  GAME_STATUS_META,
  GAME_STATUS_ORDER,
  type GameStatus,
} from "../lib/gameStatus";
import { PLATFORMS, findPlatform } from "../lib/platforms";
import type { EntryDraft, GameEntry } from "../types/library";
import { API_BASE } from "../config";

export type { EntryDraft } from "../types/library";

export type GameInfo = {
  rawgGameId: number;
  title: string;
  coverUrl?: string | null;
  releasedAt?: string | null;
  genres?: string[];
};

type EditProps = {
  mode?: "edit";
  entry: GameEntry;
  onSave: (draft: EntryDraft) => Promise<void>;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
};

type AddProps = {
  mode: "add";
  game: GameInfo;
  token: string;
  onAdded?: () => void;
  onClose: () => void;
  onSessionExpired?: () => void;
};

type Props = EditProps | AddProps;

type FaceKey = "none" | "terrible" | "bad" | "mediocre" | "good" | "great" | "masterpiece";

function getFaceKey(score: string): FaceKey {
  if (score.trim() === "") return "none";
  const n = parseFloat(score);
  if (isNaN(n))       return "none";
  if (n < 3)          return "terrible";
  if (n < 5)          return "bad";
  if (n < 6.5)        return "mediocre";
  if (n < 7.5)        return "good";
  if (n < 9)          return "great";
  return "masterpiece";
}

const SCORE_GRADIENT = "linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 72%, #22c55e 100%)";

function ScoreSlider({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [localVal, setLocalVal] = useState(() =>
    value === "" ? 0 : parseFloat(value)
  );

  useEffect(() => {
    setLocalVal(value === "" ? 0 : parseFloat(value));
  }, [value]);

  const hasValue = localVal > 0;
  const faceKey  = getFaceKey(hasValue ? localVal.toFixed(1) : "");
  const pct      = (localVal / 10) * 100;

  const handleRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setLocalVal(v);
    onChange(v === 0 ? "" : v.toFixed(1));
  };

  return (
    <div className="score-slider-wrap">
      <img
        src={`/faces/face-${faceKey}.png`}
        alt={faceKey}
        className="score-face"
      />
      <div className="score-slider-right">
        <span className={`score-display${!hasValue ? " score-display--ns" : ""}`}>
          {hasValue ? localVal.toFixed(1) : "NS"}
        </span>

        <div className="score-track-container">
          <div className="score-track-gradient" style={{ background: SCORE_GRADIENT }} />
          <div className="score-track-mask" style={{ left: `${pct}%` }} />
          <div className="score-thumb" style={{ left: `${pct}%` }} />
          <input
            type="range"
            className="score-range-hidden"
            min={0}
            max={10}
            step={0.1}
            value={localVal}
            onChange={handleRange}
            disabled={disabled}
          />
        </div>

        <div className="score-range-labels">
          <span>NS</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

export default function EditEntryModal(props: Props) {
  const isAdd = props.mode === "add";

  const displayTitle   = isAdd ? props.game.title      : props.entry.title;
  const displayCover   = isAdd ? props.game.coverUrl   : props.entry.coverUrl;
  const displayRelease = isAdd ? props.game.releasedAt : props.entry.releasedAt;
  const displayGenres  = isAdd ? (props.game.genres ?? []) : props.entry.genres;

  const [status,        setStatus]        = useState<GameStatus>(
    isAdd ? "PLAN_TO_PLAY" : props.entry.status
  );
  const [score,         setScore]         = useState<string>(
    isAdd ? "" : (props.entry.score != null ? String(props.entry.score) : "")
  );
  const [progressHours, setProgressHours] = useState<string>(
    isAdd ? "" : (props.entry.progressHours != null ? String(props.entry.progressHours) : "")
  );
  const [platformKey,   setPlatformKey]   = useState<string | null>(
    isAdd ? null : (findPlatform(props.entry.platformNote)?.key ?? null)
  );
  const [isFavorite,    setIsFavorite]    = useState<boolean>(
    isAdd ? false : !!props.entry.isFavorite
  );
  const [notePrivate,  setNotePrivate]  = useState<string>(
    isAdd ? "" : (props.entry.notePrivate ?? "")
  );
  const [notePublic,   setNotePublic]   = useState<string>(
    isAdd ? "" : (props.entry.notePublic ?? "")
  );
  const [notesTab,     setNotesTab]     = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const isPending = status === "PLAN_TO_PLAY";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) props.onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose, saving]);

  const sanitizeDecimal = (value: string, decimals: number) => {
    if (value === "") return "";
    let v = value.replace(",", ".");
    v = v.replace(/[^0-9.]/g, "");
    const firstDot = v.indexOf(".");
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
      v = v.slice(0, firstDot + 1 + decimals);
    }
    return v;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsedScore = score.trim() === "" ? null : Number(score.replace(",", "."));
      const parsedHours = progressHours.trim() === "" ? null : Number(progressHours.replace(",", "."));
      if (parsedScore !== null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10)) {
        throw new Error("La puntuación debe estar entre 0 y 10");
      }
      if (parsedHours !== null && (Number.isNaN(parsedHours) || parsedHours < 0)) {
        throw new Error("Las horas deben ser un número positivo");
      }
      const platformNote = platformKey
        ? (PLATFORMS.find(p => p.key === platformKey)?.short ?? null)
        : null;

      const draft: EntryDraft = {
        status,
        score:         parsedScore,
        progressHours: parsedHours,
        platformNote,
        isFavorite,
        notePrivate,
        notePublic,
      };

      if (isAdd) {
        const res = await fetch(`${API_BASE}/api/me/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${props.token}` },
          body: JSON.stringify({ rawgGameId: props.game.rawgGameId, ...draft }),
        });
        if (res.status === 401 || res.status === 403) { props.onSessionExpired?.(); return; }
        if (!res.ok && res.status !== 409) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { message?: string }).message ?? "No se pudo guardar. Inténtalo de nuevo.");
        }
        props.onAdded?.();
        props.onClose();
      } else {
        await props.onSave(draft);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) props.onClose(); }}>
      <div className="edit-modal entry-modal glass">

        <div className="entry-modal-header">
          {displayCover && <img className="entry-modal-cover" src={displayCover} alt={displayTitle} />}
          <div className="entry-modal-titles">
            <h2 className="edit-modal-title">{displayTitle}</h2>
            {displayRelease && (
              <p className="entry-modal-sub">
                {displayRelease.slice(0, 4)}
                {displayGenres.length > 0 && ` · ${displayGenres.join(", ")}`}
              </p>
            )}
          </div>
        </div>

        <div className="edit-field">
          <label className="edit-label">Estado</label>
          <div className="status-chips">
            {GAME_STATUS_ORDER.map(s => {
              const meta = GAME_STATUS_META[s];
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={`status-chip${active ? " is-active" : ""}`}
                  onClick={() => {
                    setStatus(s);
                    if (s === "PLAN_TO_PLAY") {
                      setScore("");
                      setProgressHours("");
                    }
                  }}
                  disabled={saving}
                  style={active ? { borderColor: meta.color, color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` } : undefined}
                >
                  <span className="status-chip-emoji" aria-hidden>{meta.emoji}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`edit-field${isPending ? " edit-field--locked" : ""}`}>
          <label className="edit-label">
            Puntuación
            {isPending && <LockKeyhole size={12} strokeWidth={2.5} className="edit-label-lock" />}
          </label>
          <ScoreSlider value={score} onChange={setScore} disabled={saving || isPending} />
        </div>

        <div className={`edit-field${isPending ? " edit-field--locked" : ""}`}>
          <label className="edit-label">
            Horas jugadas
            {isPending && <LockKeyhole size={12} strokeWidth={2.5} className="edit-label-lock" />}
          </label>
          <input
            className="edit-input no-spinner"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={progressHours}
            onChange={e => setProgressHours(sanitizeDecimal(e.target.value, 1))}
            disabled={saving || isPending}
          />
        </div>

        <div className="edit-field">
          <label className="edit-label">Plataforma</label>
          <div className="platform-chips">
            {PLATFORMS.map(p => {
              const active = platformKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`platform-chip${active ? " is-active" : ""}`}
                  onClick={() => setPlatformKey(active ? null : p.key)}
                  disabled={saving}
                  style={active ? { borderColor: p.color, color: p.color, background: `color-mix(in srgb, ${p.color} 14%, transparent)` } : undefined}
                  title={p.label}
                >
                  <span className="platform-chip-icon" style={{ color: p.color }}>{p.icon}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="edit-field">
          <div className="notes-label-row">
            <label className="edit-label">Notas</label>
            <div className="notes-visibility">
              <button
                type="button"
                className={`notes-vis-btn${notesTab === "PRIVATE" ? " is-active" : ""}`}
                onClick={() => setNotesTab("PRIVATE")}
                disabled={saving}
                title="Sólo tú la verás"
              >
                <Lock size={12} /> Privada
              </button>
              <button
                type="button"
                className={`notes-vis-btn${notesTab === "PUBLIC" ? " is-active" : ""}`}
                onClick={() => setNotesTab("PUBLIC")}
                disabled={saving}
                title="Visible en tu biblioteca"
              >
                <Globe size={12} /> Pública
              </button>
            </div>
          </div>
          <div className="notes-textarea-wrap">
            {(() => {
              const isPrivate = notesTab === "PRIVATE";
              const value     = isPrivate ? notePrivate : notePublic;
              const setValue  = isPrivate ? setNotePrivate : setNotePublic;
              const label     = isPrivate ? "privada" : "pública";
              const placeholder = isPrivate ? "Solo tú la verás…" : "Visible en tu biblioteca…";
              return (
                <>
                  <textarea
                    className="edit-input edit-textarea"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    disabled={saving}
                  />
                  {value.trim().length > 0 && (
                    <button type="button" className="notes-clear-btn" onClick={() => setValue("")}
                      disabled={saving} title="Borrar" aria-label={`Borrar nota ${label}`}>
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <button
          type="button"
          className={`entry-fav-toggle${isFavorite ? " is-active" : ""}`}
          onClick={() => setIsFavorite(v => !v)}
          disabled={saving}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          {isFavorite ? "Marcado como favorito" : "Marcar como favorito"}
        </button>

        {error && <p className="edit-error">{error}</p>}

        <div className="entry-modal-actions">
          {!isAdd && (
            <button
              type="button"
              className="entry-delete-btn"
              onClick={() => (props as EditProps).onDelete()}
              disabled={saving}
              title="Quitar de la biblioteca"
            >
              <Trash2 size={15} /> Eliminar
            </button>
          )}
          <div className={`entry-modal-actions-right${isAdd ? " entry-modal-actions-center" : ""}`}>
            <button className="edit-cancel-btn" onClick={props.onClose} disabled={saving}>Cancelar</button>
            <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : isAdd ? "Añadir" : "Guardar"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
