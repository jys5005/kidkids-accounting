export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{description || '준비중입니다'}</p>
        </div>
      </div>
    </div>
  )
}
