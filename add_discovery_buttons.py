import re

filepath = 'apps/web/app/funds/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the text "Based on your risk profile and horizon:" with text + buttons
new_block = """                <div className="flex flex-col gap-2 mb-4">
                  <p className="text-xs text-gray-500">Based on your current profile and goals:</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push('/risk')} 
                      className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Re-assess Risk
                    </button>
                    <button 
                      onClick={() => router.push('/goals')} 
                      className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Set New Goal
                    </button>
                  </div>
                </div>"""

code = code.replace('<p className="text-xs text-gray-500 mb-2">Based on your risk profile and horizon:</p>', new_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Added re-assess risk and set goal buttons!")
