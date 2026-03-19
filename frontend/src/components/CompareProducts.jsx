import React from 'react';
import { ArrowLeft, Clock3, Heart } from 'lucide-react';

const scoreTone = {
  Healthy: 'bg-[#18df13] text-[#111111]',
  'Moderately Healthy': 'bg-[#ffd84d] text-[#151515]',
  Unhealthy: 'bg-[#ff6d5f] text-white',
  Unknown: 'bg-[#d7dadf] text-[#222]',
};

const scoreNumberForRating = (rating) => {
  if (rating === 'Healthy') return 86;
  if (rating === 'Moderately Healthy') return 63;
  if (rating === 'Unhealthy') return 34;
  return 50;
};

const resolveScore = (report, rating) => {
  const backendScore =
    report?.overall_profile?.personal_fit_score ??
    report?.scores?.personal_fit_score ??
    report?.analysis_result?.overall_profile?.personal_fit_score;

  if (typeof backendScore === 'number') {
    return Math.max(0, Math.min(100, Math.round(backendScore)));
  }

  return scoreNumberForRating(rating);
};

const CompareProducts = ({ leftReport, rightReport, onBack }) => {
  const leftProfile = leftReport.overall_profile || {};
  const rightProfile = rightReport.overall_profile || {};

  const leftRating = leftProfile.overall_rating || 'Unknown';
  const rightRating = rightProfile.overall_rating || 'Unknown';

  const leftScore = resolveScore(leftReport, leftRating);
  const rightScore = resolveScore(rightReport, rightRating);

  const leftTone = scoreTone[leftRating] || scoreTone.Unknown;
  const rightTone = scoreTone[rightRating] || scoreTone.Unknown;

  const leftSummary = (leftProfile.summary_paragraph || '').split(/(?<=[.!?])\s+/)[0] || '';
  const rightSummary = (rightProfile.summary_paragraph || '').split(/(?<=[.!?])\s+/)[0] || '';

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
                Side-by-side view
              </p>
              <h1
                className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.6rem]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Compare products
              </h1>
              <p className="mt-2 text-sm text-[#5f5f5f]">
                See how two saved scans differ in score, summary, and ingredient depth.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          {[{ report: leftReport, rating: leftRating, score: leftScore, tone: leftTone, summary: leftSummary },
            { report: rightReport, rating: rightRating, score: rightScore, tone: rightTone, summary: rightSummary }]
            .map(({ report, rating, score, tone, summary }, index) => {
              const itemized = report.itemized_analysis || [];
              const analysisTimestamp = report.analysis_timestamp || Date.now();

              return (
                <div
                  key={index === 0 ? 'left' : 'right'}
                  className="rounded-[32px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8"
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#8b8579]">
                    {index === 0 ? 'Product A' : 'Product B'}
                  </p>
                  <h2
                    className="text-xl font-semibold tracking-[-0.03em] text-[#171717] sm:text-2xl"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    {report.product_name || 'Unknown product'}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#606060]">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${tone}`}>
                      {rating}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#f7f5f0] px-3 py-1">
                      <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                      {new Date(analysisTimestamp).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#f7f5f0] px-3 py-1">
                      <Heart className="mr-1.5 h-3.5 w-3.5" />
                      {itemized.length} ingredients
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-5">
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#18df13 ${score}%, #e8e2d7 ${score}% 100%)`,
                      }}
                    >
                      <div className="flex h-18 w-18 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                        <p className="text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
                          {score}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8a857b]">
                          fit
                        </p>
                      </div>
                    </div>
                    <p className="flex-1 text-sm leading-7 text-[#5b5b5b]">
                      {summary ||
                        'No summary was generated for this result yet. Scan again later for more detail.'}
                    </p>
                  </div>
                </div>
              );
            })}
        </section>
      </div>
    </div>
  );
};

export default CompareProducts;

