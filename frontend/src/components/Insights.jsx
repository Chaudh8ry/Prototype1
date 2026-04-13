import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart2, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { analysisAPI } from '../services/api';

const ratingOrder = ['Healthy', 'Moderately Healthy', 'Unhealthy'];

const formatDay = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const nutrientLabels = {
  sugar_g: 'Sugar',
  sodium_mg: 'Sodium',
  protein_g: 'Protein',
  fiber_g: 'Fiber',
};

const scoreBandTone = (score) => {
  if (score >= 75) return 'text-[#166534] bg-[#eaf8ea]';
  if (score >= 45) return 'text-[#92400e] bg-[#fff4d8]';
  return 'text-[#b91c1c] bg-[#fee2e2]';
};

const getNutrientStatus = (key, value) => {
  if (key === 'sugar_g') {
    if (value <= 5) {
      return {
        label: 'Low',
        tone: 'bg-[#eaf8ea] text-[#166534]',
        helper: 'Generally a lighter sugar average.',
      };
    }
    if (value <= 12) {
      return {
        label: 'Moderate',
        tone: 'bg-[#fff4d8] text-[#92400e]',
        helper: 'Worth keeping an eye on.',
      };
    }
    return {
      label: 'High',
      tone: 'bg-[#fee2e2] text-[#b91c1c]',
      helper: 'Sugar may add up quickly across scans.',
    };
  }

  if (key === 'sodium_mg') {
    if (value <= 140) {
      return {
        label: 'Low',
        tone: 'bg-[#eaf8ea] text-[#166534]',
        helper: 'A lighter sodium pattern overall.',
      };
    }
    if (value <= 300) {
      return {
        label: 'Moderate',
        tone: 'bg-[#fff4d8] text-[#92400e]',
        helper: 'Reasonable, but can build up over the day.',
      };
    }
    return {
      label: 'High',
      tone: 'bg-[#fee2e2] text-[#b91c1c]',
      helper: 'Sodium is one of your bigger watchouts.',
    };
  }

  if (key === 'protein_g') {
    if (value < 5) {
      return {
        label: 'Low',
        tone: 'bg-[#fee2e2] text-[#b91c1c]',
        helper: 'Not a strong protein source.',
      };
    }
    if (value < 10) {
      return {
        label: 'Moderate',
        tone: 'bg-[#fff4d8] text-[#92400e]',
        helper: 'Some protein, but not especially high.',
      };
    }
    return {
      label: 'Strong',
      tone: 'bg-[#eaf8ea] text-[#166534]',
      helper: 'A solid protein average across saved scans.',
    };
  }

  if (key === 'fiber_g') {
    if (value < 2) {
      return {
        label: 'Low',
        tone: 'bg-[#fee2e2] text-[#b91c1c]',
        helper: 'Fiber is relatively low in your saved scans.',
      };
    }
    if (value < 5) {
      return {
        label: 'Moderate',
        tone: 'bg-[#fff4d8] text-[#92400e]',
        helper: 'Some fiber is showing up, but there is room to improve.',
      };
    }
    return {
      label: 'Strong',
      tone: 'bg-[#eaf8ea] text-[#166534]',
      helper: 'Your saved choices show a strong fiber pattern.',
    };
  }

  return {
    label: 'Info',
    tone: 'bg-[#eef2f6] text-[#4b5563]',
    helper: 'Helpful context from your saved scans.',
  };
};

const Insights = ({ onBack, activeProfileId, activeProfile }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await analysisAPI.getInsights(activeProfileId || null);
        setInsights(response.data);
      } catch (err) {
        console.error('Load insights error:', err);
        setError('Failed to load insights. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeProfileId]);

  const metrics = useMemo(() => {
    const scoreEntries = insights?.score_over_time || [];
    const total = insights?.total_scans || 0;
    const counts = insights?.rating_mix || {
      Healthy: 0,
      'Moderately Healthy': 0,
      Unhealthy: 0,
    };

    if (!total) {
      return {
        total: 0,
        avgScore: null,
        counts,
        byDay: [],
        latest: null,
      };
    }

    const avgScore = scoreEntries.length
      ? Math.round(
          scoreEntries.reduce((sum, entry) => sum + (entry.score || 0), 0) /
            scoreEntries.length,
        )
      : null;

    const byDayMap = new Map();
    scoreEntries.forEach((entry) => {
      const day = formatDay(entry.date);
      const existing = byDayMap.get(day) || { day, total: 0, avgScore: 0 };
      existing.total += 1;
      existing.avgScore =
        existing.avgScore + ((entry.score || 0) - existing.avgScore) / existing.total;
      byDayMap.set(day, existing);
    });

    return {
      total,
      avgScore,
      counts,
      byDay: Array.from(byDayMap.values()),
      latest: insights?.latest_scan || null,
    };
  }, [insights]);

  const nutrientCards = useMemo(() => {
    const nutrientTrends = insights?.nutrient_trends || {};

    return Object.entries(nutrientTrends)
      .filter(([_, data]) => typeof data?.average === 'number')
      .slice(0, 4)
      .map(([key, data]) => ({
        key,
        label: nutrientLabels[key] || key,
        average: Math.round(data.average * 10) / 10,
        samples: data.samples?.length || 0,
        status: getNutrientStatus(key, data.average),
      }));
  }, [insights]);

  const topSignals = insights?.top_concerns || [];

  const scoreSummary = useMemo(() => {
    const entries = insights?.score_over_time || [];
    if (!entries.length) {
      return { best: null, lowest: null, delta: null };
    }

    const scores = entries.map((entry) => entry.score || 0);
    return {
      best: Math.max(...scores),
      lowest: Math.min(...scores),
      delta: Math.round(scores[scores.length - 1] - scores[0]),
    };
  }, [insights]);

  const goalStreak = insights?.goal_streak || {
    current: 0,
    best: 0,
    this_week: 0,
    last_match_at: null,
    active_goal: activeProfile?.primary_goal || null,
  };

  const goalCalendar = insights?.goal_calendar || [];

  const goalCalendarRows = useMemo(() => {
    if (!goalCalendar.length) return [];

    const rows = [];
    for (let index = 0; index < goalCalendar.length; index += 7) {
      rows.push(goalCalendar.slice(index, index + 7));
    }
    return rows;
  }, [goalCalendar]);

  const goalCalendarLegend = [
    { label: 'No scan', tone: 'bg-[#e7e1d6]' },
    { label: 'Missed goal', tone: 'bg-[#ffd9a8]' },
    { label: '1 match', tone: 'bg-[#bdf2b8]' },
    { label: '2 matches', tone: 'bg-[#63dc67]' },
    { label: '3+ matches', tone: 'bg-[#177d32]' },
  ];

  const getCalendarTone = (intensity) => {
    if (intensity === -1) return 'bg-[#ffd9a8] text-[#8b5a17]';
    if (intensity === 1) return 'bg-[#bdf2b8] text-[#1f5e2f]';
    if (intensity === 2) return 'bg-[#63dc67] text-[#11471f]';
    if (intensity >= 3) return 'bg-[#177d32] text-white';
    return 'bg-[#e7e1d6] text-[#8b8579]';
  };

  const trendChart = useMemo(() => {
    const entries = metrics.byDay || [];
    if (!entries.length) return null;

    const width = 560;
    const height = 220;
    const leftPad = 28;
    const rightPad = 18;
    const topPad = 16;
    const bottomPad = 32;
    const innerWidth = width - leftPad - rightPad;
    const innerHeight = height - topPad - bottomPad;

    const points = entries.map((entry, index) => {
      const x =
        leftPad +
        (entries.length === 1 ? innerWidth / 2 : (index / (entries.length - 1)) * innerWidth);
      const y = topPad + (1 - entry.avgScore / 100) * innerHeight;
      return { ...entry, x, y };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - bottomPad} L ${points[0].x} ${height - bottomPad} Z`;

    const gridLines = [0, 25, 50, 75, 100].map((value) => ({
      value,
      y: topPad + (1 - value / 100) * innerHeight,
    }));

    return { width, height, points, linePath, areaPath, gridLines, leftPad };
  }, [metrics.byDay]);

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2f3a34] shadow-[0_12px_26px_rgba(56,78,61,0.08)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b8579]">
                Long-term view
              </p>
              <h1
                className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.6rem]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Insights
              </h1>
              <p className="mt-2 text-sm text-[#5f5f5f]">
                See how your saved scans are trending and which patterns show up most often.
              </p>
              {activeProfile && (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8a857b]">
                  Tracking {activeProfile.profile_name} · {activeProfile.relationship}
                </p>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-[24px] border border-[#efc0c0] bg-[#fff1f1] px-5 py-4 text-sm text-[#a33737]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[32px] bg-white shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
            <p className="text-sm text-[#5f5f5f]">Preparing your insights…</p>
          </div>
        ) : !metrics.total ? (
          <div className="rounded-[32px] bg-white px-8 py-12 text-center shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
            <p className="text-lg font-semibold text-[#171717]">No insights yet</p>
            <p className="mt-2 text-sm text-[#6a6a6a]">
              Once you&apos;ve saved a few scans, InnerVerse will begin surfacing trends and recurring nutrition signals here.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Average fit score
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-semibold text-[#171717]">
                    {metrics.avgScore ?? '--'}
                  </p>
                  <span className="rounded-full bg-[#ecffe8] px-3 py-1 text-xs font-medium text-[#2f7a38]">
                    Out of 100
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#6a6a6a]">
                  Based on your saved scans and personalized fit calculations.
                </p>
              </div>

              <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Rating mix
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {ratingOrder.map((rating) => {
                    const count = metrics.counts[rating] || 0;
                    const pct = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={rating}>
                        <div className="flex items-center justify-between text-xs text-[#4b4b4b]">
                          <span>{rating}</span>
                          <span>
                            {count} • {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e5ded1]">
                          <div
                            className={`h-full rounded-full ${
                              rating === 'Healthy'
                                ? 'bg-[#16a34a]'
                                : rating === 'Moderately Healthy'
                                  ? 'bg-[#f59e0b]'
                                  : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#16df11]" />
                  <p className="text-sm font-semibold text-[#171717]">
                    Most recent scan
                  </p>
                </div>
                {metrics.latest ? (
                  <>
                    <p
                      className="text-base font-semibold text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      {metrics.latest.product_name || 'Untitled scan'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#4b4b4b]">
                      <span className="inline-flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {new Date(metrics.latest.scan_date).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#2f7a38]">
                        {metrics.latest.overall_rating || 'Not rated'}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#6a6a6a]">
                    We couldn&apos;t find a latest scan.
                  </p>
                )}
              </div>

              <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Goal match streak
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-semibold text-[#171717]">
                    {goalStreak.current}
                  </p>
                  <span className="rounded-full bg-[#ecffe8] px-3 py-1 text-xs font-medium text-[#2f7a38]">
                    Best {goalStreak.best}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#5f5f5f]">
                  {goalStreak.active_goal
                    ? `Consecutive saved scans matching ${goalStreak.active_goal}.`
                    : 'Save goal-aligned scans to start your streak.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[#f7f5f0] px-3 py-1 font-medium text-[#4f4b45]">
                    This week: {goalStreak.this_week}
                  </span>
                  <span className="rounded-full bg-[#f7f5f0] px-3 py-1 font-medium text-[#4f4b45]">
                    Last match: {goalStreak.last_match_at ? new Date(goalStreak.last_match_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[32px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff]">
                      <TrendingUp className="h-5 w-5 text-[#3569a7]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                        Trend
                      </p>
                      <p
                        className="text-lg font-semibold text-[#171717]"
                        style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                      >
                        Your fit score journey
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreBandTone(metrics.avgScore || 0)}`}>
                    Avg {metrics.avgScore ?? '--'}
                  </span>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] bg-[#f7f5f0] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">Best</p>
                    <p className="mt-1 text-2xl font-semibold text-[#171717]">{scoreSummary.best ?? '--'}</p>
                  </div>
                  <div className="rounded-[24px] bg-[#f7f5f0] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">Lowest</p>
                    <p className="mt-1 text-2xl font-semibold text-[#171717]">{scoreSummary.lowest ?? '--'}</p>
                  </div>
                  <div className="rounded-[24px] bg-[#f7f5f0] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">Direction</p>
                    <p className={`mt-1 text-2xl font-semibold ${scoreSummary.delta >= 0 ? 'text-[#166534]' : 'text-[#b91c1c]'}`}>
                      {scoreSummary.delta === null ? '--' : `${scoreSummary.delta > 0 ? '+' : ''}${scoreSummary.delta}`}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] bg-[#f7f5f0] p-4">
                  {trendChart ? (
                    <svg viewBox={`0 0 ${trendChart.width} ${trendChart.height}`} className="h-56 w-full">
                      <defs>
                        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16df11" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#16df11" stopOpacity="0.04" />
                        </linearGradient>
                      </defs>
                      {trendChart.gridLines.map((line) => (
                        <g key={line.value}>
                          <line
                            x1={trendChart.leftPad}
                            y1={line.y}
                            x2={trendChart.width - 18}
                            y2={line.y}
                            stroke="#ddd6ca"
                            strokeDasharray="4 6"
                          />
                          <text x="0" y={line.y + 4} fontSize="10" fill="#8b8579">
                            {line.value}
                          </text>
                        </g>
                      ))}
                      <path d={trendChart.areaPath} fill="url(#trendArea)" />
                      <path
                        d={trendChart.linePath}
                        fill="none"
                        stroke="#171717"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {trendChart.points.map((point) => (
                        <g key={point.day}>
                          <circle cx={point.x} cy={point.y} r="5" fill="#16df11" stroke="#ffffff" strokeWidth="3" />
                          <text x={point.x} y={trendChart.height - 10} textAnchor="middle" fontSize="10" fill="#6b6b6b">
                            {point.day}
                          </text>
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <p className="text-sm text-[#6a6a6a]">Not enough saved scans yet to show a trend.</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(metrics.byDay || []).map((entry) => (
                    <div
                      key={entry.day}
                      className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#4f4b45] shadow-[0_10px_24px_rgba(56,78,61,0.06)]"
                    >
                      {entry.day}: {Math.round(entry.avgScore)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3e8]">
                    <Sparkles className="h-5 w-5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                      Patterns
                    </p>
                    <p
                      className="text-lg font-semibold text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Common signals we&apos;re seeing
                    </p>
                  </div>
                </div>
                {topSignals.length ? (
                  <div className="space-y-3">
                    {topSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className="flex items-center justify-between rounded-[24px] bg-[#f7f5f0] px-4 py-3"
                      >
                        <p className="text-sm font-medium text-[#171717]">
                          {signal.label}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b6b6b]">
                          {signal.count} scans
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6a6a6a]">
                    As you save more scans, InnerVerse will highlight repeating patterns here.
                  </p>
                )}
              </div>
            </section>

            <section className="mb-6 rounded-[32px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                    Consistency
                  </p>
                  <h2
                    className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Goal-match streak tracker
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#556258]">
                    A streak grows when each new saved scan scores at least 70/100 against your active health goal.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] bg-white px-5 py-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">Current</p>
                    <p className="mt-2 text-3xl font-semibold text-[#171717]">{goalStreak.current}</p>
                  </div>
                  <div className="rounded-[24px] bg-white px-5 py-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">Best</p>
                    <p className="mt-2 text-3xl font-semibold text-[#171717]">{goalStreak.best}</p>
                  </div>
                  <div className="rounded-[24px] bg-white px-5 py-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b8579]">This week</p>
                    <p className="mt-2 text-3xl font-semibold text-[#171717]">{goalStreak.this_week}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-[32px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                    Goal consistency calendar
                  </p>
                  <h2
                    className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Your last 35 days at a glance
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5f5f5f]">
                    Green days continued your goal-match momentum. Amber days mean you scanned something, but it did not meet the goal threshold.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {goalCalendarLegend.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center rounded-full bg-[#f7f5f0] px-3 py-2 text-xs font-medium text-[#4f4b45]"
                    >
                      <span className={`mr-2 h-3 w-3 rounded-sm ${item.tone}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {goalCalendarRows.length ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="mb-3 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                      <div />
                      {weekdayLabels.map((day) => (
                        <div
                          key={day}
                          className="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b8579]"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {goalCalendarRows.map((row, rowIndex) => (
                        <div
                          key={`goal-row-${rowIndex}`}
                          className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2"
                        >
                          <div className="flex items-center px-1 text-xs font-medium text-[#8b8579]">
                            {formatDay(row[0]?.date)}
                          </div>
                          {row.map((entry) => (
                            <div
                              key={entry.date}
                              title={`${formatDay(entry.date)} • ${entry.matches} goal match${entry.matches === 1 ? '' : 'es'} • ${entry.scans} scan${entry.scans === 1 ? '' : 's'}${entry.avg_score !== null ? ` • Avg ${entry.avg_score}/100` : ''}`}
                              className={`rounded-[14px] border border-white/60 px-3 py-3 shadow-[0_8px_18px_rgba(56,78,61,0.06)] ${getCalendarTone(entry.intensity)}`}
                            >
                              <div className="text-xs font-semibold">
                                {new Date(entry.date).getDate()}
                              </div>
                              <div className="mt-2 text-[11px] leading-4 opacity-90">
                                {entry.scans ? `${entry.matches}/${entry.scans} match` : 'No scan'}
                              </div>
                            </div>
                          ))}
                          {row.length < 7 &&
                            Array.from({ length: 7 - row.length }).map((_, emptyIndex) => (
                              <div
                                key={`empty-${rowIndex}-${emptyIndex}`}
                                className="rounded-[14px] bg-transparent"
                              />
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#f7f5f0] px-5 py-8 text-sm leading-7 text-[#5f5f5f]">
                  Save more scans to populate your goal consistency calendar.
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {nutrientCards.map((card) => (
                <div
                  key={card.key}
                  className="rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.08)]"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef5ff]">
                      <BarChart2 className="h-4 w-4 text-[#3569a7]" />
                    </div>
                    <p className="text-sm font-semibold text-[#171717]">{card.label}</p>
                  </div>
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
                    {card.average}
                  </p>
                  <div className="mt-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.status.tone}`}>
                      {card.status.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#5f5f5f]">
                    {card.status.helper}
                  </p>
                  <p className="mt-2 text-xs text-[#6b6b6b]">
                    Average across {card.samples} saved scan{card.samples === 1 ? '' : 's'}.
                  </p>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Insights;
