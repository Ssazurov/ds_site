"use client";

import type { Schema } from "@/lib/cabinet-clients";

type Values = Record<string, unknown>;

// Простая форма по JSON Schema: boolean / enum / integer / number / string.
export default function SchemaForm({ schema, values, onChange }: { schema: Schema; values: Values; onChange: (v: Values) => void }) {
  const props = Object.entries(schema.properties ?? {});
  if (!props.length) return <p>У этой игры нет настроек.</p>;
  const set = (k: string, v: unknown) => onChange({ ...values, [k]: v });
  return (
    <div className="flex flex-col gap-3">
      {props.map(([key, p]) => {
        const label = p.title || key;
        const val = values[key] ?? p.default;
        if (p.type === "boolean")
          return (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(val)} onChange={(e) => set(key, e.target.checked)} />
              {label}
            </label>
          );
        if (p.enum)
          return (
            <label key={key} className="flex flex-col gap-1">
              {label}
              <select className="rounded border px-3 py-2" value={String(val ?? "")} onChange={(e) => set(key, e.target.value)}>
                {p.enum.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          );
        const num = p.type === "integer" || p.type === "number";
        return (
          <label key={key} className="flex flex-col gap-1">
            {label}
            <input
              className="rounded border px-3 py-2"
              type={num ? "number" : "text"}
              min={p.minimum}
              max={p.maximum}
              value={val === undefined || val === null ? "" : String(val)}
              onChange={(e) => set(key, num ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
