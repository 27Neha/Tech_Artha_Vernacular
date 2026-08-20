import re

filepath = 'apps/web/app/risk/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# We will completely replace the RiskPage component
new_component = """export default function RiskPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const q = QUESTIONS[current];
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  // When returning to a previous question, pre-select the answer
  useEffect(() => {
    if (answers[current] !== undefined) {
      setSelectedScore(answers[current]);
    } else {
      setSelectedScore(null);
    }
  }, [current, answers]);

  const handleNext = async () => {
    if (selectedScore === null) return;
    
    const newAnswers = [...answers.slice(0, current), selectedScore];
    setAnswers(newAnswers);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      setLoading(true);
      
      const totalScore = newAnswers.reduce((a, b) => a + b, 0);

      try {
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/risk/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ answers: newAnswers, consent: true })
        });
      } catch (err) {
        console.error('Failed to save risk profile to backend', err);
      }
      
      router.push(`/risk/result?score=${totalScore}`);
    }
  };

  const handlePrevious = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const handleSaveAndExit = () => {
    // Just exit to dashboard for now
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-[var(--primary)] font-bold text-lg">Calculating your risk profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* Header - Removed custom back button to fix double arrow issue */}
      <div className="bg-[var(--primary)] text-white px-6 pt-6 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-lg font-bold">Risk Assessment</h1>
            <span className="text-sm opacity-80">Q{current + 1} of {QUESTIONS.length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-[var(--orange)] h-2 rounded-full transition-all duration-500"
            style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="inline-block bg-[var(--primary-light)] text-[var(--primary)] text-sm font-bold px-4 py-2 rounded-full mb-4">
          Question {current + 1}
        </div>
        <h2 className="text-2xl font-extrabold text-[var(--dark)] leading-tight mb-8">
          {q.question}
        </h2>

        <div className="flex flex-col gap-4">
          {q.options.map((opt, i) => {
            const isSelected = selectedScore === opt.score;
            return (
              <button
                key={i}
                onClick={() => setSelectedScore(opt.score)}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-[var(--primary)] bg-[var(--primary-light)]' 
                    : 'border-gray-200 bg-white hover:border-[var(--primary)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                  isSelected 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className={`font-medium ${isSelected ? 'text-[var(--primary)] font-bold' : 'text-[var(--dark)]'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col gap-3">
        <div className="flex gap-3">
          {current > 0 && (
            <button 
              onClick={handlePrevious}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
            >
              Previous
            </button>
          )}
          <button 
            onClick={handleNext}
            disabled={selectedScore === null}
            className={`flex-1 py-3 font-bold rounded-xl transition-all ${
              selectedScore !== null 
                ? 'bg-[var(--primary)] text-white hover:opacity-90' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {current === QUESTIONS.length - 1 ? 'Finish' : 'Save & Next'}
          </button>
        </div>
        <button 
          onClick={handleSaveAndExit}
          className="w-full py-2 text-[var(--primary)] font-bold text-sm bg-transparent"
        >
          Save & Exit
        </button>
      </div>
    </div>
  );
}"""

code = re.sub(r'export default function RiskPage\(\) \{.*', new_component, code, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated Risk Page with Save & Next / Exit buttons and fixed double arrows!")
