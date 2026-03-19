import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Edit3,
  Info,
  Scan,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { analysisAPI } from '../services/api';

const ConfirmationView = ({ data, onBack, onAnalysisComplete, activeProfileId }) => {
  const initialList =
    data.scanned_ingredients_list ||
    (data.ingredients_list
      ? data.ingredients_list.map((ing) => ({
          ingredient: ing,
          percent: null,
        }))
      : []);

  const initialNutritionTable = data.scanned_nutrition_table || {};

  const [scannedIngredients, setScannedIngredients] = useState(
    initialList.map((item) => ({
      ...item,
      editedByUser: false,
    })),
  );
  const [nutritionTable, setNutritionTable] = useState(
    Object.entries(initialNutritionTable).map(([name, value]) => ({
      name,
      value,
      editedByUser: false,
    })),
  );
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ingredientPreview = useMemo(
    () =>
      scannedIngredients
        .map((item) =>
          item.percent ? `${item.ingredient} (${item.percent})` : item.ingredient,
        )
        .join(', '),
    [scannedIngredients],
  );

  const lowConfidenceCount = useMemo(
    () =>
      scannedIngredients.filter(
        (item) => typeof item.confidence === 'number' && item.confidence < 0.7,
      ).length,
    [scannedIngredients],
  );

  const handleConfirmAndAnalyze = async () => {
    setLoading(true);
    setError('');

    try {
      if (scannedIngredients.length === 0) {
        setError('Please provide at least one ingredient');
        setLoading(false);
        return;
      }

      const payloadIngredients = scannedIngredients.map(
        ({ ingredient, percent, confidence }) => ({
          ingredient,
          percent,
          ...(typeof confidence === 'number' ? { confidence } : {}),
        }),
      );

      const payloadNutritionTable = nutritionTable.reduce((acc, row) => {
        if (row.name && row.value) {
          acc[row.name] = row.value;
        }
        return acc;
      }, {});

      const response = await analysisAPI.analyzeIngredients(
        payloadIngredients,
        productName,
        payloadNutritionTable,
        activeProfileId,
      );

      onAnalysisComplete({
        step: 'results',
        report: response.data.report,
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to analyze ingredients. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIngredientChange = (index, field, value) => {
    setScannedIngredients((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
              editedByUser: true,
            }
          : item,
      ),
    );
  };

  const handleAddIngredient = () => {
    setScannedIngredients((prev) => [
      ...prev,
      { ingredient: '', percent: null, editedByUser: true },
    ]);
  };

  const handleRemoveIngredient = (index) => {
    setScannedIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNutritionRowChange = (index, field, value) => {
    setNutritionTable((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              editedByUser: true,
            }
          : row,
      ),
    );
  };

  const handleAddNutritionRow = () => {
    setNutritionTable((prev) => [
      ...prev,
      { name: '', value: '', editedByUser: true },
    ]);
  };

  const handleRemoveNutritionRow = (index) => {
    setNutritionTable((prev) => prev.filter((_, i) => i !== index));
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
                Step 2 · OCR review
              </p>
              <h1
                className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.7rem]"
                style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
              >
                Confirm what we scanned
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[#5f5f5f]">
                InnerVerse has read your label. This is where you make sure the
                ingredients and nutrition facts look right before we generate
                your personalized report.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-5 py-4 shadow-[0_20px_50px_rgba(56,78,61,0.10)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#5c755f]">
              Scan journey
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-[#16df11] px-3 py-1 text-[#111111]">
                1. Capture · done
              </span>
              <span className="rounded-full bg-[#111111] px-3 py-1 text-white">
                2. Review &amp; edit · now
              </span>
              <span className="rounded-full bg-[#f1ece0] px-3 py-1 text-[#6e685d]">
                3. Personalized report · next
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-[24px] border border-[#efc0c0] bg-[#fff1f1] px-5 py-4 text-sm text-[#a33737]">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
              <div className="border-b border-[#e7dfd4] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ff]">
                    <ShieldCheck className="h-5 w-5 text-[#2f6b37]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">
                      Original label capture
                    </p>
                    <p className="text-xs text-[#7a7a7a]">
                      This is the image we used for extraction.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5 pt-4">
                <div className={`grid gap-3 overflow-hidden rounded-[24px] bg-[#f5f7f4] p-3 ${data.imageUrls?.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {(data.imageUrls?.length ? data.imageUrls : [data.imageUrl]).filter(Boolean).map((image, index) => (
                    <img
                      key={`review-image-${index}`}
                      src={image}
                      alt={`Food label ${index + 1}`}
                      className="max-h-[420px] w-full rounded-[18px] object-contain"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-[linear-gradient(135deg,#ffffff_0%,#f7fbf5_100%)] px-5 py-4 shadow-[0_16px_36px_rgba(56,78,61,0.08)]">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#18df13]" />
                <p className="text-sm font-semibold text-[#171717]">
                  What this step does
                </p>
              </div>
              <ul className="space-y-1 text-sm leading-6 text-[#535a52]">
                <li>• Ingredients marked &quot;AI extracted&quot; come from OCR.</li>
                <li>• Anything you adjust becomes &quot;User confirmed&quot;.</li>
                <li>
                  • We only move forward once you&apos;re comfortable with this
                  view.
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef9eb]">
                    <Edit3 className="h-5 w-5 text-[#2f7a38]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">
                      Step 2A
                    </p>
                    <p className="text-base font-semibold text-[#171717]">
                      Ingredients and product name
                    </p>
                  </div>
                </div>
                {lowConfidenceCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-medium text-[#8c6b1d]">
                    {lowConfidenceCount} low-confidence items
                  </span>
                )}
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#8b8579]">
                  Product name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Organic Multigrain Breakfast Cereal"
                  className="w-full rounded-[18px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-3 text-sm text-[#171717]"
                />
                <p className="mt-1 text-xs text-[#8a8a8a]">
                  Optional · helps you recognize this scan later.
                </p>
              </div>

              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8b8579]">
                  Ingredients ({scannedIngredients.length || 0})
                </p>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-medium text-white"
                >
                  + Add ingredient
                </button>
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                {scannedIngredients.length === 0 ? (
                  <div className="rounded-[20px] bg-[#f7f5f0] px-4 py-4 text-sm text-[#5f5f5f]">
                    No ingredients were detected. Add at least one ingredient to
                    continue.
                  </div>
                ) : (
                  scannedIngredients.map((item, index) => {
                    const isLowConfidence =
                      typeof item.confidence === 'number' &&
                      item.confidence < 0.7;
                    const badgeTone = item.editedByUser
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#eef1f5] text-[#5f6670]';

                    return (
                      <div
                        key={`${item.ingredient || 'ingredient'}-${index}`}
                        className="rounded-[22px] border border-[#e7dfd4] bg-[#fbfaf7] px-4 py-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}
                            >
                              {item.editedByUser
                                ? 'User confirmed'
                                : 'AI extracted'}
                            </span>
                            {isLowConfidence && (
                              <span className="inline-flex items-center rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-medium text-[#8c6b1d]">
                                Low confidence
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="text-xs text-[#9a9489] hover:text-[#5c564c]"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] sm:gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[#6a6a6a]">
                              Ingredient
                            </label>
                            <input
                              type="text"
                              value={item.ingredient || ''}
                              onChange={(e) =>
                                handleIngredientChange(
                                  index,
                                  'ingredient',
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-[16px] border border-[#ddd6c9] bg-[#faf9f6] px-3 py-2 text-sm text-[#171717]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[#6a6a6a]">
                              Percentage (optional)
                            </label>
                            <input
                              type="text"
                              value={item.percent || ''}
                              onChange={(e) =>
                                handleIngredientChange(
                                  index,
                                  'percent',
                                  e.target.value,
                                )
                              }
                              placeholder="e.g., 46%"
                              className="w-full rounded-[16px] border border-[#ddd6c9] bg-[#faf9f6] px-3 py-2 text-sm text-[#171717]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff]">
                    <Info className="h-5 w-5 text-[#3569a7]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">
                      Step 2B
                    </p>
                    <p className="text-base font-semibold text-[#171717]">
                      Nutrition facts table
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddNutritionRow}
                  className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-medium text-white"
                >
                  + Add row
                </button>
              </div>

              <p className="mb-3 text-xs text-[#7a7a7a]">
                Optional but helpful · edit any values that look off. We use
                this to understand sugar, sodium, fats, and more.
              </p>

              <div className="max-h-[260px] space-y-2 overflow-y-auto pr-2">
                {nutritionTable.length === 0 ? (
                  <div className="rounded-[20px] bg-[#f7f5f0] px-4 py-4 text-sm text-[#5f5f5f]">
                    No nutrition facts were captured. Add rows if you want this
                    report to reflect label values.
                  </div>
                ) : (
                  nutritionTable.map((row, index) => (
                    <div
                      key={`${row.name || 'nutrient'}-${index}`}
                      className="grid items-center gap-2 rounded-[18px] bg-[#f7f5f0] px-3 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                    >
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          handleNutritionRowChange(
                            index,
                            'name',
                            e.target.value,
                          )
                        }
                        placeholder="Nutrient (e.g., Sodium)"
                        className="w-full rounded-[14px] border border.transparent bg-white/70 px-3 py-2 text-sm text-[#171717]"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) =>
                          handleNutritionRowChange(
                            index,
                            'value',
                            e.target.value,
                          )
                        }
                        placeholder="Value (e.g., 150mg)"
                        className="w-full rounded-[14px] border border-transparent bg.white/70 px-3 py-2 text-sm text-[#171717]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNutritionRow(index)}
                        className="ml-1 rounded-full px-3 py-1 text-xs font-medium text-[#8a857b] hover:bg-[#e8e1d4]"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">
                  Quick ingredient preview
                </p>
                <p className="mt-1 text-sm text-[#5f5f5f]">
                  A fast glance at how this label reads.
                </p>
              </div>
              <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-medium text-[#6e685d]">
                {scannedIngredients.length} items
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredientPreview
                .split(',')
                .map((ingredient) => ingredient.trim())
                .filter(Boolean)
                .map((ingredient, index) => (
                  <span
                    key={`${ingredient}-${index}`}
                    className="rounded-full bg-[#f3ecff] px-3 py-1 text-xs text-[#4b3a7a]"
                  >
                    {ingredient}
                  </span>
                ))}
              {!ingredientPreview && (
                <p className="text-sm text-[#8a8a8a]">
                  Your ingredient list will appear here as you fill it in.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-6 py-5 shadow-[0_18px_40px_rgba(56,78,61,0.10)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80">
                <Sparkles className="h-4 w-4 text-[#18df13]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#171717]">
                  Ready to continue?
                </p>
                <p className="text-xs text-[#5f5f5f]">
                  You&apos;ll always be able to come back and rescan later.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#4d4d4d] shadow-[0_10px_24px_rgba(56,78,61,0.08)]"
              >
                Back to scanner
              </button>
              <button
                type="button"
                onClick={handleConfirmAndAnalyze}
                disabled={loading || scannedIngredients.length === 0}
                className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  loading || scannedIngredients.length === 0
                    ? 'cursor-not-allowed bg-[#d8d8d8] text-[#767676]'
                    : 'bg-[#16df11] text-[#111111] shadow-[0_18px_34px_rgba(31,220,24,0.24)] hover:translate-y-[-1px]'
                }`}
              >
                {loading ? (
                  <>
                    <Scan className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm &amp; analyze
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConfirmationView;
