"use client";

interface Bookmark {
  id: string;
  name: string;
  createdAt: string;
}

interface Props {
  isDark: boolean;
  bookmarks: Bookmark[];
}

export default function BookmarksSection({ isDark, bookmarks }: Props) {
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const rowBg = isDark ? "bg-slate-800/50" : "bg-gray-100";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-semibold ${heading}`}>Save Queries</h3>
        <span className={`text-sm tabular-nums ${muted}`}>{bookmarks.length}</span>
      </div>

      {bookmarks.length === 0 ? (
        <p className={`text-sm italic ${muted} py-12 text-center`}>
          Don't have any saved queries go to Manual SPARQL mode and click Save
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((b) => (
            <li key={b.id} className={`px-4 py-3 rounded-lg ${rowBg}`}>
              <div className={`text-sm font-medium ${subtle}`}>{b.name}</div>
              <div className={`text-xs mt-0.5 ${muted}`}>
                {new Date(b.createdAt).toLocaleDateString("en-GB")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
