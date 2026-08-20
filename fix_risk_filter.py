import re

filepath = 'apps/web/app/funds/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Update state to store all buckets
code = code.replace("const [recommended, setRecommended] = useState<any[]>([]);", 
"""const [recommended, setRecommended] = useState<any[]>([]);
  const [allBuckets, setAllBuckets] = useState<any[]>([]);""")

# Update fetchRecs to store all buckets
new_fetch = """        const recBucket = data.buckets?.find((b: any) => b.recommended);
        if (recBucket?.recommendedFunds) {
          setRecommended(recBucket.recommendedFunds);
        }
        setAllBuckets(data.buckets || []);"""
code = code.replace("""        const recBucket = data.buckets?.find((b: any) => b.recommended);
        if (recBucket?.recommendedFunds) {
          setRecommended(recBucket.recommendedFunds);
        }""", new_fetch)

# Add an effect to change recommended funds when riskFilter changes
new_effect = """  useEffect(() => {
    if (!riskFilter) {
      const recBucket = allBuckets.find(b => b.recommended);
      if (recBucket) setRecommended(recBucket.recommendedFunds || []);
    } else {
      let targetId = 'balanced';
      if (riskFilter === 'Conservative') targetId = 'stable';
      if (riskFilter === 'Aggressive') targetId = 'growth';
      const targetBucket = allBuckets.find(b => b.id === targetId);
      if (targetBucket) setRecommended(targetBucket.recommendedFunds || []);
    }
  }, [riskFilter, allBuckets]);"""
code = code.replace("  const search = async", new_effect + "\n\n  const search = async")

# Fix button text "Re-assess Risk" to "Re - Risk profiling"
code = code.replace("Re-assess Risk", "Re - Risk profiling")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed risk filter and button text!")
