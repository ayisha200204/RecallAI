// import React from 'react';

// const CONFIDENCE_LEVELS = [
//   { level: 1, label: 'Pure Guess', emoji: '🎲', color: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-700' },
//   { level: 2, label: 'Uncertain', emoji: '🤔', color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-700' },
//   { level: 3, label: 'Moderate', emoji: '⚖️', color: 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 text-yellow-800' },
//   { level: 4, label: 'Confident', emoji: '💡', color: 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700' },
//   { level: 5, label: 'Mastered', emoji: '🎯', color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700' },
// ];

// export default function ConfidenceSelector({ value, onChange, disabled = false }) {
//   return (
//     <div className="flex flex-col gap-2">
//       <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
//         <span>How confident are you in this answer?</span>
//         <span>Keyboard: Keys 1 to 5</span>
//       </div>
//       <div className="grid grid-cols-5 gap-2">
//         {CONFIDENCE_LEVELS.map((item) => {
//           const isSelected = value === item.level;
//           return (
//             <button
//               key={item.level}
//               type="button"
//               disabled={disabled}
//               onClick={() => onChange(item.level)}
//               className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${isSelected
//                   ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-102 font-semibold'
//                   : `bg-white ${item.color}`
//                 } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
//             >
//               <span className="text-base mb-0.5">{item.emoji}</span>
//               <span className="text-[11px] font-semibold">{item.level}. {item.label}</span>
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
