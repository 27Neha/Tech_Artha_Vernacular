const fs = require('fs');
const path = require('path');

const neutralTexts = {
  en: {
    'buckets.recommended': 'Curated Collection',
    'buckets.curatedBadge': 'Curated Collection',
    'buckets.exploreCollection': 'Explore Collection',
    'buckets.viewDetails': 'View Details',
    'buckets.fundCollection': 'Fund Collection',
    'dash.recommended': 'Curated Collections',
    'dash.loadingRecs': 'Loading Curated Collections...',
    'riskResult.recommended': 'Suggested Asset Mix',
    'funds.completeProfile': 'Complete your profile to explore curated collections',
    'buckets.bestMatch': '✨ Profile Match',
    'buckets.basedOnAnswers': 'Based on your risk profile, here are real-time mutual fund collections aligned with your horizon.'
  },
  hi: {
    'buckets.recommended': 'क्यूरेटेड संग्रह',
    'buckets.curatedBadge': 'क्यूरेटेड संग्रह',
    'buckets.exploreCollection': 'संग्रह देखें',
    'buckets.viewDetails': 'विवरण देखें',
    'buckets.fundCollection': 'फंड संग्रह',
    'dash.recommended': 'क्यूरेटेड फंड संग्रह',
    'dash.loadingRecs': 'संग्रह लोड हो रहे हैं...',
    'riskResult.recommended': 'अनुरूप परिसंपत्ति आवंटन',
    'funds.completeProfile': 'क्यूरेटेड संग्रह देखने के लिए प्रोफ़ाइल पूरी करें',
    'buckets.bestMatch': '✨ प्रोफ़ाइल अनुरूप',
    'buckets.basedOnAnswers': 'आपकी जोखिम प्रोफ़ाइल के आधार पर, आपकी समय सीमा के अनुरूप फंड संग्रह प्रस्तुत हैं।'
  },
  mr: {
    'buckets.recommended': 'क्युरेट केलेला संग्रह',
    'buckets.curatedBadge': 'क्युरेट केलेला संग्रह',
    'buckets.exploreCollection': 'संग्रह पहा',
    'buckets.viewDetails': 'तपशील पहा',
    'buckets.fundCollection': 'फंड संग्रह',
    'dash.recommended': 'क्युरेट केलेले फंड संग्रह',
    'dash.loadingRecs': 'संग्रह लोड होत आहेत...',
    'riskResult.recommended': 'अनुरूप मालमत्ता वाटप',
    'funds.completeProfile': 'क्युरेट केलेले संग्रह पाहण्यासाठी प्रोफाइल पूर्ण करा',
    'buckets.bestMatch': '✨ प्रोफाइल अनुरूप',
    'buckets.basedOnAnswers': 'तुमच्या जोखीम प्रोफाइलवर आधारित, तुमच्या कालमर्यादेशी सुसंगत फंड संग्रह खालीलप्रमाणे आहेत.'
  },
  gu: {
    'buckets.recommended': 'ક્યુરેટેડ સંગ્રહ',
    'buckets.curatedBadge': 'ક્યુરેટેડ સંગ્રહ',
    'buckets.exploreCollection': 'સંગ્રહ જુઓ',
    'buckets.viewDetails': 'વિગતો જુઓ',
    'buckets.fundCollection': 'ફંડ સંગ્રહ',
    'dash.recommended': 'ક્યુરેટેડ ફંડ સંગ્રહ',
    'dash.loadingRecs': 'સંગ્રહ લોડ થઈ રહ્યો છે...',
    'riskResult.recommended': 'અનુરૂપ એસેટ ફાળવણી',
    'funds.completeProfile': 'ક્યુરેટેડ સંગ્રહ જોવા માટે પ્રોફાઇલ પૂર્ણ કરો',
    'buckets.bestMatch': '✨ પ્રોફાઇલ અનુરૂપ',
    'buckets.basedOnAnswers': 'તમારી જોખમ પ્રોફાઇલના આધારે, તમારી સમયમર્યાદાને અનુરૂપ ફંડ સંગ્રહ પ્રસ્તુત છે.'
  },
  bn: {
    'buckets.recommended': 'কিউরেটেড সংগ্রহ',
    'buckets.curatedBadge': 'কিউরেটেড সংগ্রহ',
    'buckets.exploreCollection': 'সংগ্রহ দেখুন',
    'buckets.viewDetails': 'বিস্তারিত দেখুন',
    'buckets.fundCollection': 'ফান্ড সংগ্রহ',
    'dash.recommended': 'কিউরেটেড ফান্ড সংগ্রহ',
    'dash.loadingRecs': 'সংগ্রহ লোড হচ্ছে...',
    'riskResult.recommended': 'অনুরূপ সম্পদ বণ্টন',
    'funds.completeProfile': 'কিউরেটেড সংগ্রহ দেখতে প্রোফাইল সম্পূর্ণ করুন',
    'buckets.bestMatch': '✨ প্রোফাইল অনুরূপ',
    'buckets.basedOnAnswers': 'আপনার ঝুঁকি প্রোফাইলের উপর ভিত্তি করে, আপনার সময়সীমার সাথে সামঞ্জস্যপূর্ণ ফান্ড সংগ্রহ এখানে উপস্থাপন করা হলো।'
  },
  ta: {
    'buckets.recommended': 'தொகுக்கப்பட்ட சேகரிப்பு',
    'buckets.curatedBadge': 'தொகுக்கப்பட்ட சேகரிப்பு',
    'buckets.exploreCollection': 'சேகரிப்பை காண்க',
    'buckets.viewDetails': 'விவரங்களை காண்க',
    'buckets.fundCollection': 'நிதி சேகரிப்பு',
    'dash.recommended': 'தொகுக்கப்பட்ட நிதி சேகரிப்புகள்',
    'dash.loadingRecs': 'சேகரிப்புகள் ஏற்றப்படுகின்றன...',
    'riskResult.recommended': 'பொருத்தமான சொத்து ஒதுக்கீடு',
    'funds.completeProfile': 'தொகுக்கப்பட்ட சேகரிப்புகளைப் பார்க்க சுயவிவரத்தை முடிக்கவும்',
    'buckets.bestMatch': '✨ சுயவிவரப் பொருத்தம்',
    'buckets.basedOnAnswers': 'உங்கள் இடர் விவரக்குறிப்பின் அடிப்படையில், உங்கள் கால வரம்பிற்கு ஏற்ற நிதி சேகரிப்புகள் கீழே கொடுக்கப்பட்டுள்ளன.'
  },
  te: {
    'buckets.recommended': 'క్యూరేటెడ్ సేకరణ',
    'buckets.curatedBadge': 'క్యూరేటెడ్ సేకరణ',
    'buckets.exploreCollection': 'సేకరణను అన్వేషించండి',
    'buckets.viewDetails': 'వివరాలు చూడండి',
    'buckets.fundCollection': 'ఫండ్ సేకరణ',
    'dash.recommended': 'క్యూరేటెడ్ ఫండ్ సేకరణలు',
    'dash.loadingRecs': 'సేకరణలు లోడ్ అవుతున్నాయి...',
    'riskResult.recommended': 'సరిపోలే అసెట్ కేటాయింపు',
    'funds.completeProfile': 'క్యూరేటెడ్ సేకరణలను అన్వేషించడానికి ప్రొఫైల్‌ను పూర్తి చేయండి',
    'buckets.bestMatch': '✨ ప్రొఫైల్ సరిపోలిక',
    'buckets.basedOnAnswers': 'మీ రిస్క్ ప్రొఫైల్ ఆధారంగా, మీ కాలపరిమితికి అనుగుణంగా ఉన్న ఫండ్ సేకరణలు ఇక్కడ ఇవ్వబడ్డాయి.'
  },
  kn: {
    'buckets.recommended': 'ಕ್ಯುರೇಟೆಡ್ ಸಂಗ್ರಹ',
    'buckets.curatedBadge': 'ಕ್ಯುರೇಟೆಡ್ ಸಂಗ್ರಹ',
    'buckets.exploreCollection': 'ಸಂಗ್ರಹವನ್ನು ಅನ್ವೇಷಿಸಿ',
    'buckets.viewDetails': 'ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    'buckets.fundCollection': 'ನಿಧಿ ಸಂಗ್ರಹ',
    'dash.recommended': 'ಕ್ಯುರೇಟೆಡ್ ಫಂಡ್ ಸಂಗ್ರಹಗಳು',
    'dash.loadingRecs': 'ಸಂಗ್ರಹಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...',
    'riskResult.recommended': 'ಹೊಂದಾಣಿಕೆಯ ಆಸ್ತಿ ಹಂಚಿಕೆ',
    'funds.completeProfile': 'ಕ್ಯುರೇಟೆಡ್ ಸಂಗ್ರಹಗಳನ್ನು ಅನ್ವೇಷಿಸಲು ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
    'buckets.bestMatch': '✨ ಪ್ರೊಫೈಲ್ ಹೊಂದಾಣಿಕೆ',
    'buckets.basedOnAnswers': 'ನಿಮ್ಮ ಅಪಾಯದ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ, ನಿಮ್ಮ ಕಾಲಾವಧಿಗೆ ಅನುಗುಣವಾದ ಮ್ಯೂಚುಯಲ್ ಫಂಡ್ ಸಂಗ್ರಹಗಳು ಇಲ್ಲಿವೆ.'
  },
  ml: {
    'buckets.recommended': 'ക്യൂറേറ്റ് ചെയ്ത ശേഖരം',
    'buckets.curatedBadge': 'ക്യൂറേറ്റ് ചെയ്ത ശേഖരം',
    'buckets.exploreCollection': 'ശേഖരം കാണുക',
    'buckets.viewDetails': 'വിശദാംശങ്ങൾ കാണുക',
    'buckets.fundCollection': 'ഫണ്ട് ശേഖരം',
    'dash.recommended': 'ക്യൂറേറ്റ് ചെയ്ത ഫണ്ട് ശേഖരങ്ങൾ',
    'dash.loadingRecs': 'ശേഖരങ്ങൾ ലോഡുചെയ്യുന്നു...',
    'riskResult.recommended': 'അനുയോജ്യമായ അസറ്റ് അലോക്കേഷൻ',
    'funds.completeProfile': 'ക്യൂറേറ്റ് ചെയ്ത ശേഖരങ്ങൾ കാണാൻ പ്രൊഫൈൽ പൂർത്തിയാക്കുക',
    'buckets.bestMatch': '✨ പ്രൊഫൈൽ പൊരുത്തം',
    'buckets.basedOnAnswers': 'നിങ്ങളുടെ റിസ്ക് പ്രൊഫൈലിനെ അടിസ്ഥാനമാക്കി, നിങ്ങളുടെ സമയപരിധിക്ക് അനുയോജ്യമായ ഫണ്ട് ശേഖരങ്ങൾ ഇതാ.'
  },
  pa: {
    'buckets.recommended': 'ਚੁਣਿਆ ਗਿਆ ਸੰਗ੍ਰਹਿ',
    'buckets.curatedBadge': 'ਚੁਣਿਆ ਗਿਆ ਸੰਗ੍ਰਹਿ',
    'buckets.exploreCollection': 'ਸੰਗ੍ਰਹਿ ਦੇਖੋ',
    'buckets.viewDetails': 'ਵੇਰਵੇ ਦੇਖੋ',
    'buckets.fundCollection': 'ਫੰਡ ਸੰਗ੍ਰਹਿ',
    'dash.recommended': 'ਚੁਣੇ ਗਏ ਫੰਡ ਸੰਗ੍ਰਹਿ',
    'dash.loadingRecs': 'ਸੰਗ੍ਰਹਿ ਲੋਡ ਹੋ ਰਹੇ ਹਨ...',
    'riskResult.recommended': 'ਅਨੁਕੂਲ ਸੰਪਤੀ ਵੰਡ',
    'funds.completeProfile': 'ਚੁਣੇ ਗਏ ਸੰਗ੍ਰਹਿ ਦੇਖਣ ਲਈ ਪ੍ਰੋਫਾਈਲ ਪੂਰਾ ਕਰੋ',
    'buckets.bestMatch': '✨ ਪ੍ਰੋਫਾਈਲ ਮੇਲ',
    'buckets.basedOnAnswers': 'ਤੁਹਾਡੇ ਜੋਖਮ ਪ੍ਰੋਫਾਈਲ ਦੇ ਆਧਾਰ \'ਤੇ, ਤੁਹਾਡੀ ਸਮਾਂ ਸੀਮਾ ਦੇ ਅਨੁਕੂਲ ਫੰਡ ਸੰਗ੍ਰਹਿ ਹੇਠਾਂ ਦਿੱਤੇ ਗਏ ਹਨ।'
  },
  or: {
    'buckets.recommended': 'କ୍ୟୁରେଟେଡ୍ ସଂଗ୍ରହ',
    'buckets.curatedBadge': 'କ୍ୟୁରେଟେଡ୍ ସଂଗ୍ରହ',
    'buckets.exploreCollection': 'ସଂଗ୍ରହ ଅନୁସନ୍ଧାନ କରନ୍ତୁ',
    'buckets.viewDetails': 'ବିବରଣୀ ଦେଖନ୍ତୁ',
    'buckets.fundCollection': 'ଫଣ୍ଡ ସଂଗ୍ରହ',
    'dash.recommended': 'କ୍ୟୁରେଟେଡ୍ ଫଣ୍ଡ ସଂଗ୍ରହ',
    'dash.loadingRecs': 'ସଂଗ୍ରହ ଲୋଡ୍ ହେଉଛି...',
    'riskResult.recommended': 'ଅନୁରୂପ ସମ୍ପତ୍ତି ବଣ୍ଟନ',
    'funds.completeProfile': 'କ୍ୟୁରେଟେଡ୍ ସଂଗ୍ରହ ଦେଖିବା ପାଇଁ ପ୍ରୋଫାଇଲ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ',
    'buckets.bestMatch': '✨ ପ୍ରୋଫାଇଲ୍ ମେଳ',
    'buckets.basedOnAnswers': 'ଆପଣଙ୍କ ବିପଦ ପ୍ରୋଫାଇଲ୍ ଉପରେ ଆଧାର କରି, ଏଠାରେ ଆପଣଙ୍କ ସମୟ ସୀମା ସହିତ ମେଳ ଖାଉଥିବା ଫଣ୍ଡ ସଂଗ୍ରହ ରହିଛି |'
  },
  as: {
    'buckets.recommended': 'কিউৰেটেড সংগ্ৰহ',
    'buckets.curatedBadge': 'কিউৰেটেড সংগ্ৰহ',
    'buckets.exploreCollection': 'সংগ্ৰহ অন্বেষণ কৰক',
    'buckets.viewDetails': 'বিৱৰণ চাওক',
    'buckets.fundCollection': 'ফাণ্ড সংগ্ৰহ',
    'dash.recommended': 'কিউৰেটেড ফাণ্ড সংগ্ৰহ',
    'dash.loadingRecs': 'সংগ্ৰহ লোড হৈ আছে...',
    'riskResult.recommended': 'অনুগামী সম্পত্তি আবণ্টন',
    'funds.completeProfile': 'কিউৰেটেড সংগ্ৰহ চাবলৈ প্ৰ\'ফাইল সম্পূৰ্ণ কৰক',
    'buckets.bestMatch': '✨ প্ৰ\'ফাইল মিল',
    'buckets.basedOnAnswers': 'আপোনাৰ বিপদাশংকা প্ৰ\'ফাইলৰ ওপৰত ভিত্তি কৰি, ইয়াত সময়সীমাৰ সৈতে সামঞ্জস্যপূৰ্ণ ফাণ্ড সংগ্ৰহ প্ৰস্তুত কৰা হৈছে।'
  }
};

const dirs = [
  path.resolve(__dirname, '../apps/mobile/src/i18n/locales'),
  path.resolve(__dirname, '../apps/mobile/src/locales'),
  path.resolve(__dirname, '../apps/web/i18n/locales')
];

let updatedCount = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const [lang, translations] of Object.entries(neutralTexts)) {
    const filePath = path.join(dir, lang, 'common.json');
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const [key, val] of Object.entries(translations)) {
        content[key] = val;
      }
      // Also neutralize educational recommendations if present
      if (content['learn.sipVsLumpSum.content']) {
        content['learn.sipVsLumpSum.content'] = content['learn.sipVsLumpSum.content'].replace(
          'universally recommended',
          'widely adopted by salaried investors'
        );
      }
      if (content['learn.internationalFunds.content']) {
        content['learn.internationalFunds.content'] = content['learn.internationalFunds.content'].replace(
          'is recommended',
          'is commonly considered'
        );
      }
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      updatedCount++;
      console.log(`Updated ${filePath}`);
    }
  }
}

console.log(`Total files updated: ${updatedCount}`);
