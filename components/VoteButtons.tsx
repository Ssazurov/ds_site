"use client";

import { useEffect, useState } from "react";
import { fetchCounts, myVote, saveMyVote, sendVote, type Counts } from "@/lib/votes";

function Thumb({ down }: { down?: boolean }) {
  return (
    <svg className="thumb" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={down ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M2 10h4v11H2V10zm6 11V10l4-8c1.1 0 2 .9 2 2v4h5.5c1 0 1.7.9 1.5 1.9l-1.4 8c-.2.9-1 1.6-2 1.6H8z" />
    </svg>
  );
}

export default function VoteButtons({ id, kind }: { id: string; kind: "article" | "news" }) {
  const [c, setC] = useState<Counts>({ up: 0, down: 0 });
  const [mine, setMine] = useState<1 | -1 | 0>(0);

  useEffect(() => {
    setMine(myVote(id));
    let off = false;
    fetchCounts(id).then((x) => { if (!off) setC(x); });
    return () => { off = true; };
  }, [id]);

  function vote(v: 1 | -1) {
    const next = mine === v ? 0 : v;
    setC((p) => ({
      up: p.up + (next === 1 ? 1 : 0) - (mine === 1 ? 1 : 0),
      down: p.down + (next === -1 ? 1 : 0) - (mine === -1 ? 1 : 0),
    }));
    setMine(next);
    saveMyVote(id, next);
    sendVote(id, kind, next).catch(() => {});
  }

  return (
    <span className="vote" role="group" aria-label="Оценка">
      <button type="button" className={mine === 1 ? "on" : ""} aria-pressed={mine === 1} aria-label="Полезно" onClick={() => vote(1)}><Thumb /> {c.up > 0 ? c.up : ""}</button>
      <button type="button" className={mine === -1 ? "on" : ""} aria-pressed={mine === -1} aria-label="Не полезно" onClick={() => vote(-1)}><Thumb down /> {c.down > 0 ? c.down : ""}</button>
    </span>
  );
}
