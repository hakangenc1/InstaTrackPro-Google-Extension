
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, colorClass }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
