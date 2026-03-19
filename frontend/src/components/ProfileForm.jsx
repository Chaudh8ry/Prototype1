import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Info,
  Ruler,
  Save,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { profileAPI } from '../services/api';

const ageGroups = [
  { value: '0-11months', label: '0-11 months', icon: '👶', description: 'Critical growth period requiring breast milk or formula.' },
  { value: '1-4years', label: '1-4 years', icon: '🧒', description: 'Rapid development phase with high nutritional needs.' },
  { value: '5-9years', label: '5-9 years', icon: '👦', description: 'Balanced growth, learning, and active energy needs.' },
  { value: '10-19years', label: '10-19 years', icon: '🧑', description: 'Puberty and growth spurts increase nutrient demand.' },
  { value: '20-39years', label: '20-39 years', icon: '👨', description: 'Peak physical stage with maintenance-focused nutrition.' },
  { value: '40-59years', label: '40-59 years', icon: '👩', description: 'Metabolism slows and chronic risk factors matter more.' },
  { value: '60+years', label: '60+ years', icon: '👴', description: 'Bone, heart, and digestion support become more important.' },
];

const activityLevels = [
  { value: 'Sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'Lightly Active', label: 'Lightly Active', description: 'Exercise 1-3 days/week' },
  { value: 'Moderately Active', label: 'Moderately Active', description: 'Exercise 3-5 days/week' },
  { value: 'Very Active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
];

const nutritionData = {
  undernutrition: {
    title: 'Undernutrition',
    icon: '⚠️',
    color: 'from-[#fff4df] to-[#fff9ef]',
    items: [
      { name: 'Protein Energy Malnutrition', desc: 'Insufficient protein and calories affecting growth and development' },
      { name: 'Marasmus', desc: 'Severe malnutrition causing extreme weight loss and muscle wasting' },
      { name: 'Kwashiorkor', desc: 'Protein deficiency causing swelling, skin changes, and fatty liver' },
      { name: 'Stunting', desc: 'Chronic malnutrition leading to reduced height for age' },
      { name: 'Wasting', desc: 'Acute malnutrition causing low weight for height' },
      { name: 'Failure to Thrive', desc: 'Poor weight gain and growth in infants and children' },
    ],
  },
  micronutrientDeficiency: {
    title: 'Micronutrient Deficiencies',
    icon: '💊',
    color: 'from-[#eaf5ff] to-[#f4faff]',
    items: [
      { name: 'Iron Deficiency', desc: 'Low iron levels causing fatigue and anemia' },
      { name: 'Vitamin D Deficiency', desc: 'Insufficient vitamin D affecting bone health and immunity' },
      { name: 'Iodine Deficiency', desc: 'Low iodine affecting thyroid function and metabolism' },
      { name: 'Zinc Deficiency', desc: 'Poor wound healing, weakened immunity, and growth issues' },
      { name: 'Vitamin B12 Deficiency', desc: 'Affects nerve function and red blood cell formation' },
      { name: 'Folate Deficiency', desc: 'Important for DNA synthesis and preventing birth defects' },
      { name: 'Vitamin A Deficiency', desc: 'Affects vision, immunity, and skin health' },
      { name: 'Calcium Deficiency', desc: 'Weakens bones and teeth, affects muscle function' },
      { name: 'Magnesium Deficiency', desc: 'Causes muscle cramps, fatigue, and irregular heartbeat' },
      { name: 'Vitamin C Deficiency', desc: 'Affects collagen production and immune system' },
    ],
  },
  overnutrition: {
    title: 'Overnutrition & Weight Management',
    icon: '📈',
    color: 'from-[#ffe9e3] to-[#fff5f2]',
    items: [
      { name: 'Obesity', desc: 'Excess body fat increasing risk of health complications' },
      { name: 'Overweight', desc: 'Above normal weight range but below obesity threshold' },
      { name: 'Metabolic Syndrome', desc: 'Cluster of conditions increasing heart disease risk' },
      { name: 'Weight Management Goals', desc: 'Actively trying to lose, gain, or maintain weight' },
    ],
  },
  chronicDiseases: {
    title: 'Chronic Health Conditions',
    icon: '🏥',
    color: 'from-[#f0ebff] to-[#f8f5ff]',
    items: [
      { name: 'Type 2 Diabetes', desc: 'High blood sugar requiring careful carbohydrate management' },
      { name: 'Hypertension', desc: 'High blood pressure requiring low sodium intake' },
      { name: 'Cardiovascular Disease', desc: 'Heart conditions requiring low saturated fat and cholesterol' },
      { name: 'Fatty Liver Disease', desc: 'Liver condition requiring reduced sugar and refined carbs' },
      { name: 'Osteoporosis', desc: 'Weak bones requiring adequate calcium and vitamin D' },
      { name: 'Chronic Kidney Disease', desc: 'Kidney problems requiring protein and sodium restriction' },
      { name: 'High Cholesterol', desc: 'Elevated blood cholesterol requiring dietary fat management' },
      { name: 'GERD/Acid Reflux', desc: 'Stomach acid issues requiring avoiding trigger foods' },
      { name: 'Inflammatory Bowel Disease', desc: 'Digestive conditions requiring specific dietary modifications' },
      { name: 'Celiac Disease', desc: 'Autoimmune condition requiring strict gluten-free diet' },
      { name: 'Thyroid Disorders', desc: 'Thyroid conditions affecting metabolism and nutrient needs' },
      { name: 'PCOS', desc: 'Hormonal condition benefiting from low glycemic index foods' },
    ],
  },
  lifestyle: {
    title: 'Lifestyle & Dietary Preferences',
    icon: '🌱',
    color: 'from-[#eaf9e8] to-[#f6fdf5]',
    items: [
      { name: 'Vegetarian', desc: 'Plant-based diet excluding meat and fish' },
      { name: 'Vegan', desc: 'Plant-based diet excluding all animal products' },
      { name: 'Keto Diet', desc: 'Very low carb, high fat diet for weight loss' },
      { name: 'Low Carb Diet', desc: 'Reduced carbohydrate intake for blood sugar control' },
      { name: 'Mediterranean Diet', desc: 'Heart-healthy diet rich in fruits, vegetables, and olive oil' },
      { name: 'Low Sodium Diet', desc: 'Reduced salt intake for blood pressure management' },
      { name: 'High Protein Diet', desc: 'Increased protein for muscle building or weight loss' },
      { name: 'Intermittent Fasting', desc: 'Time-restricted eating pattern' },
    ],
  },
  specialNeeds: {
    title: 'Special Nutritional Needs',
    icon: '⭐',
    color: 'from-[#fff8d9] to-[#fffdf0]',
    items: [
      { name: 'Pregnancy', desc: 'Increased nutritional needs for fetal development' },
      { name: 'Breastfeeding', desc: 'Higher calorie and nutrient requirements' },
      { name: 'Athletic Training', desc: 'Increased energy and protein needs for performance' },
      { name: 'Recovery from Illness', desc: 'Enhanced nutrition to support healing process' },
      { name: 'Elderly Nutrition', desc: 'Age-related changes affecting nutrient absorption' },
      { name: 'Food Sensitivity', desc: 'Non-allergic adverse reactions to certain foods' },
    ],
  },
};

const commonAllergies = [
  'Milk/Dairy',
  'Eggs',
  'Peanuts',
  'Tree Nuts',
  'Fish',
  'Shellfish',
  'Wheat/Gluten',
  'Soy',
  'Sesame',
  'Sulfites',
  'Other',
];

const steps = [
  { id: 'identity', label: 'Profile' },
  { id: 'basics', label: 'Basics' },
  { id: 'metrics', label: 'Body' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'notes', label: 'Notes' },
];

const ProfileForm = ({ onBack, onProfileSaved, existingProfile = null, profiles = [], activeProfileId = null, canManageFamily = false }) => {
  const [profileId, setProfileId] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [relationship, setRelationship] = useState('Self');
  const [selectedAge, setSelectedAge] = useState('');
  const [selectedActivityLevel, setSelectedActivityLevel] = useState('');
  const [nutritionConditions, setNutritionConditions] = useState({
    undernutrition: [],
    micronutrientDeficiency: [],
    overnutrition: [],
    chronicDiseases: [],
    lifestyle: [],
    specialNeeds: [],
  });
  const [allergies, setAllergies] = useState([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [bodyMetrics, setBodyMetrics] = useState({
    height: '',
    weight: '',
    unit: 'metric',
  });
  const [expandedSections, setExpandedSections] = useState({
    undernutrition: false,
    micronutrientDeficiency: false,
    overnutrition: false,
    chronicDiseases: true,
    lifestyle: false,
    specialNeeds: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (existingProfile) {
      populateProfileForm(existingProfile);
    } else {
      setProfileId(null);
      setProfileName('');
      setRelationship('Self');
    }
  }, [existingProfile]);

  const populateProfileForm = (profile) => {
    setProfileId(profile._id || null);
    setProfileName(profile.profile_name || '');
    setRelationship(profile.relationship || 'Self');
    setSelectedAge(profile.age_group || '');
    setSelectedActivityLevel(profile.activity_level || '');
    setAllergies(profile.allergies || []);
    setCustomAllergy(profile.custom_allergy || '');
    setAdditionalInfo(profile.additional_info || '');

    if (profile.body_metrics) {
      setBodyMetrics({
        height: profile.body_metrics.height || '',
        weight: profile.body_metrics.weight || '',
        unit: profile.body_metrics.unit || 'metric',
      });
    } else {
      setBodyMetrics({
        height: '',
        weight: '',
        unit: 'metric',
      });
    }

    const conditions = {
      undernutrition: [],
      micronutrientDeficiency: [],
      overnutrition: [],
      chronicDiseases: [],
      lifestyle: [],
      specialNeeds: [],
    };

    if (profile.health_conditions) {
      profile.health_conditions.forEach((hc) => {
        if (conditions[hc.category]) {
          conditions[hc.category].push(hc.condition);
        }
      });
    }

    setNutritionConditions(conditions);
    setError('');
  };

  const completedSteps = useMemo(() => {
    const conditionCount = Object.values(nutritionConditions).reduce((total, items) => total + items.length, 0);
    return [
      Boolean(profileName.trim()),
      Boolean(selectedAge && selectedActivityLevel),
      Boolean(bodyMetrics.height && bodyMetrics.weight),
      Boolean(conditionCount),
      Boolean(allergies.length),
      Boolean(additionalInfo.trim()),
    ];
  }, [selectedAge, selectedActivityLevel, bodyMetrics, nutritionConditions, allergies, additionalInfo]);

  const completionPercent = Math.round(
    (completedSteps.filter(Boolean).length / completedSteps.length) * 100
  );

  const handleNutritionConditionChange = (category, conditionName) => {
    setNutritionConditions((prev) => ({
      ...prev,
      [category]: prev[category].includes(conditionName)
        ? prev[category].filter((item) => item !== conditionName)
        : [...prev[category], conditionName],
    }));
  };

  const handleAllergyChange = (allergy) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((item) => item !== allergy) : [...prev, allergy]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resetForNewProfile = () => {
    setProfileId(null);
    setProfileName('');
    setRelationship('Family member');
    setSelectedAge('');
    setSelectedActivityLevel('');
    setNutritionConditions({
      undernutrition: [],
      micronutrientDeficiency: [],
      overnutrition: [],
      chronicDiseases: [],
      lifestyle: [],
      specialNeeds: [],
    });
    setAllergies([]);
    setCustomAllergy('');
    setAdditionalInfo('');
    setBodyMetrics({
      height: '',
      weight: '',
      unit: 'metric',
    });
    setError('');
  };

  const handleDeleteProfile = async (id) => {
    if (!window.confirm('Delete this family profile? This cannot be undone.')) {
      return;
    }

    try {
      const response = await profileAPI.deleteProfile(id);
      const nextProfiles = response.data.profiles || [];
      const nextActiveId = response.data.active_profile_id || nextProfiles[0]?._id || null;
      const nextActiveProfile =
        nextProfiles.find((profile) => profile._id === nextActiveId) || nextProfiles[0] || null;

      onProfileSaved(nextActiveProfile, nextProfiles, nextActiveId);
    } catch (deleteError) {
      console.error('Delete profile error:', deleteError);
      setError(deleteError.response?.data?.message || 'Failed to delete profile.');
    }
  };

  const calculateBMI = () => {
    const { height, weight, unit } = bodyMetrics;
    if (!height || !weight) return null;

    let heightInM;
    let weightInKg;

    if (unit === 'metric') {
      heightInM = parseFloat(height) / 100;
      weightInKg = parseFloat(weight);
    } else {
      heightInM = parseFloat(height) * 0.3048;
      weightInKg = parseFloat(weight) * 0.453592;
    }

    const bmi = weightInKg / (heightInM * heightInM);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { category: 'Underweight', tone: 'text-sky-600' };
    if (bmiValue < 25) return { category: 'Normal', tone: 'text-emerald-600' };
    if (bmiValue < 30) return { category: 'Overweight', tone: 'text-amber-600' };
    return { category: 'Obese', tone: 'text-rose-600' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!profileName.trim()) {
      setError('Please add a name for this family profile');
      return;
    }

    if (!selectedAge) {
      setError('Please select your age group');
      return;
    }

    if (!selectedActivityLevel) {
      setError('Please select your activity level');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const healthConditions = [];
      Object.entries(nutritionConditions).forEach(([category, conditions]) => {
        conditions.forEach((condition) => {
          healthConditions.push({
            category,
            condition,
          });
        });
      });

      const profileData = {
        ...(profileId ? { profile_id: profileId } : {}),
        profile_name: profileName,
        relationship,
        age_group: selectedAge,
        activity_level: selectedActivityLevel,
        allergies,
        custom_allergy: allergies.includes('Other') ? customAllergy.trim() : '',
        health_conditions: healthConditions,
        dietary_preferences: [],
        additional_info: additionalInfo,
        body_metrics: bodyMetrics,
      };

      const response = await profileAPI.saveProfile(profileData);

      setSuccess(true);
      setTimeout(() => {
        onProfileSaved(
          response.data.profile,
          response.data.profiles || [],
          response.data.active_profile_id || response.data.profile?._id,
        );
      }, 1500);
    } catch (saveError) {
      console.error('Profile save error:', saveError);
      setError(saveError.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalConditions = Object.values(nutritionConditions).reduce((total, arr) => total + arr.length, 0);
  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  const summaryItems = [
    {
      label: 'Profile',
      value: profileName ? `${profileName} · ${relationship}` : 'Not set',
    },
    {
      label: 'Age group',
      value: ageGroups.find((group) => group.value === selectedAge)?.label || 'Not selected',
    },
    {
      label: 'Activity',
      value: selectedActivityLevel || 'Not selected',
    },
    {
      label: 'Conditions',
      value: totalConditions ? `${totalConditions} selected` : 'None selected',
    },
    {
      label: 'Allergies',
      value: allergies.length ? `${allergies.length} selected` : 'None selected',
    },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 text-center shadow-[0_24px_60px_rgba(56,78,61,0.10)]">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#1be51c] text-[#111] shadow-[0_16px_34px_rgba(30,225,25,0.24)]">
            <Check className="h-10 w-10" />
          </div>
          <h2
            className="text-3xl font-semibold tracking-[-0.03em] text-[#171717]"
            style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
          >
            Profile saved
          </h2>
          <p className="mt-3 text-base leading-7 text-[#5f5f5f]">
            {profileName || 'This family member'} is ready. We&apos;ll now use this profile to tailor every food analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-10 rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f6f0] text-[#3d4740]"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <div className="mb-3 inline-flex items-center rounded-full bg-[#eef9eb] px-3 py-1 text-xs font-medium text-[#2f7a38]">
                    Personalized onboarding
                  </div>
                  <h1
                    className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2.8rem]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Build your health profile
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[#595959]">
                    A few thoughtful details help InnerVerse turn ingredient scans into relevant, profile-aware guidance.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-sm rounded-[28px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] p-5 lg:max-w-md">
                <div className="flex items-center justify-between text-sm font-medium text-[#345c3c]">
                  <span>Profile completeness</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#18df13]"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#4d604f]">
                  We only require age group and activity level. Everything else makes the analysis sharper.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${
                    completedSteps[index]
                      ? 'bg-[#17e10f] text-[#111111]'
                      : 'bg-[#f4f1ea] text-[#77736c]'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </header>

          {error && (
            <div className="mb-6 rounded-[24px] border border-[#efc0c0] bg-[#fff1f1] px-5 py-4 text-sm text-[#a33737]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.06fr_0.78fr]">
              <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
                <div className="mb-8 rounded-[28px] bg-[#f7f5f0] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a857b]">Family profiles</p>
                      <p className="mt-1 text-sm text-[#5f5f5f]">Create a dedicated health setup for each person you scan for.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profiles.length > 0 && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6e685d]">
                          {profiles.length} total
                        </span>
                      )}
                      {canManageFamily && (
                        <button
                          type="button"
                          onClick={resetForNewProfile}
                          className="rounded-full bg-[#111111] px-3 py-1 text-xs font-medium text-white"
                        >
                          + New member
                        </button>
                      )}
                    </div>
                  </div>
                  {!canManageFamily && (
                    <div className="mb-4 rounded-[18px] border border-[#e7dfd4] bg-white px-4 py-3 text-sm text-[#6b665d]">
                      Switch back to your main profile to add or delete family members.
                    </div>
                  )}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {profiles.map((profile) => (
                      <button
                        key={profile._id}
                        type="button"
                        onClick={() => populateProfileForm(profile)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          profile._id === profileId
                            ? 'bg-[#111111] text-white'
                            : 'bg-white text-[#4d4d4d]'
                        }`}
                      >
                        {profile.profile_name}
                      </button>
                    ))}
                  </div>
                  {profiles.length > 0 && (
                    <div className="space-y-2">
                      {profiles.map((profile) => (
                        <div
                          key={`${profile._id}-row`}
                          className="flex items-center justify-between rounded-[18px] bg-white px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#171717]">
                              {profile.profile_name}
                            </p>
                            <p className="text-xs text-[#7b7b7b]">
                              {profile.relationship || 'Family member'}
                              {profile._id === activeProfileId ? ' · Active now' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => populateProfileForm(profile)}
                              className="rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                            >
                              Edit
                            </button>
                            {canManageFamily && profiles.length > 1 && !profile.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(profile._id)}
                                className="inline-flex items-center rounded-full bg-[#fff1f1] px-3 py-1.5 text-xs font-medium text-[#b23b3b]"
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#8b8579]">
                        Profile name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="e.g., Meera or Dad"
                        className="w-full rounded-[18px] border border-[#ddd6c9] bg-white px-4 py-3 text-sm text-[#171717]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#8b8579]">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        placeholder="Self, Child, Parent, Partner"
                        className="w-full rounded-[18px] border border-[#ddd6c9] bg-white px-4 py-3 text-sm text-[#171717]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8ee]">
                    <Heart className="h-6 w-6 text-[#2f7a38]" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Step 1. Your baseline
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">Why we ask this: age group and activity level shape how we interpret food fit.</p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7d7d7d]">Age group</p>
                    <span className="rounded-full bg-[#f4f8f2] px-3 py-1 text-xs font-medium text-[#5f6d60]">
                      Required
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {ageGroups.map((group) => (
                      <button
                        key={group.value}
                        type="button"
                        onClick={() => setSelectedAge(group.value)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          selectedAge === group.value
                            ? 'border-[#20dc18] bg-[#f1ffee] shadow-[0_14px_28px_rgba(31,220,24,0.10)]'
                            : 'border-[#e8e1d4] bg-[#fcfbf8] hover:border-[#d8d1c5]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{group.icon}</span>
                          <div>
                            <p className="text-base font-semibold text-[#171717]">{group.label}</p>
                            <p className="mt-1 text-sm leading-6 text-[#666666]">{group.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7d7d7d]">Activity level</p>
                    <span className="rounded-full bg-[#f4f8f2] px-3 py-1 text-xs font-medium text-[#5f6d60]">
                      Required
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {activityLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setSelectedActivityLevel(level.value)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          selectedActivityLevel === level.value
                            ? 'border-[#20dc18] bg-[#f1ffee] shadow-[0_14px_28px_rgba(31,220,24,0.10)]'
                            : 'border-[#e8e1d4] bg-[#fcfbf8] hover:border-[#d8d1c5]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Activity className="mt-1 h-5 w-5 text-[#3b4b40]" />
                          <div>
                            <p className="text-base font-semibold text-[#171717]">{level.label}</p>
                            <p className="mt-1 text-sm leading-6 text-[#666666]">{level.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="rounded-[32px] bg-[linear-gradient(135deg,#ffffff_0%,#f9fbf8_100%)] p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10 xl:sticky xl:top-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef9eb]">
                    <Sparkles className="h-6 w-6 text-[#2f7a38]" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Profile snapshot
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">A quick view of what your analysis will use.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-[22px] bg-[#f7f5f0] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8a857b]">{item.label}</p>
                      <p className="mt-2 text-base font-semibold text-[#171717]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[22px] bg-[linear-gradient(135deg,#ecffe8_0%,#f9fff7_100%)] px-4 py-4">
                  <p className="text-sm font-medium text-[#2f7a38]">What improves accuracy most</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#546256]">
                    <li>Age group and activity level are the essentials.</li>
                    <li>Allergies and conditions improve warnings and fit.</li>
                    <li>Additional context makes results feel more personal.</li>
                  </ul>
                </div>
              </aside>
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff]">
                  <Ruler className="h-6 w-6 text-[#3468a8]" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                    style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                  >
                    Step 2. Body metrics
                  </h2>
                  <p className="text-sm text-[#6a6a6a]">Why we ask this: height and weight help make nutrition guidance more precise.</p>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setBodyMetrics((prev) => ({ ...prev, unit: 'metric', height: '', weight: '' }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    bodyMetrics.unit === 'metric'
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#f4f1ea] text-[#5e5a55]'
                  }`}
                >
                  Metric (cm / kg)
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMetrics((prev) => ({ ...prev, unit: 'imperial', height: '', weight: '' }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    bodyMetrics.unit === 'imperial'
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#f4f1ea] text-[#5e5a55]'
                  }`}
                >
                  Imperial (ft / lbs)
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a4a4a]">
                      Height {bodyMetrics.unit === 'metric' ? '(cm)' : '(feet)'}
                    </label>
                  <input
                    type="number"
                    value={bodyMetrics.height}
                    onChange={(e) => setBodyMetrics((prev) => ({ ...prev, height: e.target.value }))}
                    placeholder={bodyMetrics.unit === 'metric' ? '170' : '5.7'}
                    step={bodyMetrics.unit === 'metric' ? '1' : '0.1'}
                    className="w-full rounded-[18px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4a4a4a]">
                    Weight {bodyMetrics.unit === 'metric' ? '(kg)' : '(lbs)'}
                  </label>
                  <input
                    type="number"
                    value={bodyMetrics.weight}
                    onChange={(e) => setBodyMetrics((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder={bodyMetrics.unit === 'metric' ? '70' : '154'}
                    step={bodyMetrics.unit === 'metric' ? '0.1' : '1'}
                    className="w-full rounded-[18px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-3"
                  />
                </div>
              </div>

              {bmi && (
                <div className="mt-6 rounded-[24px] bg-[#f5f7fa] px-5 py-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#4a4a4a]">Estimated BMI</p>
                      <p className="text-sm text-[#7b7b7b]">This helps us calibrate food suitability a little better.</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-semibold text-[#171717]">{bmi}</p>
                      {bmiCategory && <p className={`text-sm font-medium ${bmiCategory.tone}`}>{bmiCategory.category}</p>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3ecff]">
                    <Shield className="h-6 w-6 text-[#6b46c1]" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Step 3. Health conditions and preferences
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">Why we ask this: the right warnings depend on your real health context, not generic rules.</p>
                  </div>
                </div>
                {totalConditions > 0 && (
                  <div className="rounded-full bg-[#eef9eb] px-4 py-2 text-sm font-medium text-[#2f7a38]">
                    {totalConditions} selected
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {Object.entries(nutritionData).map(([key, data]) => (
                  <div key={key} className={`overflow-hidden rounded-[28px] bg-gradient-to-br ${data.color}`}>
                    <button
                      type="button"
                      onClick={() => toggleSection(key)}
                      className="flex w-full items-center justify-between px-5 py-5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{data.icon}</span>
                        <div>
                          <p className="text-lg font-semibold text-[#171717]">{data.title}</p>
                          <p className="text-sm text-[#626262]">{nutritionConditions[key].length ? `${nutritionConditions[key].length} selected` : 'Tap to review options'}</p>
                        </div>
                      </div>
                      {expandedSections[key] ? (
                        <ChevronUp className="h-5 w-5 text-[#4d4d4d]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#4d4d4d]" />
                      )}
                    </button>

                    {expandedSections[key] && (
                      <div className="grid gap-3 px-5 pb-5 xl:grid-cols-2">
                        {data.items.map((item) => {
                          const selected = nutritionConditions[key].includes(item.name);
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => handleNutritionConditionChange(key, item.name)}
                              className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                selected
                                  ? 'border-[#1fe114] bg-white shadow-[0_12px_24px_rgba(31,225,20,0.08)]'
                                  : 'border-white/70 bg-white/70 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                                    selected ? 'border-[#18df13] bg-[#18df13]' : 'border-[#cbc5ba] bg-white'
                                  }`}
                                >
                                  {selected && <Check className="h-3 w-3 text-[#111]" />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#171717]">{item.name}</p>
                                  <p className="mt-1 text-sm leading-6 text-[#666666]">{item.desc}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
              <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f0]">
                    <AlertCircle className="h-6 w-6 text-[#d04c4c]" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Step 4. Allergies and intolerances
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">Why we ask this: these should always be flagged first in a scan.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-2">
                  {commonAllergies.map((allergy) => {
                    const selected = allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => handleAllergyChange(allergy)}
                        className={`rounded-[20px] border px-4 py-3 text-left text-sm font-medium transition ${
                          selected
                            ? 'border-[#ff8080] bg-[#fff3f3] text-[#9a4040]'
                            : 'border-[#e6dfd4] bg-[#fcfbf8] text-[#555]'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>

                {allergies.includes('Other') && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-[#4a4a4a]">
                      Specify other allergy
                    </label>
                    <input
                      type="text"
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      placeholder="e.g., Mustard, Coconut, Kiwi"
                      className="w-full rounded-[18px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-3"
                    />
                    <p className="mt-2 text-xs text-[#7a7a7a]">
                      Add the exact allergy so it can be flagged in future scans.
                    </p>
                  </div>
                )}

                {allergies.length > 0 && (
                  <div className="mt-5 rounded-[22px] bg-[#fff5f5] px-4 py-4">
                    <p className="text-sm font-medium text-[#9a4040]">Selected allergies</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {allergies.map((allergy) => (
                        <span key={allergy} className="rounded-full bg-white px-3 py-1 text-sm text-[#9a4040]">
                          {allergy === 'Other' && customAllergy.trim()
                            ? `Other: ${customAllergy.trim()}`
                            : allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(56,78,61,0.08)] sm:p-8 lg:p-10">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff]">
                    <Info className="h-6 w-6 text-[#3569a7]" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold tracking-[-0.03em] text-[#171717]"
                      style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                    >
                      Step 5. Additional context
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">Optional notes, medications, goals, or anything we should keep in mind.</p>
                  </div>
                </div>

                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Examples: trying to reduce sodium, managing sugar intake, taking medication that affects appetite, avoiding processed snacks..."
                  className="min-h-[220px] w-full rounded-[24px] border border-[#ddd6c9] bg-[#faf9f6] px-4 py-4 text-sm leading-7"
                />

                <div className="mt-5 rounded-[22px] bg-[#f6fbf4] px-4 py-4 text-sm leading-6 text-[#546256]">
                  <div className="mb-2 flex items-center gap-2 font-medium text-[#2f7a38]">
                    <Sparkles className="h-4 w-4" />
                    What helps most
                  </div>
                  Specific details such as digestive issues, blood sugar concerns, pregnancy, or food sensitivities can improve the relevance of the final analysis.
                </div>
              </div>
            </section>

            <section className="sticky bottom-4 z-10">
              <div className="rounded-[32px] bg-white/95 p-5 shadow-[0_24px_60px_rgba(56,78,61,0.14)] backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {existingProfile ? 'Update your profile' : 'Save your profile'}
                    </p>
                    <p className="text-sm text-[#767676]">
                      Required: age group and activity level. Optional fields improve precision.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {(!selectedAge || !selectedActivityLevel) && (
                      <div className="rounded-full bg-[#fff4d8] px-4 py-2 text-sm font-medium text-[#8c6b1d]">
                        {!selectedAge && !selectedActivityLevel
                          ? 'Choose age group and activity level'
                          : !selectedAge
                            ? 'Choose age group'
                            : 'Choose activity level'}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !selectedAge || !selectedActivityLevel}
                      className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold transition ${
                        loading || !selectedAge || !selectedActivityLevel
                          ? 'cursor-not-allowed bg-[#d8d8d8] text-[#767676]'
                          : 'bg-[#16df11] text-[#111111] shadow-[0_18px_34px_rgba(31,220,24,0.24)] hover:translate-y-[-1px]'
                      }`}
                    >
                      <Save className="mr-3 h-5 w-5" />
                      {loading ? 'Saving profile...' : existingProfile ? 'Update Profile' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
