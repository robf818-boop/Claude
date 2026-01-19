import { useMemo, useState, type FormEvent } from 'react';
import { AgeLevel } from '../types';
import { CalendarCheck, ClipboardList, Star } from 'lucide-react';

type DevelopmentEntry = {
  id: string;
  playerName: string;
  ageLevel: AgeLevel;
  focusArea: string;
  rating: number;
  notes: string;
  date: string;
};

const FOCUS_AREAS = [
  'Throwing Mechanics',
  'Catching Fundamentals',
  'Footwork & Agility',
  'Hitting Timing',
  'Fielding Reads',
  'Base Running',
  'Game Awareness',
];

type DevelopmentTrackerProps = {
  ageLevel: AgeLevel;
};

export function DevelopmentTracker({ ageLevel }: DevelopmentTrackerProps) {
  const [entries, setEntries] = useState<DevelopmentEntry[]>([
    {
      id: 'entry-1',
      playerName: 'Logan',
      ageLevel: '10u',
      focusArea: 'Throwing Mechanics',
      rating: 4,
      notes: 'Improved release point; keep elbow up on long throws.',
      date: '2024-03-12',
    },
    {
      id: 'entry-2',
      playerName: 'Harper',
      ageLevel: '12u',
      focusArea: 'Catching Fundamentals',
      rating: 3,
      notes: 'Solid framing. Needs quicker transfer on throws to second.',
      date: '2024-03-10',
    },
  ]);

  const [formData, setFormData] = useState({
    playerName: '',
    focusArea: FOCUS_AREAS[0],
    rating: '3',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        mostRecent: 'No sessions yet',
      };
    }

    const totalRating = entries.reduce((sum, entry) => sum + entry.rating, 0);
    const mostRecent = entries
      .map((entry) => entry.date)
      .sort()
      .slice(-1)[0];

    return {
      total: entries.length,
      averageRating: Number((totalRating / entries.length).toFixed(1)),
      mostRecent,
    };
  }, [entries]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.playerName.trim()) {
      return;
    }

    const newEntry: DevelopmentEntry = {
      id: `entry-${Date.now()}`,
      playerName: formData.playerName.trim(),
      ageLevel,
      focusArea: formData.focusArea,
      rating: Number(formData.rating),
      notes: formData.notes.trim(),
      date: formData.date,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setFormData((prev) => ({
      ...prev,
      playerName: '',
      notes: '',
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <ClipboardList size={18} />
            Sessions Logged
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Star size={18} />
            Average Rating
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.averageRating}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <CalendarCheck size={18} />
            Most Recent Session
          </div>
          <p className="mt-2 text-lg font-semibold text-amber-900">{stats.mostRecent}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Log a Development Session</h3>
          <p className="mt-1 text-sm text-gray-600">
            Capture what each athlete worked on and a quick coaching note.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium text-gray-700">
              Player Name
              <input
                type="text"
                value={formData.playerName}
                onChange={(event) => setFormData((prev) => ({ ...prev, playerName: event.target.value }))}
                placeholder="Add a player name"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Focus Area
              <select
                value={formData.focusArea}
                onChange={(event) => setFormData((prev) => ({ ...prev, focusArea: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {FOCUS_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Session Rating
                <select
                  value={formData.rating}
                  onChange={(event) => setFormData((prev) => ({ ...prev, rating: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Session Date
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>

            <label className="text-sm font-medium text-gray-700">
              Coach Notes
              <textarea
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="What improved? What is the next focus?"
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Save Session
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Development Notes</h3>
              <p className="text-sm text-gray-600">Newest sessions appear first.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Age Level: {ageLevel.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{entry.playerName}</p>
                    <p className="text-xs text-gray-500">
                      {entry.focusArea} • Rating {entry.rating}/5
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{entry.date}</span>
                </div>
                {entry.notes && (
                  <p className="mt-2 text-sm text-gray-600">{entry.notes}</p>
                )}
              </div>
            ))}
            {entries.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                Start logging sessions to build a player development history.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
