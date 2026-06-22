import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { API_BASE } from "../config";
import AppConfirm from "./AppConfirm";
import "flag-icons/css/flag-icons.min.css";

export type FollowTab = "followers" | "following";

type Props = {
  username: string;
  initialTab: FollowTab;
  token?: string;
  currentUsername?: string | null;
  onClose: () => void;
  onViewUser: (username: string) => void;
  onFollowChanged?: () => void;
};

type UserRow = {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  countryCode: string | null;
  followersCount: number;
  isFollowing: boolean | null;
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const PAGE_SIZE = 20;

export default function FollowListModal({ username, initialTab, token, currentUsername, onClose, onViewUser, onFollowChanged }: Props) {
  const [activeTab, setActiveTab] = useState<FollowTab>(initialTab);
  const [rows,      setRows]      = useState<UserRow[]>([]);
  const [page,      setPage]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [followState,     setFollowState]     = useState<Record<string, boolean | null>>({});
  const [unfollowConfirm, setUnfollowConfirm] = useState<string | null>(null);

  const loadPage = useCallback(async (tab: FollowTab, nextPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const url = `${API_BASE}/api/users/${encodeURIComponent(username)}/${tab}?page=${nextPage}&size=${PAGE_SIZE}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as SpringPage<UserRow>;
      setRows(prev => append ? [...prev, ...data.content] : data.content);
      setPage(data.number);
      setTotalPages(data.totalPages);
      setTotal(data.totalElements);
      setFollowState(prev => {
        const next = { ...prev };
        data.content.forEach(u => { if (!(u.username in next)) next[u.username] = u.isFollowing; });
        return next;
      });
    } catch {
      setError("No se pudo cargar la lista");
      if (!append) setRows([]);
    } finally {
      setLoading(false);
    }
  }, [username, token]);

  useEffect(() => {
    loadPage(activeTab, 0, false);
  }, [activeTab, loadPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !unfollowConfirm) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, unfollowConfirm]);

  const handleFollow = async (uname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/users/${uname}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFollowState(prev => ({ ...prev, [uname]: true }));
      onFollowChanged?.();
    }
  };

  const handleUnfollow = async (uname: string) => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/users/${uname}/follow`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFollowState(prev => ({ ...prev, [uname]: false }));
      setUnfollowConfirm(null);
      onFollowChanged?.();
    }
  };

  const handleViewUser = (uname: string) => {
    onClose();
    onViewUser(uname);
  };

  const hasMore = page + 1 < totalPages;

  return (
    <>
      <div
        className="search-overlay-backdrop"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="search-overlay-panel follow-modal" role="dialog" aria-modal aria-label="Followers list">

          <div className="search-overlay-bar follow-modal-bar">
            <button className="search-back-btn" onClick={onClose} aria-label="Cerrar">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div className="follow-modal-title">
              <p className="follow-modal-username">@{username}</p>
              <p className="follow-modal-count">{total} {total === 1 ? "usuario" : "usuarios"}</p>
            </div>
          </div>

          <div className="search-tabs">
            <button
              className={`search-tab${activeTab === "followers" ? " active" : ""}`}
              onClick={() => setActiveTab("followers")}
            >
              Seguidores
            </button>
            <button
              className={`search-tab${activeTab === "following" ? " active" : ""}`}
              onClick={() => setActiveTab("following")}
            >
              Siguiendo
            </button>
          </div>

          <div className="follow-modal-body">
            {error && <p className="follow-modal-error">{error}</p>}

            {!error && rows.length === 0 && !loading && (
              <p className="follow-modal-empty">
                {activeTab === "followers"
                  ? "Todavía no tiene seguidores."
                  : "Todavía no sigue a nadie."}
              </p>
            )}

            {rows.length > 0 && (
              <ul className="search-results-list">
                {rows.map((u) => {
                  const initials = u.username.slice(0, 2).toUpperCase();
                  const isSelf = currentUsername === u.username;
                  const isFollowing = followState[u.username] ?? u.isFollowing;
                  return (
                    <li
                      key={u.username}
                      className="search-user-row"
                      onClick={() => handleViewUser(u.username)}
                    >
                      <div className="search-user-avatar">
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt={u.username} />
                          : initials}
                      </div>
                      <div className="search-user-info">
                        <p className="search-user-name">@{u.username}</p>
                        <p className="search-user-meta">
                          {u.countryCode && (
                            <>
                              <span className={`fi fi-${u.countryCode.toLowerCase()}`} style={{ borderRadius: "2px" }} />
                              {" · "}
                            </>
                          )}
                          {u.followersCount} {u.followersCount === 1 ? "seguidor" : "seguidores"}
                        </p>
                      </div>
                      {token && !isSelf && (
                        <button
                          className={`follow-btn-inline${isFollowing ? " is-following" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            isFollowing
                              ? setUnfollowConfirm(u.username)
                              : handleFollow(u.username, e);
                          }}
                        >
                          {isFollowing ? "Siguiendo" : "Seguir"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {hasMore && (
              <button
                className="follow-modal-more"
                onClick={() => loadPage(activeTab, page + 1, true)}
                disabled={loading}
              >
                {loading ? "Cargando…" : "Ver más"}
              </button>
            )}

            {loading && rows.length === 0 && (
              <p className="follow-modal-empty">Cargando…</p>
            )}
          </div>

        </div>
      </div>

      {unfollowConfirm && (
        <AppConfirm
          message={`¿Dejar de seguir a @${unfollowConfirm}?`}
          confirmLabel="Dejar de seguir"
          danger
          onConfirm={() => handleUnfollow(unfollowConfirm)}
          onCancel={() => setUnfollowConfirm(null)}
        />
      )}
    </>
  );
}
