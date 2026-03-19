import React, { useState } from 'react';
import { Upload, Camera, ChevronDown, ChevronUp, Info, Heart, Shield, AlertCircle } from 'lucide-react';

const InnerVerse = () => {
  const [selectedAge, setSelectedAge] = useState('');
  const [nutritionConditions, setNutritionConditions] = useState({
    undernutrition: [],
    micronutrientDeficiency: [],
    overnutrition: [],
    chronicDiseases: [],
    lifestyle: [],
    specialNeeds: []
  });
  const [allergies, setAllergies] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [bodyMetrics, setBodyMetrics] = useState({
    height: '',
    weight: '',
    unit: 'metric'
  });
  const [expandedSections, setExpandedSections] = useState({
    undernutrition: false,
    micronutrientDeficiency: false,
    overnutrition: false,
    chronicDiseases: false,
    lifestyle: false,
    specialNeeds: false
  });

  const ageGroups = [
    { value: '0-11months', label: '0-11 months (Infants)', icon: '👶', description: 'Critical growth period requiring breast milk or formula' },
    { value: '1-4years', label: '1-4 years (Young Children)', icon: '🧒', description: 'Rapid development phase with high nutritional needs' },
    { value: '5-9years', label: '5-9 years (School Age)', icon: '👦', description: 'Active growth requiring balanced nutrition for learning' },
    { value: '10-19years', label: '10-19 years (Adolescents)', icon: '🧑', description: 'Puberty and growth spurts need extra calories and nutrients' },
    { value: '20-39years', label: '20-39 years (Young Adults)', icon: '👨', description: 'Peak physical condition, focus on maintaining health' },
    { value: '40-59years', label: '40-59 years (Middle Age)', icon: '👩', description: 'Metabolism slows, increased risk of chronic diseases' },
    { value: '60+years', label: '60+ years (Older Adults)', icon: '👴', description: 'Focus on bone health, heart health, and easy digestion' }
  ];

  const nutritionData = {
    undernutrition: {
      title: 'Undernutrition',
      icon: '⚠️',
      color: 'bg-orange-50 border-orange-200',
      items: [
        { name: 'Protein Energy Malnutrition', desc: 'Insufficient protein and calories affecting growth and development' },
        { name: 'Marasmus', desc: 'Severe malnutrition causing extreme weight loss and muscle wasting' },
        { name: 'Kwashiorkor', desc: 'Protein deficiency causing swelling, skin changes, and fatty liver' },
        { name: 'Stunting', desc: 'Chronic malnutrition leading to reduced height for age' },
        { name: 'Wasting', desc: 'Acute malnutrition causing low weight for height' },
        { name: 'Failure to Thrive', desc: 'Poor weight gain and growth in infants and children' }
      ]
    },
    micronutrientDeficiency: {
      title: 'Micronutrient Deficiencies',
      icon: '💊',
      color: 'bg-blue-50 border-blue-200',
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
        { name: 'Vitamin C Deficiency', desc: 'Affects collagen production and immune system' }
      ]
    },
    overnutrition: {
      title: 'Overnutrition & Weight Management',
      icon: '📈',
      color: 'bg-red-50 border-red-200',
      items: [
        { name: 'Obesity', desc: 'Excess body fat increasing risk of health complications' },
        { name: 'Overweight', desc: 'Above normal weight range but below obesity threshold' },
        { name: 'Metabolic Syndrome', desc: 'Cluster of conditions increasing heart disease risk' },
        { name: 'Weight Management Goals', desc: 'Actively trying to lose, gain, or maintain weight' }
      ]
    },
    chronicDiseases: {
      title: 'Chronic Health Conditions',
      icon: '🏥',
      color: 'bg-purple-50 border-purple-200',
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
        { name: 'PCOS', desc: 'Hormonal condition benefiting from low glycemic index foods' }
      ]
    },
    lifestyle: {
      title: 'Lifestyle & Dietary Preferences',
      icon: '🌱',
      color: 'bg-green-50 border-green-200',
      items: [
        { name: 'Vegetarian', desc: 'Plant-based diet excluding meat and fish' },
        { name: 'Vegan', desc: 'Plant-based diet excluding all animal products' },
        { name: 'Keto Diet', desc: 'Very low carb, high fat diet for weight loss' },
        { name: 'Low Carb Diet', desc: 'Reduced carbohydrate intake for blood sugar control' },
        { name: 'Mediterranean Diet', desc: 'Heart-healthy diet rich in fruits, vegetables, and olive oil' },
        { name: 'Low Sodium Diet', desc: 'Reduced salt intake for blood pressure management' },
        { name: 'High Protein Diet', desc: 'Increased protein for muscle building or weight loss' },
        { name: 'Intermittent Fasting', desc: 'Time-restricted eating pattern' }
      ]
    },
    specialNeeds: {
      title: 'Special Nutritional Needs',
      icon: '⭐',
      color: 'bg-yellow-50 border-yellow-200',
      items: [
        { name: 'Pregnancy', desc: 'Increased nutritional needs for fetal development' },
        { name: 'Breastfeeding', desc: 'Higher calorie and nutrient requirements' },
        { name: 'Athletic Training', desc: 'Increased energy and protein needs for performance' },
        { name: 'Recovery from Illness', desc: 'Enhanced nutrition to support healing process' },
        { name: 'Elderly Nutrition', desc: 'Age-related changes affecting nutrient absorption' },
        { name: 'Food Sensitivity', desc: 'Non-allergic adverse reactions to certain foods' }
      ]
    }
  };

  const commonAllergies = [
    'Milk/Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Fish', 'Shellfish', 
    'Wheat/Gluten', 'Soy', 'Sesame', 'Sulfites', 'Other'
  ];

  const handleNutritionConditionChange = (category, conditionName) => {
    setNutritionConditions(prev => ({
      ...prev,
      [category]: prev[category].includes(conditionName)
        ? prev[category].filter(item => item !== conditionName)
        : [...prev[category], conditionName]
    }));
  };

  const handleAllergyChange = (allergy) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(item => item !== allergy)
        : [...prev, allergy]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const calculateBMI = () => {
    const { height, weight, unit } = bodyMetrics;
    if (!height || !weight) return null;
    
    let heightInM, weightInKg;
    
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
    if (bmiValue < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmiValue < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'text-orange-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      age: selectedAge,
      nutritionConditions,
      allergies,
      additionalInfo,
      bodyMetrics,
      bmi: calculateBMI(),
      hasImage: !!uploadedImage
    };
    console.log('Form submitted:', formData);
    alert('Form submitted successfully! (Check console for data)');
  };

  const getTotalConditions = () => {
    return Object.values(nutritionConditions).reduce((total, arr) => total + arr.length, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              InnerVerse
            </h1>
            <Shield className="h-8 w-8 text-green-500 ml-3" />
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Get personalized food recommendations based on your age group, health conditions, and dietary restrictions. 
            Make informed choices for better health outcomes.
          </p>
        </div>

        <div className="space-y-8">
          {/* Age Group Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">👥</span>
              Consumer Age Group
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ageGroups.map((group) => (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => setSelectedAge(group.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                    selectedAge === group.value
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{group.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{group.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{group.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Body Metrics Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">📏</span>
              Body Metrics (Optional)
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Providing your height and weight helps us give more personalized nutrition recommendations
            </p>
            
            <div className="space-y-4">
              {/* Unit Selector */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setBodyMetrics(prev => ({ ...prev, unit: 'metric', height: '', weight: '' }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    bodyMetrics.unit === 'metric'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Metric (cm/kg)
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMetrics(prev => ({ ...prev, unit: 'imperial', height: '', weight: '' }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    bodyMetrics.unit === 'imperial'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Imperial (ft/lbs)
                </button>
              </div>

              {/* Height and Weight Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height {bodyMetrics.unit === 'metric' ? '(cm)' : '(feet)'}
                  </label>
                  <input
                    type="number"
                    value={bodyMetrics.height}
                    onChange={(e) => setBodyMetrics(prev => ({ ...prev, height: e.target.value }))}
                    placeholder={bodyMetrics.unit === 'metric' ? 'e.g., 170' : 'e.g., 5.7'}
                    step={bodyMetrics.unit === 'metric' ? '1' : '0.1'}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight {bodyMetrics.unit === 'metric' ? '(kg)' : '(lbs)'}
                  </label>
                  <input
                    type="number"
                    value={bodyMetrics.weight}
                    onChange={(e) => setBodyMetrics(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder={bodyMetrics.unit === 'metric' ? 'e.g., 70' : 'e.g., 154'}
                    step={bodyMetrics.unit === 'metric' ? '0.1' : '1'}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* BMI Display */}
              {bodyMetrics.height && bodyMetrics.weight && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Your BMI:</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-800">{calculateBMI()}</span>
                      {getBMICategory(calculateBMI()) && (
                        <span className={`ml-2 text-sm font-medium ${getBMICategory(calculateBMI()).color}`}>
                          ({getBMICategory(calculateBMI()).category})
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    BMI helps us provide more accurate nutritional recommendations
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Nutrition Conditions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <span className="text-2xl mr-3">🏥</span>
                Nutrition & Health Conditions
              </h2>
              {getTotalConditions() > 0 && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {getTotalConditions()} selected
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(nutritionData).map(([key, data]) => (
                <div key={key} className={`border rounded-lg ${data.color}`}>
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{data.icon}</span>
                      <span className="font-medium text-gray-800">{data.title}</span>
                    </div>
                    <div className="flex items-center">
                      {nutritionConditions[key] && nutritionConditions[key].length > 0 && (
                        <span className="bg-white bg-opacity-80 px-2 py-1 rounded text-xs font-medium mr-2">
                          {nutritionConditions[key].length}
                        </span>
                      )}
                      {expandedSections[key] ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </button>
                  
                  {expandedSections[key] && (
                    <div className="px-4 pb-4 space-y-2">
                      {data.items.map((item) => (
                        <label key={item.name} className="flex items-start p-3 hover:bg-white hover:bg-opacity-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={nutritionConditions[key] && nutritionConditions[key].includes(item.name)}
                            onChange={() => handleNutritionConditionChange(key, item.name)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-700">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Allergies Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              Food Allergies & Intolerances
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Select any food allergies or intolerances that could cause adverse reactions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commonAllergies.map((allergy) => (
                <label key={allergy} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allergies.includes(allergy)}
                    onChange={() => handleAllergyChange(allergy)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 mr-3"
                  />
                  <span className="text-sm font-medium text-gray-700">{allergy}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Info className="h-6 w-6 text-blue-500 mr-3" />
              Additional Information
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Share any other health details, medications, or dietary concerns we should consider
            </p>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Please share any additional health conditions, dietary preferences, medications, or specific concerns that might affect your food choices..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="4"
            />
          </div>

          {/* Image Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <Camera className="h-6 w-6 text-purple-500 mr-3" />
              Upload Food Label Image
            </h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
              {uploadedImage ? (
                <div className="space-y-4">
                  <img
                    src={uploadedImage}
                    alt="Uploaded food label"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove Image
                    </button>
                    <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                      Replace Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Upload or Scan Food Label
                    </p>
                    <p className="text-gray-500 mb-4">
                      Take a photo or upload an image of the food label for ingredient analysis
                    </p>
                    <div className="flex justify-center space-x-4">
                      <label className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer flex items-center">
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer flex items-center">
                        <Camera className="h-5 w-5 mr-2" />
                        Take Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedAge || !uploadedImage}
              className={`px-12 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center ${
                selectedAge && uploadedImage
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Heart className="h-6 w-6 mr-3" />
              Analyze Food Label
            </button>
          </div>

          {/* Form Validation Hint */}
          {(!selectedAge || !uploadedImage) && (
            <div className="text-center text-gray-500 text-sm">
              {!selectedAge && !uploadedImage
                ? 'Please select your age group and upload a food label image to continue'
                : !selectedAge
                ? 'Please select your age group'
                : 'Please upload a food label image'
              }
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start">
            <Info className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">How it works</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Our smart analysis considers your age group, health conditions, and allergies to provide 
                personalized recommendations. We'll scan your food label ingredients and highlight 
                potential concerns or beneficial components specific to your health profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InnerVerse;
                    