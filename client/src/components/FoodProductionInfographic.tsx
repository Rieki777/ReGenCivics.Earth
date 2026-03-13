/**
 * Food Production Infographic Component
 * Visual comparison of US food production: Past, Present, and Future
 */

import React from 'react';

export function FoodProductionInfographic() {
  return (
    <div className="my-12 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-[#7dd87d]">
      <h3 className="text-2xl font-bold text-center mb-2 text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
        🇺🇸 US Food Production: Past, Present & Future
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        {/* PAST */}
        <div className="bg-white rounded-xl p-6 text-center shadow-lg">
          <div className="text-5xl mb-3">🌳</div>
          <div className="font-bold text-xl text-green-800 mb-3">PAST</div>
          <div className="text-sm text-gray-600 mb-2">Pre-Industrial America</div>
          <div className="text-3xl font-bold text-green-800 mb-1">9-12 TRILLION</div>
          <div className="text-sm mb-4">pounds per year</div>
          <div className="bg-green-50 p-3 rounded-lg text-sm">
            <div><strong>26,470-35,294 lbs</strong> per person/year</div>
            <div className="text-green-800 font-bold mt-1">72-96 lbs per person/day</div>
          </div>
          <div className="mt-3 text-xs text-gray-500 italic">
            Just from American Chestnut trees alone (3-4 billion trees)
          </div>
        </div>

        {/* PRESENT */}
        <div className="bg-white rounded-xl p-6 text-center shadow-lg">
          <div className="text-5xl mb-3">🏭</div>
          <div className="font-bold text-xl text-red-600 mb-3">PRESENT</div>
          <div className="text-sm text-gray-600 mb-2">US Modern Industrial Agriculture</div>
          <div className="text-3xl font-bold text-red-600 mb-1">~1 TRILLION</div>
          <div className="text-sm mb-4">pounds per year</div>
          <div className="bg-red-50 p-3 rounded-lg text-sm">
            <div><strong>2,941 lbs</strong> per person/year</div>
            <div className="text-red-600 font-bold mt-1">8 lbs per person/day</div>
          </div>
          <div className="mt-3 text-xs text-gray-500 italic">
            All meat, wheat, corn, milk, soy, ALL industrial agriculture products!
          </div>
        </div>

        {/* FUTURE */}
        <div className="bg-white rounded-xl p-6 text-center shadow-lg">
          <div className="text-5xl mb-3">🌱</div>
          <div className="font-bold text-xl text-[#7dd87d] mb-3">FUTURE</div>
          <div className="text-sm text-gray-600 mb-2">Regenerative Food Forests</div>
          <div className="text-3xl font-bold text-[#7dd87d] mb-1">??? TRILLION</div>
          <div className="text-sm mb-4">pounds per year</div>
          <div className="bg-green-50 p-3 rounded-lg text-sm">
            <div className="text-gray-700 font-semibold italic">What abundance can we recreate?</div>
          </div>
          <div className="mt-3 text-xs text-gray-500 italic">
            Restoring chestnuts + oaks + pawpaws + hundreds of other species
          </div>
        </div>
      </div>

      {/* Callout Box */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
        <p className="text-gray-800">
          <strong>💡 The Shocking Truth:</strong> A single tree species (American Chestnuts), in only half the US, taking up ZERO farmland, provided <strong>9-12 TIMES MORE</strong> food than ALL the food the US currently produces with ALL our technology and industrial agriculture! <em>Way more than anyone could possibly eat!</em>
        </p>
      </div>
    </div>
  );
}
