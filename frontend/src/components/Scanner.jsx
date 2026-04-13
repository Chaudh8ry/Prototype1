import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut,
  Scan,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import { analysisAPI, logout, scansAPI } from '../services/api';

const tips = [
  'Show the full ingredients list and nutrition table in one frame.',
  'Avoid reflections on glossy packaging when taking the photo.',
  'Review the extracted ingredients before the final report.',
];

const scoreStyles = {
  Healthy: 'bg-emerald-500 text-white',
  'Moderately Healthy': 'bg-amber-400 text-black',
  Unhealthy: 'bg-rose-500 text-white',
};

const ringTone = {
  emerald: { fill: '#23C55E', track: '#E5F6EA' },
  sky: { fill: '#38BDF8', track: '#E7F6FD' },
  violet: { fill: '#8B5CF6', track: '#EFE8FF' },
  amber: { fill: '#F59E0B', track: '#FFF2D9' },
};

const ratingToScore = (rating) => {
  if (rating === 'Healthy') return 3;
  if (rating === 'Moderately Healthy') return 2;
  if (rating === 'Unhealthy') return 1;
  return 0;
};

const Scanner = ({ user, profiles = [], activeProfile = null, canManageFamily = false, onActiveProfileChange, onLogout, onProfileEdit, onAnalysisComplete, onViewHistory, onViewInsights }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [insightsSummary, setInsightsSummary] = useState(null);
  const [activeScanIndex, setActiveScanIndex] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    loadRecentScans();
  }, [activeProfile?._id]);

  const loadRecentScans = async () => {
    try {
      const [scansResponse, insightsResponse] = await Promise.all([
        scansAPI.getScans(activeProfile?._id || null),
        analysisAPI.getInsights(activeProfile?._id || null),
      ]);
      setRecentScans(scansResponse.data.scans || []);
      setInsightsSummary(insightsResponse.data || null);
    } catch (loadError) {
      console.error('Load recent scans error:', loadError);
    }
  };

  const dashboardMetrics = useMemo(() => {
    if (!recentScans.length) {
      return {
        total: 0,
        avgScore: null,
        healthyShare: 0,
        latestRating: null,
      };
    }
    const total = recentScans.length;
    const sumScore = recentScans.reduce(
      (sum, s) => sum + ratingToScore(s.overall_rating),
      0,
    );
    const healthies = recentScans.filter(
      (s) => s.overall_rating === 'Healthy',
    ).length;
    const latestRating = recentScans[0]?.overall_rating || null;

    return {
      total,
      avgScore: sumScore ? (sumScore / total).toFixed(1) : null,
      healthyShare: Math.round((healthies / total) * 100),
      latestRating,
      goalStreak: insightsSummary?.goal_streak?.current || 0,
      bestGoalStreak: insightsSummary?.goal_streak?.best || 0,
      weeklyGoalMatches: insightsSummary?.goal_streak?.this_week || 0,
      activeGoal: insightsSummary?.goal_streak?.active_goal || activeProfile?.primary_goal || null,
    };
  }, [recentScans, insightsSummary, activeProfile?.primary_goal]);

  const activeTip = useMemo(() => {
    if (!recentScans.length) {
      return 'Start with everyday staples—breakfast, snacks, or drinks—to quickly see where sugar and sodium show up.';
    }

    const latestRating = recentScans[0]?.overall_rating;
    if (latestRating === 'Unhealthy') {
      return 'Your last saved result leaned heavy. Try scanning a simpler option next and compare ingredient lists side by side.';
    }
    if (latestRating === 'Healthy') {
      return 'Nice momentum. Save similar products so you can build your own shortlist of better choices.';
    }
    return 'You are building a balanced picture. Compare products in the same category to see what really changes.';
  }, [recentScans]);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 2);
    if (!files.length) return;

    setImageFiles(files);
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((previews) => {
      setSelectedImages(previews);
      setError('');
    });
  };

  const handleAnalyze = async () => {
    if (!imageFiles.length) {
      setError('Please select at least one image first');
      return;
    }

    if (!user.hasProfile) {
      setError('Please complete your health profile first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await analysisAPI.extractIngredients(imageFiles);

      onAnalysisComplete({
        step: 'confirmation',
        scanned_ingredients_list: response.data.scanned_ingredients_list,
        scanned_nutrition_table: response.data.scanned_nutrition_table || {},
        extractedText: response.data.extracted_text,
        ingredientsList: response.data.ingredients_list,
        imageUrl: selectedImages[0] || null,
        imageUrls: selectedImages,
      });
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      setError(analysisError.response?.data?.message || 'Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  const getScoreLabel = (rating) => {
    if (rating === 'Healthy') return 'Score A';
    if (rating === 'Moderately Healthy') return 'Score B';
    if (rating === 'Unhealthy') return 'Score C';
    return 'Scored';
  };

  const scrollToScan = (index) => {
    const container = carouselRef.current;
    if (!container) return;

    const nextIndex = Math.max(0, Math.min(index, recentScans.length - 1));
    const card = container.children[nextIndex];
    if (!card) return;

    container.scrollTo({
      left: card.offsetLeft - container.offsetLeft,
      behavior: 'smooth',
    });
    setActiveScanIndex(nextIndex);
  };

  const handleCarouselScroll = () => {
    const container = carouselRef.current;
    if (!container) return;

    const children = Array.from(container.children);
    if (!children.length) return;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft - container.scrollLeft - container.offsetLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveScanIndex(closestIndex);
  };

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex items-center justify-between">
            <button
              onClick={onProfileEdit}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#7be36b] bg-white shadow-[0_12px_30px_rgba(56,78,61,0.08)]"
              title={canManageFamily ? (user.hasProfile ? 'Manage Profiles' : 'Create Profile') : 'Switch to your main profile to manage family'}
              disabled={!canManageFamily && user.hasProfile}
            >
              <User className="h-6 w-6 text-[#4e5a52]" />
            </button>

            <div className="text-center">
              <p
                className="text-3xl font-semibold tracking-[-0.03em] text-[#151515] sm:text-4xl"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Dashboard
              </p>
              <p className="mt-1 text-sm text-[#717171]">
                Welcome back, {user.first_name || user.email}
              </p>
              {activeProfile && (
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8a857b]">
                  Viewing {activeProfile.profile_name} · {activeProfile.relationship}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#4e5a52] shadow-[0_12px_30px_rgba(56,78,61,0.08)]"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </header>

          <section className="mb-8">
            {profiles.length > 0 && (
              <div className="mb-5 rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(56,78,61,0.08)] sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8a857b]">
                      Scanning for
                    </p>
                    <p className="mt-1 text-sm text-[#5f5f5f]">
                      Pick whose health profile should be used for scans, history, and insights.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={activeProfile?._id || ''}
                      onChange={(e) => onActiveProfileChange?.(e.target.value)}
                      className="min-w-[220px] rounded-2xl border border-[#ddd6c9] bg-[#faf8f4] px-4 py-3 text-sm font-medium text-[#171717] shadow-sm outline-none"
                    >
                      {profiles.map((profile) => (
                        <option key={profile._id} value={profile._id}>
                          {profile.profile_name} · {profile.relationship}
                        </option>
                      ))}
                    </select>

                    {canManageFamily ? (
                      <button
                        onClick={onProfileEdit}
                        className="rounded-2xl border border-[#ddd6c9] bg-[#faf8f4] px-4 py-3 text-sm font-medium text-[#4d4d4d]"
                      >
                        Manage
                      </button>
                    ) : (
                      <div className="rounded-2xl border border-[#e7dfd4] bg-[#faf8f4] px-4 py-3 text-xs font-medium text-[#7a7468]">
                        Switch to Self to manage
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[32px] bg-gradient-to-br from-[#1dee12] via-[#36ea3f] to-[#0fd248] p-[1px] shadow-[0_28px_70px_rgba(39,196,61,0.22)]">
              <div className="rounded-[31px] bg-[linear-gradient(135deg,#ecffe8_0%,#f7fff4_42%,#f2fff5_100%)] px-6 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                  <div>
                    <div className="mb-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#32703d] shadow-sm">
                      Personalized nutrition scanner
                    </div>
                    <h1
                      className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-[#131313] sm:text-[3rem]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Scan food labels with clarity, not guesswork.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-[#4f5c54]">
                      Upload a food packet, review the extracted ingredients, and get a health-aware report shaped by your profile.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-2xl bg-[#17e10f] px-5 py-4 text-base font-semibold text-[#111111] shadow-[0_18px_34px_rgba(38,216,72,0.24)] transition hover:translate-y-[-1px]">
                        <Camera className="mr-3 h-5 w-5" />
                        {selectedImages.length ? 'Replace Label Images' : 'Scan Food Label'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>

                      <label className="inline-flex cursor-pointer items-center rounded-2xl bg-white px-5 py-4 text-base font-medium text-[#252525] shadow-[0_12px_26px_rgba(56,78,61,0.10)] transition hover:translate-y-[-1px]">
                        <Upload className="mr-3 h-5 w-5" />
                        Upload 1 or 2 Images
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {!user.hasProfile && (
                      <div className="mt-5 rounded-3xl border border-[#f0d98c] bg-[#fff8dc] px-4 py-4 text-[#6d5712]">
                        <p className="text-sm font-medium">
                          Complete your health profile first to unlock personalized scores and safer recommendations.
                        </p>
                        <button
                          onClick={onProfileEdit}
                          className="mt-3 inline-flex items-center rounded-xl bg-[#181818] px-4 py-2.5 text-sm font-medium text-white"
                        >
                          {user.hasProfile ? 'Edit Profile' : 'Create Profile'}
                        </button>
                      </div>
                    )}

                    {error && (
                      <div className="mt-5 rounded-2xl border border-[#efc0c0] bg-[#fff1f1] px-4 py-3 text-sm text-[#ae3535]">
                        {error}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[30px] bg-white/80 p-4 backdrop-blur-sm shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
                    {selectedImages.length ? (
                      <div>
                        <div className={`grid gap-3 ${selectedImages.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                          {selectedImages.map((image, index) => (
                            <img
                              key={`preview-${index}`}
                              src={image}
                              alt={`Selected food label ${index + 1}`}
                              className="h-72 w-full rounded-[24px] object-cover"
                            />
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-[#6b6b6b]">
                          You can upload one image for ingredients and another for the nutrition table.
                        </p>
                        <button
                          onClick={handleAnalyze}
                          disabled={loading || !user.hasProfile}
                          className={`mt-4 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold transition ${
                            loading || !user.hasProfile
                              ? 'cursor-not-allowed bg-[#d9d9d9] text-[#767676]'
                              : 'bg-[#111111] text-white hover:translate-y-[-1px]'
                          }`}
                        >
                          <Scan className="mr-3 h-5 w-5" />
                          {loading ? 'Analyzing label...' : 'Review & Analyze'}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-[24px] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f3f8f1_55%,#edf4ee_100%)] px-5 py-8 text-center">
                        <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-full bg-white shadow-[0_12px_24px_rgba(56,78,61,0.08)]">
                          <ShieldCheck className="h-8 w-8 text-[#2f6b37]" />
                        </div>
                        <h3
                          className="text-2xl font-semibold tracking-[-0.03em] text-[#141414]"
                          style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                        >
                          One clean scan
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-[#5f655f]">
                          Capture the ingredients list and nutrition facts clearly. You can edit everything before the final report.
                        </p>
                        <div className="mt-6 space-y-3 text-left">
                          {tips.map((tip) => (
                            <div key={tip} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                              <Sparkles className="mt-0.5 h-4 w-4 flex-none text-[#26d314]" />
                              <p className="text-sm text-[#4f5851]">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-[2rem] font-semibold tracking-[-0.03em] text-[#131313]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Your InnerVerse pattern
              </h2>
              {canManageFamily && (
                <button
                  onClick={onProfileEdit}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#4d4d4d] shadow-[0_8px_20px_rgba(56,78,61,0.08)]"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Saved scans
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#121212]">
                  {dashboardMetrics.total}
                </p>
                <p className="mt-2 text-xs text-[#6a6a6a]">
                  Each saved scan sharpens your long-term insights.
                </p>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Average report score
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-16 w-16">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="#e5ded1"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="#18df13"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={
                          2 * Math.PI * 48 -
                          ((dashboardMetrics.avgScore || 0) / 3) *
                            (2 * Math.PI * 48)
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[#161616]">
                      {dashboardMetrics.avgScore ?? '–'}
                    </div>
                  </div>
                  <p className="text-xs text-[#6a6a6a]">
                    On a 1–3 scale across your saved results.
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Healthy share
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#121212]">
                  {dashboardMetrics.total ? `${dashboardMetrics.healthyShare}%` : '–'}
                </p>
                <p className="mt-2 text-xs text-[#6a6a6a]">
                  Portion of your saved scans rated <span className="font-semibold">Healthy</span>.
                </p>
              </div>

              <div className="rounded-[28px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] p-5 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b8579]">
                  Goal match streak
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#121212]">
                  {dashboardMetrics.goalStreak}
                </p>
                <p className="mt-2 text-xs text-[#56635a]">
                  Consecutive saved scans matching {dashboardMetrics.activeGoal || 'your goal'}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7a38]">
                    Best {dashboardMetrics.bestGoalStreak}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7a38]">
                    This week {dashboardMetrics.weeklyGoalMatches}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-[2rem] font-semibold tracking-[-0.03em] text-[#131313]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Recent Scans
              </h2>
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="inline-flex items-center text-base font-semibold text-[#19d60f]"
                >
                  See all
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              )}
            </div>

            {recentScans.length === 0 ? (
              <div className="rounded-[28px] bg-white p-8 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
                <p className="text-lg font-medium text-[#212121]">No saved scans yet.</p>
                <p className="mt-2 text-sm text-[#6d6d6d]">
                  Your most recent product scans will appear here once you save a report.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {recentScans.map((scan, index) => (
                    <button
                      key={scan._id}
                      onClick={onViewHistory}
                      className="min-w-[84%] snap-center text-left sm:min-w-[360px] lg:min-w-[380px]"
                    >
                      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_16px_36px_rgba(56,78,61,0.08)] transition hover:translate-y-[-2px]">
                        <div
                          className={`relative h-52 ${
                            index % 3 === 0
                              ? 'bg-[linear-gradient(135deg,#c9e4dc_0%,#dcefed_100%)]'
                              : index % 3 === 1
                                ? 'bg-[linear-gradient(135deg,#d8d4cf_0%,#efede8_100%)]'
                                : 'bg-[linear-gradient(135deg,#20343a_0%,#2d4648_100%)]'
                          }`}
                        >
                          <div className={`absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-semibold ${scoreStyles[scan.overall_rating] || 'bg-black text-white'}`}>
                            {getScoreLabel(scan.overall_rating)}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.1)_100%)]" />
                          <div className="absolute bottom-5 left-5 flex h-20 w-20 items-center justify-center rounded-[22px] bg-white/80 shadow-sm backdrop-blur-sm">
                            <History className={`h-9 w-9 ${index % 3 === 2 ? 'text-[#20343a]' : 'text-[#4f645f]'}`} />
                          </div>
                        </div>
                        <div className="px-4 pb-5 pt-4">
                          <p
                            className="truncate text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                            style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                          >
                            {scan.product_name}
                          </p>
                          <p className="mt-1 text-sm text-[#787878]">{formatDate(scan.scan_date)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {recentScans.length > 1 && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-[linear-gradient(90deg,#f6f3ee_20%,rgba(246,243,238,0))] lg:block" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-[linear-gradient(270deg,#f6f3ee_20%,rgba(246,243,238,0))] lg:block" />

                    <button
                      onClick={() => scrollToScan(activeScanIndex - 1)}
                      disabled={activeScanIndex === 0}
                      className={`absolute left-0 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(56,78,61,0.12)] lg:flex ${
                        activeScanIndex === 0 ? 'cursor-not-allowed text-[#c8c8c8]' : 'text-[#2f3a34]'
                      }`}
                      aria-label="Previous scan"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => scrollToScan(activeScanIndex + 1)}
                      disabled={activeScanIndex === recentScans.length - 1}
                      className={`absolute right-0 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(56,78,61,0.12)] lg:flex ${
                        activeScanIndex === recentScans.length - 1 ? 'cursor-not-allowed text-[#c8c8c8]' : 'text-[#2f3a34]'
                      }`}
                      aria-label="Next scan"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="mt-5 flex items-center justify-center gap-2">
                      {recentScans.map((scan, index) => (
                        <button
                          key={`${scan._id}-dot`}
                          onClick={() => scrollToScan(index)}
                          className={`h-2.5 rounded-full transition-all ${
                            index === activeScanIndex ? 'w-8 bg-[#171717]' : 'w-2.5 bg-[#d6d1c7]'
                          }`}
                          aria-label={`Go to scan ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="rounded-[30px] border border-[#a7e7a0] bg-[linear-gradient(135deg,#dbf5d8_0%,#edf8ea_100%)] p-6 shadow-[0_18px_40px_rgba(56,78,61,0.08)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-[#17e10f] shadow-[0_14px_28px_rgba(29,225,15,0.28)]">
                  <Sparkles className="h-8 w-8 text-[#101010]" />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-3xl font-semibold tracking-[-0.03em] text-[#171717]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Nutritionist&apos;s Tip
                  </h3>
                  <p className="mt-3 max-w-3xl text-lg leading-8 text-[#425047]">
                    {activeTip}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <nav className="sticky bottom-4 z-10">
            <div className="mx-auto flex max-w-2xl items-center justify-around rounded-[28px] bg-white/92 px-4 py-4 backdrop-blur shadow-[0_22px_45px_rgba(56,78,61,0.12)]">
              <div className="flex flex-col items-center gap-1 text-[#19d60f]">
                <div className="rounded-full bg-[#efffe9] p-2">
                  <Scan className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Home</span>
              </div>
              <button
                onClick={onViewHistory}
                className="flex flex-col items-center gap-1 text-[#a0a0a0]"
              >
                <History className="h-5 w-5" />
                <span className="text-sm">History</span>
              </button>
              <button
                onClick={onViewInsights}
                className="flex flex-col items-center gap-1 text-[#a0a0a0]"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">Insights</span>
              </button>
              <button
                onClick={onProfileEdit}
                className="flex flex-col items-center gap-1 text-[#a0a0a0]"
              >
                <User className="h-5 w-5" />
                <span className="text-sm">Profile</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
