"use client";

import { useEffect, useState } from "react";
import { fetchCounts, myVote, saveMyVote, sendVote, type Counts } from "@/lib/votes";

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
      <button type="button" className={mine === 1 ? "on" : ""} aria-pressed={mine === 1} aria-label="Полезно" onClick={() => vote(1)}>👍 {c.up > 0 ? c.up : ""}</button>
      <button type="button" className={mine === -1 ? "on" : ""} aria-pressed={mine === -1} aria-label="Не полезно" onClick={() => vote(-1)}>👎 {c.down > 0 ? c.down : ""}</button>
    </span>
  );
}
