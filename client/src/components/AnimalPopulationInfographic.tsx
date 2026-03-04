/**
 * Animal Population Infographic Component
 * Visual comparison of animal populations: Then, Now, and Future
 */

import React from 'react';

export function AnimalPopulationInfographic() {
  const animals = [
    { name: 'Bears', emoji: '🐻', then: '2+ Million', now: '<300k', future: 'Thriving Partners' },
    { name: 'Beavers', emoji: '🦫', then: '300+ Million', now: '<13 Million', future: 'Water Guardians' },
    { name: 'Salmon', emoji: '🐟', then: 'Abundant', now: 'Endangered', future: 'Nutrient Carriers' },
    { name: 'Chestnuts', emoji: '🌰', then: '3-4 Billion Trees', now: '<10k Trees', future: 'Food Forests' }
  ];

  return (
    <div className="my-12 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-8 border-2 border-amber-500">
      <h3 className="text-2xl font-bold text-center mb-2 text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
        🌍 Working With Nature's Abundance Creators
      </h3>
      <p className="text-center text-gray-600 mb-6 italic">
        What would it be like to work with a wide diversity of animals to create abundance for all?
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/50">
              <th className="p-3 text-left font-bold text-gray-800 border-b-2 border-amber-500">Species</th>
              <th className="p-3 text-center font-bold text-green-800 border-b-2 border-amber-500">THEN<br/><span className="text-xs font-normal">(Pre-Industrial)</span></th>
              <th className="p-3 text-center font-bold text-red-600 border-b-2 border-amber-500">NOW<br/><span className="text-xs font-normal">(Current)</span></th>
              <th className="p-3 text-center font-bold text-[#7dd87d] border-b-2 border-amber-500">FUTURE<br/><span className="text-xs font-normal">(Regenerative)</span></th>
            </tr>
          </thead>
          <tbody>
            {animals.map((animal, index) => (
              <tr key={index} className="bg-white hover:bg-amber-50/50 transition-colors">
                <td className="p-4 border-b border-amber-200">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{animal.emoji}</span>
                    <span className="font-semibold text-gray-800">{animal.name}</span>
                  </div>
                </td>
                <td className="p-4 text-center border-b border-amber-200">
                  <div className="font-bold text-green-800">{animal.then}</div>
                </td>
                <td className="p-4 text-center border-b border-amber-200">
                  <div className="font-bold text-red-600">{animal.now}</div>
                </td>
                <td className="p-4 text-center border-b border-amber-200">
                  <div className="font-semibold text-[#7dd87d] italic">{animal.future}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inspirational Message */}
      <div className="mt-6 bg-white p-6 rounded-lg border-l-4 border-[#7dd87d]">
        <p className="text-gray-800 leading-relaxed">
          <strong className="text-[#7dd87d]">🌟 The Regenerative Vision:</strong> Imagine a future where we partner with bears as food foresters, beavers as watershed engineers, salmon as nutrient distributors, and chestnuts as abundance providers. Together, we can co-create ecosystems where every species thrives and abundance flows naturally. This is not a dream, it is a possibility waiting for us to remember how to be good partners with nature.
        </p>
      </div>
    </div>
  );
}
