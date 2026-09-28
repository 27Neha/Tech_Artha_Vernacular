import React from 'react';

type FundNudgeBucketProps = {
  bucket: any;
  nudgeName: string;
  theme: {
    gradient: string;
    text: string;
    rim: string;
    badge: string;
  };
  onEditBucket: (bucket: any) => void;
  onSelectBucket: (bucket: any) => void;
  onShowDetails: (fund: any) => void;
};

export default function FundNudgeBucket({ bucket, nudgeName, theme, onEditBucket, onSelectBucket, onShowDetails }: FundNudgeBucketProps) {
  const displayFunds = bucket.funds?.slice(0, 5) || [];
  const hasMore = (bucket.funds?.length || 0) > 5;

  return (
    <div className="w-full mt-10 mb-12">
      {/* 3D Bucket Container in Normal Document Flow */}
      <div className={`relative flex flex-col w-full bg-gradient-to-b ${theme.gradient} rounded-b-[2.5rem] rounded-t-2xl border-4 border-white shadow-[0_15px_35px_rgba(0,0,0,0.04),inset_0_20px_40px_rgba(255,255,255,0.5)]`}>
        
        {/* The Top Rim (Decorative, positioned to overlap top edge only) */}
        <div className={`absolute top-0 left-0 right-0 h-16 bg-white rounded-[50%] border-b-2 ${theme.rim} shadow-[0_10px_20px_rgba(0,0,0,0.02)] -translate-y-1/2 flex flex-col items-center justify-center border-4 border-white z-20`}>
            <h3 className={`text-[11px] font-black ${theme.text} uppercase tracking-widest leading-none mt-1`}>{nudgeName}</h3>
            <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${theme.badge}`}>
               {bucket.funds?.length || 0} FUNDS
            </span>
        </div>

        {/* Inner Content Area - Normal Flow padding pushes past the top rim */}
        <div className="flex flex-col gap-3 px-4 pt-12 pb-6 z-10">
            {displayFunds.map((fund: any, idx: number) => (
                <div key={fund.schemeCode || idx} className="flex flex-row items-center justify-between bg-white/90 backdrop-blur-md p-3.5 rounded-2xl shadow-sm border border-white/60 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onShowDetails(fund)}>
                    <div className="flex-1 min-w-0 pr-3 flex flex-col gap-1">
                        {/* Name will wrap naturally because of min-w-0 and whitespace-normal */}
                        <h4 className="font-bold text-gray-900 text-xs leading-snug break-words whitespace-normal">
                            {fund.fundName || fund.schemeName || fund.name}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-snug break-words whitespace-normal">
                            {fund.category || 'Mutual Fund'}
                        </p>
                    </div>
                    {/* Info Button shrink-0 ensures it never collapses */}
                    <button className="shrink-0 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
                       <span className="text-xs font-black">i</span>
                    </button>
                </div>
            ))}
            
            {(!displayFunds || displayFunds.length === 0) && (
               <div className="py-8 text-center bg-white/50 rounded-2xl border border-white border-dashed">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No funds available</p>
               </div>
            )}
            
            {hasMore && (
               <button onClick={() => onEditBucket(bucket)} className={`py-2 text-[10px] font-black ${theme.text} uppercase tracking-widest hover:underline text-center w-full mt-2`}>
                  View All {bucket.funds.length} Funds &rarr;
               </button>
            )}
        </div>

        {/* Footer Area - Normal Flow at bottom of flex column (no absolute positioning) */}
        <div className="flex flex-row gap-2 p-4 bg-white/70 backdrop-blur-xl border-t-2 border-white rounded-b-[2.3rem] shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-10 mt-auto">
          <button onClick={() => onEditBucket(bucket)} className="flex-1 py-3.5 bg-white text-gray-800 border border-gray-100 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
             Edit Bucket
          </button>
          <button onClick={() => onSelectBucket(bucket)} className="flex-1 py-3.5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:bg-gray-800 transition-colors">
             Select
          </button>
        </div>

      </div>
    </div>
  );
}
