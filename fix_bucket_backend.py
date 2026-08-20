import re

filepath = 'services/api/src/modules/buckets/buckets.service.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix getRecommendations to use bucket's primary risk profile, not the user's category
code = code.replace("riskProfile: category,", "riskProfile: bucket.eligibleFor[0],")

# Add a type field to the bucket so frontend can easily display it
code = code.replace("return {\n        ...bucket,\n        recommendedFunds: funds,\n      };", 
"""      let bucketRiskLevel = 'Moderate';
      if (bucket.id === 'stable') bucketRiskLevel = 'Conservative';
      if (bucket.id === 'growth') bucketRiskLevel = 'Aggressive';

      return {
        ...bucket,
        bucketRiskLevel,
        recommendedFunds: funds,
      };""")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed bucket backend!")
