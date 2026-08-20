import re

filepath = 'apps/web/app/risk/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace sticky bottom actions with a normal flow button
new_bottom = """      {/* Bottom Actions - Normal Flow */}
      <div className="p-6 pt-2 flex flex-col gap-3 mt-auto">
        <div className="flex gap-3">
          {current > 0 && (
            <button 
              onClick={handlePrevious}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
            >
              Back
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
            {current === QUESTIONS.length - 1 ? 'Finish & Save' : 'Next'}
          </button>
        </div>
      </div>
    </div>"""

# Remove the old sticky footer and fix the wrapper padding
code = re.sub(r'      \{/\* Sticky Bottom Actions \*/\}.*?</div>\n  \);\n\}', new_bottom + "\n  );\n}", code, flags=re.DOTALL)
code = code.replace('className="flex flex-col min-h-screen bg-white pb-40"', 'className="flex flex-col min-h-screen bg-white"')

# Revert the top padding of the blue header back to what it originally was
code = code.replace('className="bg-[var(--primary)] text-white px-6 pt-24 pb-8"', 'className="bg-[var(--primary)] text-white px-6 pt-12 pb-8"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed sticky footer and reverted top padding!")
