import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Heart,
  Lightbulb,
  Save,
  ScanSearch,
  Shield,
  Sparkles,
} from 'lucide-react';
import { scansAPI } from '../services/api';

const chartPalette = ['#1adf13', '#2f7a38', '#7bc8f4', '#8b5cf6', '#f59e0b', '#ef4444'];

const scoreTone = {
  Healthy: {
    badge: 'bg-[#18df13] text-[#111111]',
    panel: 'from-[#e8ffe6] to-[#f6fff5]',
    chip: 'bg-[#efffec] text-[#2f7a38]',
  },
  'Moderately Healthy': {
    badge: 'bg-[#ffd84d] text-[#151515]',
    panel: 'from-[#fff7dd] to-[#fffdf3]',
    chip: 'bg-[#fff7dd] text-[#8b6a00]',
  },
  Unhealthy: {
    badge: 'bg-[#ff6d5f] text-white',
    panel: 'from-[#fff0ec] to-[#fff8f6]',
    chip: 'bg-[#fff0ec] text-[#b24336]',
  },
  Unknown: {
    badge: 'bg-[#d7dadf] text-[#222]',
    panel: 'from-[#f4f5f7] to-[#fafbfc]',
    chip: 'bg-[#f0f2f4] text-[#5f6670]',
  },
};

const AnalysisReport = ({ report, onBack, onNewAnalysis, activeProfileId }) => {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [productName, setProductName] = useState(report.product_name || '');
  const [expandedIngredients, setExpandedIngredients] = useState({});

  const overallProfile = report.overall_profile || {};
  const itemizedAnalysis = report.itemized_analysis || [];
  const nutritionTable = report.nutrition_table_data || {};
  const rating = overallProfile.overall_rating || 'Unknown';
  const tone = scoreTone[rating] || scoreTone.Unknown;

  const chartSegments = useMemo(() => {
    const data = report.ingredient_profile_data || {};
    const entries = Object.entries(data).filter(([_, count]) => count > 0);
    const total = entries.reduce((sum, [_, count]) => sum + count, 0);
    if (!entries.length || total === 0) return [];

    let currentAngle = -90;
    return entries.map(([type, count], index) => {
      const percentage = (count / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const radius = 82;
      const innerRadius = 50;
      const centerX = 100;
      const centerY = 100;
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (currentAngle * Math.PI) / 180;
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);
      const largeArc = angle > 180 ? 1 : 0;

      return {
        type,
        count,
        percentage: percentage.toFixed(0),
        color: chartPalette[index % chartPalette.length],
        path: [
          `M ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
          `L ${x3} ${y3}`,
          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
          'Z',
        ].join(' '),
      };
    });
  }, [report.ingredient_profile_data]);

  const nutrientHighlights = useMemo(() => {
    const unique = new Map();
    itemizedAnalysis.forEach((ingredient) => {
      (ingredient.nutrients || []).forEach((nutrient) => {
        const key = `${nutrient.name}-${nutrient.description}`;
        if (!unique.has(key)) unique.set(key, nutrient);
      });
    });
    return Array.from(unique.values()).slice(0, 6);
  }, [itemizedAnalysis]);

  const summaryMoments = useMemo(() => {
    const summary = overallProfile.summary_paragraph || '';
    return summary
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [overallProfile.summary_paragraph]);

  const keySignals = useMemo(() => {
    const cards = [];

    if (overallProfile.allergens_found?.length) {
      cards.push({
        title: 'Allergen signal',
        value: `${overallProfile.allergens_found.length} flagged`,
        tone: 'bg-[#fff4f1] text-[#b24336]',
      });
    }

    if (overallProfile.moderation_advice) {
      cards.push({
        title: 'Portion guidance',
        value: 'Ready',
        tone: 'bg-[#eef5ff] text-[#3569a7]',
      });
    }

    if (overallProfile.alternative_suggestion) {
      cards.push({
        title: 'Better option',
        value: 'Available',
        tone: 'bg-[#fff8df] text-[#8b6a00]',
      });
    }

    cards.push({
      title: 'Ingredient depth',
      value: `${itemizedAnalysis.length} reviewed`,
      tone: 'bg-[#efffec] text-[#2f7a38]',
    });

    return cards.slice(0, 4);
  }, [overallProfile, itemizedAnalysis.length]);

  const nutritionEntries = Object.entries(nutritionTable);

  const parseProgress = (value) => {
    const match = String(value).match(/([\d.]+)/);
    const amount = match ? Number(match[1]) : 20;
    return Math.max(12, Math.min(100, amount));
  };

  const ingredientRatingTone = (ingredientRating) => {
    if (ingredientRating === 'Healthy') return 'bg-[#efffec] text-[#2f7a38]';
    if (ingredientRating === 'Moderately Healthy') return 'bg-[#fff7dd] text-[#8b6a00]';
    if (ingredientRating === 'Unhealthy') return 'bg-[#fff0ec] text-[#b24336]';
    return 'bg-[#f0f2f4] text-[#5f6670]';
  };

  const radarData = useMemo(() => {
    const targets = ['sugar', 'sodium', 'fat', 'protein', 'fiber', 'energy'];
    const labels = ['Sugar', 'Sodium', 'Fat', 'Protein', 'Fiber', 'Energy'];
    const values = targets.map((key) => {
      const entry = nutritionEntries.find(([name]) =>
        name.toLowerCase().includes(key),
      );
      if (!entry) return 25;
      const match = String(entry[1]).match(/([\d.]+)/);
      const raw = match ? Number(match[1]) : 0;
      const clamped = Math.max(0, Math.min(raw, 100));
      if (key === 'protein' || key === 'fiber') {
        return 100 - clamped;
      }
      return clamped;
    });
    return { labels, values };
  }, [nutritionEntries]);

  const radarPoints = useMemo(() => {
    const { values } = radarData;
    const count = values.length;
    if (!count) return '';
    const center = 60;
    const radius = 50;
    const points = values.map((v, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const r = (v / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(' ');
  }, [radarData]);

  const topReasons = useMemo(() => {
    const reasons = [];
    if (overallProfile.summary_paragraph) {
      const pieces = overallProfile.summary_paragraph
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      pieces.forEach((text, idx) => {
        reasons.push({
          title: `Reason ${idx + 1}`,
          body: text,
        });
      });
    }
    return reasons;
  }, [overallProfile.summary_paragraph]);

  const handleSaveScan = async () => {
    if (!productName.trim()) {
      alert('Please enter a product name');
      return;
    }

    setSaving(true);
    try {
      await scansAPI.saveScan(
        productName,
        report.analysis_result || report,
        rating,
        nutritionTable,
        activeProfileId || report.user_profile_summary?.profile_id || null,
      );
      setSaveSuccess(true);
      setSaveModalOpen(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save scan error:', error);
      alert('Failed to save scan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleIngredient = (index) => {
    setExpandedIngredients((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const scoreNumber = useMemo(() => {
    const backendScore =
      overallProfile.personal_fit_score ??
      report.scores?.personal_fit_score ??
      report.analysis_result?.overall_profile?.personal_fit_score;

    if (typeof backendScore === 'number') {
      return Math.max(0, Math.min(100, Math.round(backendScore)));
    }

    if (rating === 'Healthy') return 86;
    if (rating === 'Moderately Healthy') return 63;
    if (rating === 'Unhealthy') return 34;
    return 50;
  }, [overallProfile.personal_fit_score, rating, report.analysis_result?.overall_profile?.personal_fit_score, report.scores?.personal_fit_score]);

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2f3a34] shadow-[0_12px_26px_rgba(56,78,61,0.08)]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#8b8579]">InnerVerse report</p>
                <h1
                  className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.8rem]"
                  style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                >
                  Final Report
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSaveModalOpen(true)}
                className="inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#171717] shadow-[0_12px_26px_rgba(56,78,61,0.08)]"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Scan
              </button>
              <button
                onClick={onNewAnalysis}
                className="inline-flex items-center rounded-2xl bg-[#18df13] px-5 py-3 text-sm font-semibold text-[#111111] shadow-[0_18px_34px_rgba(31,220,24,0.24)]"
              >
                <ScanSearch className="mr-2 h-4 w-4" />
                Scan Another
              </button>
            </div>
          </header>

          {saveSuccess && (
            <div className="mb-6 rounded-[24px] border border-[#bee9b8] bg-[#efffec] px-5 py-4 text-sm text-[#2f7a38]">
              Scan saved successfully.
            </div>
          )}

          <section className={`mb-6 overflow-hidden rounded-[36px] bg-gradient-to-br ${tone.panel} p-[1px] shadow-[0_24px_60px_rgba(56,78,61,0.10)]`}>
            <div className="rounded-[35px] bg-white/70 px-6 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-4 py-2 text-sm font-semibold ${tone.badge}`}>{rating}</span>
                    <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm text-[#606060]">
                      <Clock3 className="mr-2 h-4 w-4" />
                      {new Date(report.analysis_timestamp || Date.now()).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm text-[#606060]">
                      <Heart className="mr-2 h-4 w-4" />
                      {itemizedAnalysis.length} ingredients reviewed
                    </span>
                  </div>

                  <h2
                    className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[3.1rem]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    {report.product_name || 'Unknown Product'}
                  </h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(56,78,61,0.06)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">Verdict</p>
                      <p className="mt-2 text-2xl font-semibold text-[#171717]">{rating}</p>
                    </div>
                    <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(56,78,61,0.06)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">Ingredients</p>
                      <p className="mt-2 text-2xl font-semibold text-[#171717]">{itemizedAnalysis.length}</p>
                    </div>
                    <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(56,78,61,0.06)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">Profile fit</p>
                      <p className="mt-2 text-2xl font-semibold text-[#171717]">Personalized</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {summaryMoments.length > 0 ? (
                      summaryMoments.map((moment, index) => (
                        <div
                          key={`${moment}-${index}`}
                          className="stagger-item rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(56,78,61,0.06)]"
                          style={{ animationDelay: `${index * 80}ms` }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#18df13]" />
                            <p className="text-xs uppercase tracking-[0.16em] text-[#8a857b]">Key takeaway</p>
                          </div>
                          <p className="text-sm leading-7 text-[#565656]">{moment}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(56,78,61,0.06)]">
                        <p className="text-sm leading-7 text-[#565656]">No summary available for this product yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#ffffff_0%,#f6fff5_100%)] px-6 py-6 shadow-[0_14px_30px_rgba(56,78,61,0.08)]">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#18df13]/12 blur-2xl" />
                    <div className="relative flex flex-col items-center text-center">
                      <div
                        className="mb-4 flex h-40 w-40 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#18df13 ${scoreNumber}%, #e8e2d7 ${scoreNumber}% 100%)`,
                        }}
                      >
                        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                          <p className="text-4xl font-semibold tracking-[-0.04em] text-[#171717]">{scoreNumber}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8a857b]">fit score</p>
                        </div>
                      </div>
                      <p className={`rounded-full px-4 py-2 text-sm font-semibold ${tone.badge}`}>{rating}</p>
                      <p className="mt-4 text-sm leading-7 text-[#5b5b5b]">
                        Fast read: this score reflects how well the product aligns with your profile and the overall ingredient balance.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {keySignals.map((signal, index) => (
                      <div
                        key={`${signal.title}-${index}`}
                        className={`stagger-item rounded-[24px] px-4 py-4 ${signal.tone}`}
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <p className="text-xs uppercase tracking-[0.16em] opacity-80">{signal.title}</p>
                        <p className="mt-2 text-xl font-semibold">{signal.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(56,78,61,0.08)]">
                      <div className="mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#2f7a38]" />
                        <p className="text-sm font-semibold text-[#171717]">Moderation advice</p>
                      </div>
                      <p className="text-sm leading-7 text-[#595959]">
                        {overallProfile.moderation_advice || 'No moderation advice was generated for this result.'}
                      </p>
                    </div>

                    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(56,78,61,0.08)]">
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
                        <p className="text-sm font-semibold text-[#171717]">Better next choice</p>
                      </div>
                      <p className="text-sm leading-7 text-[#595959]">
                        {overallProfile.alternative_suggestion || 'No alternative suggestion was generated for this result.'}
                      </p>
                    </div>
                  </div>

                  {topReasons.length > 0 && (
                    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(56,78,61,0.08)]">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#18df13]" />
                        <p className="text-sm font-semibold text-[#171717]">
                          Top 3 reasons behind this score
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {topReasons.map((reason, index) => (
                          <div
                            key={reason.title}
                            className={`rounded-[22px] bg-[#f7f5f0] px-4 py-4 ${
                              index === 0
                                ? 'border border-[#18df13]/40'
                                : 'border border-transparent'
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.16em] text-[#8b8579]">
                              {reason.title}
                            </p>
                            <p className="mt-2 text-xs leading-6 text-[#555555]">
                              {reason.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {overallProfile.allergens_found && overallProfile.allergens_found.length > 0 && (
                    <div className="rounded-[28px] bg-[#fff4f1] px-5 py-5">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#b24336]" />
                        <p className="text-sm font-semibold text-[#b24336]">Possible allergens</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {overallProfile.allergens_found.map((allergen) => (
                          <span key={allergen} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#b24336]">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efffec]">
                  <Sparkles className="h-6 w-6 text-[#2f7a38]" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Ingredient composition
                  </h3>
                  <p className="text-sm text-[#6a6a6a]">A quick visual of what this product is made of.</p>
                </div>
              </div>

              {chartSegments.length > 0 ? (
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
                  <div className="relative flex h-[210px] w-[210px] items-center justify-center">
                    <svg width="210" height="210" viewBox="0 0 200 200">
                      {chartSegments.map((segment) => (
                        <path key={segment.type} d={segment.path} fill={segment.color} stroke="#ffffff" strokeWidth="2" />
                      ))}
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-3xl font-semibold tracking-[-0.03em] text-[#171717]">{itemizedAnalysis.length}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8a857b]">ingredients</p>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    {chartSegments.map((segment) => (
                      <div key={segment.type} className="rounded-[22px] bg-[#f7f5f0] px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: segment.color }} />
                            <span className="text-sm font-semibold text-[#171717]">{segment.type}</span>
                          </div>
                          <span className="text-sm text-[#676767]">{segment.percentage}%</span>
                        </div>
                        <p className="mt-2 text-sm text-[#787878]">{segment.count} ingredients</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#f7f5f0] px-5 py-8 text-sm leading-7 text-[#5f5f5f]">
                  Ingredient composition data is not available for this report yet.
                </div>
              )}
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff]">
                    <Shield className="h-6 w-6 text-[#3569a7]" />
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Nutrition view
                    </h3>
                    <p className="text-sm text-[#6a6a6a]">
                      The label values captured from the pack.
                    </p>
                  </div>
                </div>

                {nutritionEntries.length > 0 && (
                  <div className="flex items-center gap-4 rounded-[24px] bg-[#f7f5f0] px-4 py-3">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="flex-none">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e5ded1"
                        strokeDasharray="4 4"
                      />
                      <polygon
                        points={radarPoints}
                        fill="rgba(24,223,19,0.16)"
                        stroke="#18df13"
                        strokeWidth="2"
                      />
                    </svg>
                    <div className="space-y-1 text-xs text-[#4b4b4b]">
                      <p className="font-semibold text-[#171717]">Profile radar</p>
                      <p>
                        Higher fill here means more attention needed on that axis (e.g. sugar,
                        sodium); lower means gentler impact.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {nutritionEntries.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {nutritionEntries.map(([key, value]) => (
                    <div key={key} className="stagger-item rounded-[24px] bg-[#faf9f6] px-4 py-4" style={{ animationDelay: '70ms' }}>
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[#171717]">{key}</p>
                        <p className="text-sm text-[#666666]">{value}</p>
                      </div>
                      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#e7e1d6]">
                        <div
                          className="h-full rounded-full bg-[#18df13]"
                          style={{ width: `${parseProgress(value)}%` }}
                        />
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-[#9a9489]">
                        Label signal
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#f7f5f0] px-5 py-8 text-sm leading-7 text-[#5f5f5f]">
                  Nutrition facts were not captured for this scan.
                </div>
              )}

              {nutrientHighlights.length > 0 && (
                <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,#efffec_0%,#f9fff7_100%)] p-5">
                  <p className="mb-4 text-sm font-semibold text-[#2f7a38]">Nutrient highlights</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {nutrientHighlights.map((nutrient, index) => (
                      <div key={`${nutrient.name}-${index}`} className="rounded-[20px] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-[#171717]">{nutrient.name}</p>
                        <p className="mt-2 text-sm leading-6 text-[#676767]">{nutrient.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3ecff]">
                <Shield className="h-6 w-6 text-[#6b46c1]" />
              </div>
              <div>
                <h3
                  className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                  style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                >
                  Ingredient-by-ingredient review
                </h3>
                <p className="text-sm text-[#6a6a6a]">Expand each ingredient to understand its role, concerns, and nutrients.</p>
              </div>
            </div>

            {itemizedAnalysis.length > 0 ? (
              <div className="space-y-4">
                {itemizedAnalysis.map((ingredient, index) => {
                  const isExpanded = expandedIngredients[index] ?? true;
                  return (
                    <div
                      key={`${ingredient.ingredient_name}-${index}`}
                      className="stagger-item overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf7_100%)] shadow-[0_10px_24px_rgba(56,78,61,0.04)]"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <button
                        onClick={() => toggleIngredient(index)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-xl font-semibold tracking-[-0.02em] text-[#171717]">
                              {ingredient.ingredient_name}
                            </p>
                            {ingredient.health_rating && (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ingredientRatingTone(ingredient.health_rating)}`}>
                                {ingredient.health_rating}
                              </span>
                            )}
                            {ingredient.percentage && (
                              <span className="rounded-full bg-[#eef1f5] px-3 py-1 text-xs font-medium text-[#5f6670]">
                                {ingredient.percentage}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {ingredient.food_type && (
                              <span className="rounded-full bg-[#efffec] px-3 py-1 text-xs font-medium text-[#2f7a38]">
                                {ingredient.food_type}
                              </span>
                            )}
                            {(ingredient.food_traits || []).map((trait) => (
                              <span key={trait} className="rounded-full bg-[#f5f2ea] px-3 py-1 text-xs text-[#6a645b]">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 flex-none text-[#666666]" />
                        ) : (
                          <ChevronDown className="h-5 w-5 flex-none text-[#666666]" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#ebe5d9] px-5 py-5">
                          {ingredient.ingredient_details && (
                            <div className="rounded-[22px] bg-[#f7f5f0] px-4 py-4">
                              <p className="text-sm leading-7 text-[#5f5f5f]">{ingredient.ingredient_details}</p>
                            </div>
                          )}

                          {ingredient.nutrients && ingredient.nutrients.length > 0 && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {ingredient.nutrients.map((nutrient, nutrientIndex) => (
                                <div
                                  key={`${ingredient.ingredient_name}-${nutrient.name}-${nutrientIndex}`}
                                  className="rounded-[20px] bg-[#faf9f6] px-4 py-4"
                                >
                                  <p className="text-sm font-semibold text-[#171717]">{nutrient.name}</p>
                                  <p className="mt-2 text-sm leading-6 text-[#676767]">{nutrient.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] bg-[#f7f5f0] px-5 py-8 text-sm leading-7 text-[#5f5f5f]">
                No ingredient-level details are available for this report.
              </div>
            )}
          </section>
        </div>
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-[0_30px_80px_rgba(17,23,29,0.28)]">
            <h3
              className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
              style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
            >
              Save this scan
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#676767]">
              Give this result a clear name so it is easy to find in your history later.
            </p>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="mt-5 w-full rounded-[20px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-4 text-base"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="rounded-2xl bg-[#f4f1ea] px-4 py-3 text-sm font-medium text-[#57534d]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScan}
                disabled={saving}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
                  saving
                    ? 'bg-[#d8d8d8] text-[#767676]'
                    : 'bg-[#18df13] text-[#111111] shadow-[0_18px_34px_rgba(31,220,24,0.24)]'
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisReport;
