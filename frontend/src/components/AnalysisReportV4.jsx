import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Heart, Shield, Clock, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { scansAPI } from '../services/api';

const AnalysisReport = ({ report, onBack, onNewAnalysis }) => {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [productName, setProductName] = useState(report.product_name || '');

  // Helper function to create doughnut chart
  const createDoughnutChart = (data) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    
    const entries = Object.entries(data).filter(([_, count]) => count > 0);
    const total = entries.reduce((sum, [_, count]) => sum + count, 0);
    
    if (total === 0) return null;
    
    let currentAngle = -90;
    const segments = entries.map(([type, count], index) => {
      const percentage = (count / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      const radius = 80;
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
      
      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
      
      return {
        path,
        color: colors[index % colors.length],
        type,
        count,
        percentage: percentage.toFixed(1)
      };
    });
    
    return segments;
  };

  const chartSegments = report.ingredient_profile_data 
    ? createDoughnutChart(report.ingredient_profile_data)
    : null;

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Moderately Healthy':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthRatingColor = (rating) => {
    switch (rating) {
      case 'Healthy':
        return 'text-green-700 bg-green-100';
      case 'Moderately Healthy':
        return 'text-yellow-700 bg-yellow-100';
      case 'Unhealthy':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

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
        report.overall_profile?.overall_rating || 'Unknown'
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

  // V4/V5: Get data from new structure
  const overallProfile = report.overall_profile || {};
  const itemizedAnalysis = report.itemized_analysis || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Analysis Report
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSaveModalOpen(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Scan
            </button>
            <button
              onClick={onNewAnalysis}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              New Analysis
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Scan saved successfully!
          </div>
        )}

        {/* Product Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {report.product_name || 'Unknown Product'}
              </h2>
              <div className="flex items-center text-gray-500 text-sm mt-2">
                <Clock className="h-4 w-4 mr-2" />
                Analyzed on {new Date(report.analysis_timestamp || Date.now()).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">
                {itemizedAnalysis.length} ingredients analyzed
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Heart className="h-4 w-4 mr-1" />
                Based on your health profile
              </div>
            </div>
          </div>
        </div>

        {/* V4/V5 Part 1: Overall Summary Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Food Package / Meal Profile</h3>
          
          {/* Rating */}
          <div className={`inline-block px-4 py-2 rounded-lg border mb-4 ${getRatingColor(overallProfile.overall_rating)}`}>
            <span className="font-semibold">{overallProfile.overall_rating || 'Unknown'}</span>
          </div>

          {/* Summary Paragraph */}
          <div className="text-gray-700 leading-relaxed mb-4">
            {overallProfile.summary_paragraph || 'No summary available.'}
          </div>

          {/* Possible Allergens */}
          {overallProfile.allergens_found && overallProfile.allergens_found.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Possible Allergens:</h4>
              <div className="flex flex-wrap gap-2">
                {overallProfile.allergens_found.map((allergen, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* V5 Part 2: Moderation & Alternatives */}
        {(overallProfile.moderation_advice || overallProfile.alternative_suggestion) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Moderation & Alternatives</h3>
            
            <div className="space-y-4">
              {overallProfile.moderation_advice && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-semibold text-blue-900 mb-2">Moderation Advice:</div>
                  <div className="text-gray-700">{overallProfile.moderation_advice}</div>
                </div>
              )}
              
              {overallProfile.alternative_suggestion && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-semibold text-green-900 mb-2">Alternative:</div>
                  <div className="text-gray-700">{overallProfile.alternative_suggestion}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* V5 Part 3: Ingredient Profile Chart */}
        {report.ingredient_profile_data && chartSegments && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="h-6 w-6 text-green-500 mr-3" />
              Ingredient Profile
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {chartSegments.map((segment, index) => (
                    <path
                      key={index}
                      d={segment.path}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chartSegments.map((segment, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: segment.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {segment.type}
                        </div>
                        <div className="text-xs text-gray-500">
                          {segment.count} ingredient{segment.count !== 1 ? 's' : ''} ({segment.percentage}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* V4/V5 Part 5: Itemized Ingredient List */}
        {itemizedAnalysis.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Itemized Ingredient List</h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {itemizedAnalysis.map((ingredient, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Ingredient Name & Rating */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg text-gray-800">
                      {ingredient.ingredient_name}
                    </h4>
                    <div className="flex items-center gap-2">
                      {ingredient.percentage && (
                        <span className="text-sm text-gray-600 font-medium">
                          {ingredient.percentage}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthRatingColor(ingredient.health_rating)}`}>
                        {ingredient.health_rating}
                      </span>
                    </div>
                  </div>

                  {/* Food Traits */}
                  {ingredient.food_traits && ingredient.food_traits.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {ingredient.food_traits.map((trait, traitIndex) => (
                          <span
                            key={traitIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingredient Details */}
                  {ingredient.ingredient_details && (
                    <div className="text-gray-700 text-sm mb-3">
                      {ingredient.ingredient_details}
                    </div>
                  )}

                  {/* Nutrients */}
                  {ingredient.nutrients && ingredient.nutrients.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">Nutrients:</div>
                      <div className="space-y-1">
                        {ingredient.nutrients.map((nutrient, nutrientIndex) => (
                          <div key={nutrientIndex} className="text-xs text-gray-600">
                            <span className="font-medium">{nutrient.name}:</span> {nutrient.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Modal */}
        {saveModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Save Scan</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Haldiram's Diet Mixture"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScan}
                  disabled={saving || !productName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;

