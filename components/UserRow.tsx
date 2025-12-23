
import React from 'react';
import { InstagramUser } from '../types';
import { ExternalLink, UserMinus, ShieldCheck } from 'lucide-react';

interface UserRowProps {
  user: InstagramUser;
}

const UserRow: React.FC<UserRowProps> = ({ user }) => {
  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/50 rounded-2xl transition-all group">
      <div className="flex items-center gap-4">
        <div className="relative group-hover:scale-105 transition-transform duration-300">
          <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-instagram-yellow via-instagram-pink to-instagram-purple">
            <img 
              src={user.profile_pic_url} 
              alt={user.username}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full border-2 border-slate-950 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=1e293b&color=fff`;
              }}
            />
          </div>
          {user.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 border-2 border-slate-950 shadow-lg">
               <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-white text-sm tracking-tight">@{user.username}</h4>
            {user.follows_viewer && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded uppercase font-bold">Takip Ediyor</span>}
          </div>
          <p className="text-slate-500 text-[11px] font-medium truncate max-w-[140px] mt-0.5">
            {user.full_name || 'Instagram Kullanıcısı'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
        <a 
          href={`https://instagram.com/${user.username}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
          title="Profili Gör"
        >
          <ExternalLink size={16} />
        </a>
        <button 
          className="p-2.5 text-red-400/70 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
          title="Takibi Bırak (Instagram'dan yapın)"
          onClick={() => window.open(`https://instagram.com/${user.username}`, '_blank')}
        >
          <UserMinus size={16} />
        </button>
      </div>
    </div>
  );
};

export default UserRow;
