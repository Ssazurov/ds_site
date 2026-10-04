// components/TagChips.tsx — чипы тегов на карточке (ds_site#138, ADR-0028 п.6).
// Клик ведёт на тот же раздел с ?tag=<тег>.

import Link from "next/link";

type Props = { tags: string[]; basePath: string };

export default function TagChips({ tags, basePath }: Props) {
  if (!tags.length) return null;
  return (
    <div className="tag-chips">
      {tags.map((t) => (
        <Link key={t} className="tag tag-chip" href={`${basePath}?tag=${encodeURIComponent(t)}`}>
          #{t}
        </Link>
      ))}
    </div>
  );
}
