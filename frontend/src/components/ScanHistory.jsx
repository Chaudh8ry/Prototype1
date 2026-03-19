import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Clock, Search, BarChart2, Filter } from 'lucide-react';
import { scansAPI } from '../services/api';

const ScanHistory = ({ onBack, onViewScan, onCompareScans, activeProfileId, activeProfile }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All'); // All | Healthy | Moderately Healthy | Unhealthy
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    loadScans();
  }, [activeProfileId]);

  const loadScans = async () => {
    try {
      setLoading(true);
      const response = await scansAPI.getScans(activeProfileId || null);
      setScans(response.data.scans);
    } catch (error) {
      console.error('Load scans error:', error);
      setError('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Healthy':
        return 'bg-[#e4f8e4] text-[#166534] border-[#bbebbb]';
      case 'Moderately Healthy':
        return 'bg-[#fff4d8] text-[#92400e] border-[#f5d9a3]';
      case 'Unhealthy':
        return 'bg-[#fee2e2] text-[#b91c1c] border-[#f4b4b4]';
      default:
        return 'bg-[#e5e7eb] text-[#374151] border-[#d1d5db]';
    }
  };

  const ratingToScore = (rating) => {
    if (rating === 'Healthy') return 3;
    if (rating === 'Moderately Healthy') return 2;
    if (rating === 'Unhealthy') return 1;
    return 0;
  };

  const filteredScans = useMemo(() => {
    return scans
      .filter((scan) => {
        if (ratingFilter === 'All') return true;
        return scan.overall_rating === ratingFilter;
      })
      .filter((scan) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return (
          scan.product_name?.toLowerCase().includes(term) ||
          scan.overall_rating?.toLowerCase().includes(term)
        );
      });
  }, [scans, ratingFilter, search]);

  const summary = useMemo(() => {
    if (!scans.length) {
      return {
        total: 0,
        avgScore: null,
        healthyShare: 0,
        lastScan: null,
      };
    }

    const total = scans.length;
    const sumScore = scans.reduce((sum, s) => sum + ratingToScore(s.overall_rating), 0);
    const healthies = scans.filter((s) => s.overall_rating === 'Healthy').length;
    const last = scans
      .map((s) => new Date(s.scan_date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      total,
      avgScore: sumScore ? (sumScore / total).toFixed(1) : null,
      healthyShare: Math.round((healthies / total) * 100),
      lastScan: last,
    };
  }, [scans]);

  const handleDelete = async (scanId) => {
    if (!window.confirm('Are you sure you want to delete this scan?')) {
      return;
    }

    try {
      await scansAPI.deleteScan(scanId);
      setScans(scans.filter(scan => scan._id !== scanId));
    } catch (error) {
      console.error('Delete scan error:', error);
      alert('Failed to delete scan');
    }
  };

  const toggleSelected = (scanId) => {
    setSelectedIds((prev) => {
      if (prev.includes(scanId)) {
        return prev.filter((id) => id !== scanId);
      }
      if (prev.length >= 2) {
        return [prev[1], scanId];
      }
      return [...prev, scanId];
    });
  };

  const handleCompareSelected = async () => {
    if (!onCompareScans || selectedIds.length !== 2) return;
    try {
      const [firstId, secondId] = selectedIds;
      const [firstRes, secondRes] = await Promise.all([
        scansAPI.getScan(firstId),
        scansAPI.getScan(secondId),
      ]);

      const buildReport = (scan) => {
        const report = {
          product_name: scan.product_name,
          overall_profile: scan.analysis_result.overall_profile,
          itemized_analysis: scan.analysis_result.itemized_analysis,
          ingredient_profile_data: {},
          nutrition_table_data: scan.nutrition_table_data || {},
          analysis_result: scan.analysis_result,
          analysis_timestamp: scan.scan_date,
          total_ingredients: scan.analysis_result.itemized_analysis?.length || 0,
        };

        if (scan.analysis_result.itemized_analysis) {
          scan.analysis_result.itemized_analysis.forEach((ingredient) => {
            const foodType = ingredient.food_type || 'Other';
            report.ingredient_profile_data[foodType] =
              (report.ingredient_profile_data[foodType] || 0) + 1;
          });
        }

        return report;
      };

      const leftReport = buildReport(firstRes.data.scan);
      const rightReport = buildReport(secondRes.data.scan);

      onCompareScans(leftReport, rightReport);
    } catch (error) {
      console.error('Compare scans error:', error);
      alert('Failed to compare scans. Please try again.');
    }
  };

  const handleViewScan = async (scanId) => {
    try {
      const response = await scansAPI.getScan(scanId);
      const scan = response.data.scan;
      
      // Reconstruct report from saved analysis_result
      const report = {
        product_name: scan.product_name,
        overall_profile: scan.analysis_result.overall_profile,
        itemized_analysis: scan.analysis_result.itemized_analysis,
        ingredient_profile_data: {}, // Will be regenerated from itemized_analysis
        nutrition_table_data: scan.nutrition_table_data || {}, // Include saved nutrition table data
        analysis_result: scan.analysis_result,
        analysis_timestamp: scan.scan_date,
        total_ingredients: scan.analysis_result.itemized_analysis?.length || 0
      };

      // Regenerate chart data
      if (scan.analysis_result.itemized_analysis) {
        scan.analysis_result.itemized_analysis.forEach(ingredient => {
          const foodType = ingredient.food_type || 'Other';
          report.ingredient_profile_data[foodType] = (report.ingredient_profile_data[foodType] || 0) + 1;
        });
      }

      onViewScan(report);
    } catch (error) {
      console.error('View scan error:', error);
      alert('Failed to load scan');
    }
  };

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
                Saved results
              </p>
              <h1
                className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.6rem]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Scan history
              </h1>
              <p className="mt-2 text-sm text-[#5f5f5f]">
                Revisit past reports, compare choices, and spot patterns over time.
              </p>
              {activeProfile && (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8a857b]">
                  Tracking {activeProfile.profile_name} · {activeProfile.relationship}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-5 py-4 shadow-[0_20px_50px_rgba(56,78,61,0.10)]">
            <div className="mb-3 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#2f7a38]" />
              <p className="text-sm font-semibold text-[#171717]">History snapshot</p>
            </div>
            <div className="grid gap-3 text-xs text-[#4b4b4b] sm:grid-cols-3">
              <div>
                <p className="uppercase tracking-[0.18em] text-[#8b8579]">Total scans</p>
                <p className="mt-1 text-lg font-semibold text-[#171717]">
                  {summary.total}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-[#8b8579]">
                  Avg. score (1–3)
                </p>
                <p className="mt-1 text-lg font-semibold text-[#171717]">
                  {summary.avgScore ?? '–'}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-[#8b8579]">Healthy share</p>
                <p className="mt-1 text-lg font-semibold text-[#171717]">
                  {summary.total ? `${summary.healthyShare}%` : '–'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-[24px] border border-[#efc0c0] bg-[#fff1f1] px-5 py-4 text-sm text-[#a33737]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[32px] bg-white shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
            <p className="text-sm text-[#5f5f5f]">Loading scan history…</p>
          </div>
        ) : scans.length === 0 ? (
          <div className="rounded-[32px] bg-white px-8 py-12 text-center shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
            <p className="text-lg font-semibold text-[#171717]">No saved scans yet</p>
            <p className="mt-2 text-sm text-[#6a6a6a]">
              Your first saved report will appear here. Scan a product and tap &quot;Save
              scan&quot; from the final report.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-[28px] bg-white px-5 py-4 shadow-[0_18px_40px_rgba(56,78,61,0.10)] sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f5ff]">
                    <Search className="h-5 w-5 text-[#4b5563]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                      Search history
                    </p>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by product name or rating…"
                      className="mt-2 w-full rounded-[18px] border border-[#e0d7c9] bg-[#faf9f6] px-4 py-2.5 text-sm text-[#171717]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-medium text-[#6e685d]">
                    <Filter className="mr-1 h-3.5 w-3.5" />
                    Filter by rating
                  </div>
                  {['All', 'Healthy', 'Moderately Healthy', 'Unhealthy'].map((value) => {
                    const active = ratingFilter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingFilter(value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-[#111111] text-white'
                            : 'bg-[#f4f1ea] text-[#5e594f]'
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {filteredScans.length === 0 ? (
              <div className="rounded-[32px] bg-white px-8 py-12 text-center shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
                <p className="text-sm font-medium text-[#171717]">
                  No scans match your current search and filters.
                </p>
                <p className="mt-2 text-sm text-[#6a6a6a]">
                  Try clearing the search box or switching to a different rating filter.
                </p>
              </div>
            ) : (
              <>
                {onCompareScans && (
                  <div className="mb-4 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={selectedIds.length !== 2}
                      onClick={handleCompareSelected}
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold ${
                        selectedIds.length === 2
                          ? 'bg-[#111111] text-white shadow-[0_14px_28px_rgba(17,24,39,0.18)]'
                          : 'cursor-not-allowed bg-[#e5e7eb] text-[#9ca3af]'
                      }`}
                    >
                      Compare selected ({selectedIds.length}/2)
                    </button>
                  </div>
                )}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredScans.map((scan) => {
                    const selected = selectedIds.includes(scan._id);
                    return (
                      <div
                        key={scan._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleViewScan(scan._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleViewScan(scan._id);
                          }
                        }}
                        className={`cursor-pointer text-left ${
                          selected ? 'outline-none ring-2 ring-[#18df13]' : ''
                        }`}
                      >
                        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(56,78,61,0.10)] transition hover:translate-y-[-2px]">
                          <div className="flex items-center justify-between border-b border-[#e7dfd4] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-4 py-3">
                            <div
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRatingColor(
                                scan.overall_rating,
                              )}`}
                            >
                              {scan.overall_rating || 'Not rated'}
                            </div>
                            {onCompareScans && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelected(scan._id);
                                }}
                                className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                  selected
                                    ? 'bg-[#18df13] text-[#111111]'
                                    : 'bg-white/70 text-[#4b5563]'
                                }`}
                              >
                                {selected ? 'Selected' : 'Select'}
                              </button>
                            )}
                          </div>
                          <div className="px-4 pb-4 pt-4">
                            <p
                              className="line-clamp-2 text-base font-semibold tracking-[-0.02em] text-[#171717]"
                              style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                            >
                              {scan.product_name || 'Untitled scan'}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-xs text-[#6b7280]">
                              <span className="inline-flex items-center">
                                <Clock className="mr-1.5 h-3.5 w-3.5" />
                                {new Date(scan.scan_date).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(scan._id);
                                }}
                                className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScanHistory;

