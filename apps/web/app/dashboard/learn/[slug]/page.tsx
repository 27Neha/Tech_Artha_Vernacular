'use client';
import { useParams, useRouter } from 'next/navigation';
const ARTICLES = [
  { slug: 'what-is-mutual-fund', icon: '📈', title: 'What is a Mutual Fund?', desc: 'Learn how pooled investments work.', time: '5 min', tag: 'Beginner' },
  { slug: 'sip-vs-lump-sum', icon: '💡', title: 'SIP vs Lump Sum', desc: 'Which approach suits you better?', time: '4 min', tag: 'Beginner' },
  { slug: 'understanding-risk', icon: '🛡️', title: 'Understanding Risk', desc: 'Assess and manage investment risk.', time: '6 min', tag: 'Intermediate' },
  { slug: 'fund-performance', icon: '📊', title: 'Reading Fund Performance', desc: 'Understand NAV, returns and more.', time: '7 min', tag: 'Intermediate' },
  { slug: 'elss-tax-saving', icon: '💰', title: 'ELSS Tax Saving Funds', desc: 'Save tax while growing wealth with 80C.', time: '5 min', tag: 'Tax' },
  { slug: 'international-funds', icon: '🌍', title: 'International Funds', desc: 'Invest in global markets from India.', time: '6 min', tag: 'Advanced' },
];

// Professional educational content tailored for Indian mutual fund investors.
// Inspired by leading investment apps (Zerodha Varsity, Groww, ET Money).
const ARTICLE_CONTENT: Record<string, string> = {
  'what-is-mutual-fund': `
A Mutual Fund is a trust that collects money from a number of investors who share a common investment objective. 

**How it works**
The money collected is invested by a professional fund manager in equities, bonds, money market instruments, and other securities. The income generated from these investments is distributed proportionately amongst the investors after deducting certain expenses, by calculating a value called Net Asset Value (NAV).

**Key Benefits:**
1. **Professional Management**: You don't need to track the market daily; experts do it for you.
2. **Diversification**: By investing in a basket of stocks/bonds, the risk is spread out.
3. **Liquidity**: Open-ended funds can be bought or sold on any business day.
4. **Affordability**: You can start investing with as little as ₹100 through a Systematic Investment Plan (SIP).

*Conclusion:* Mutual funds are one of the most efficient ways to build wealth over the long term without needing deep financial expertise.
  `,
  'sip-vs-lump-sum': `
When investing in Mutual Funds, you have two primary methods: SIP (Systematic Investment Plan) and Lumpsum.

**What is a SIP?**
A SIP allows you to invest a fixed amount regularly (monthly, weekly, etc.). It automates your investing and enforces financial discipline.

**What is Lumpsum?**
A Lumpsum investment is a one-time bulk investment. This is usually preferred when you receive a large bonus, inheritance, or windfall.

**Which is better?**
1. **Rupee Cost Averaging (SIP)**: SIPs automatically buy more units when markets are down and fewer when markets are up. This averages out your purchase cost, meaning you don't need to "time the market".
2. **Market Timing (Lumpsum)**: Lumpsum works best when the market has crashed and valuations are cheap. However, timing the market is extremely difficult even for professionals.
3. **Discipline**: SIPs remove the emotional aspect of investing. Your money is deducted automatically on a set date.

*Recommendation:* For salaried individuals, SIPs are universally recommended. If you receive a large bonus, consider doing a STP (Systematic Transfer Plan) instead of a pure lumpsum to mitigate timing risk.
  `,
  'understanding-risk': `
All investments carry some degree of risk. In finance, "risk" is simply the probability that your actual return will differ from your expected return, including the possibility of losing some or all of your original investment.

**Types of Risk in Mutual Funds:**
1. **Market Risk (Systematic Risk)**: The risk that the entire market declines due to economic events, natural disasters, or political instability.
2. **Interest Rate Risk**: Primarily affects Debt funds. When interest rates rise, bond prices fall, leading to a drop in NAV.
3. **Credit Risk**: The risk that the issuer of a bond defaults on its payments.
4. **Inflation Risk**: The risk that your investment returns do not beat the inflation rate, reducing your purchasing power.

**How to manage risk?**
The golden rule of risk management is **Diversification**. Do not put all your eggs in one basket. Allocate your capital across Equity (High Risk/High Return), Debt (Low Risk/Stable Return), and Gold (Hedge against inflation). Understand your personal risk tolerance before building a portfolio.
  `,
  'fund-performance': `
When choosing a mutual fund, evaluating its past performance is important, but it should never be the only factor. Remember: *Past performance is not an indicator of future returns.*

**Key Metrics to Look At:**
1. **NAV (Net Asset Value)**: The price of a single unit of the fund. A higher NAV doesn't mean the fund is expensive; it just means it has been running for a long time.
2. **Trailing Returns vs Rolling Returns**: Trailing returns show point-to-point performance (e.g., 1 Year, 3 Year). Rolling returns measure performance over a block of time taken at regular intervals, providing a much more accurate picture of consistency.
3. **Alpha**: Measures how much the fund manager outperformed the benchmark index. A positive Alpha of 2.0 means the fund beat the benchmark by 2%.
4. **Expense Ratio**: The annual fee charged by the AMC to manage your money. A lower expense ratio directly translates to higher returns for you in the long run.

*Actionable Advice:* Always compare a fund's performance against its specific benchmark (e.g., Nifty 50) and its peers in the exact same category.
  `,
  'elss-tax-saving': `
Equity Linked Savings Scheme (ELSS) is a specific type of mutual fund designed to offer tax benefits under Section 80C of the Income Tax Act.

**Why choose ELSS?**
1. **Tax Deduction**: You can claim a deduction of up to ₹1.5 Lakhs from your taxable income, saving up to ₹46,800 in taxes annually (depending on your tax slab).
2. **Shortest Lock-in Period**: ELSS has a mandatory lock-in period of just 3 years. This is the shortest lock-in among all 80C options (PPF is 15 years, Tax-saving FDs are 5 years).
3. **Wealth Creation**: Unlike traditional tax-saving instruments that offer fixed returns (7-8%), ELSS invests predominantly in equities, offering the potential for much higher inflation-beating returns.

*Important Note:* Due to the 3-year lock-in, if you invest via SIP, every individual SIP installment is locked for 3 years from its respective date of investment.
  `,
  'international-funds': `
International or Global Mutual Funds allow Indian investors to buy into companies listed outside of India (like Apple, Amazon, Google, or entire indices like the S&P 500 or Nasdaq 100).

**Why invest globally?**
1. **Geographical Diversification**: If the Indian economy faces a downturn, your global investments can act as a shock absorber.
2. **Access to Megatrends**: Many cutting-edge technology, AI, and healthcare companies are only listed abroad.
3. **Currency Depreciation Benefit**: Historically, the Indian Rupee depreciates against the US Dollar by about 3-4% annually. When you invest in US-focused funds, any depreciation in the Rupee directly adds to your overall returns.

**Taxation Note:**
Under recent tax laws in India, gains from international funds are classified as Debt funds for taxation purposes and are taxed at your applicable income tax slab rate, regardless of the holding period. Keep this in mind when allocating capital.
  `
};

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  
  const slug = params.slug as string;
  const article = ARTICLES.find(a => a.slug === slug);
  const content = ARTICLE_CONTENT[slug];

  if (!article || !content) {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold text-[var(--dark)]">Article not found</h1>
        <button onClick={() => router.back()} className="mt-4 text-[var(--primary)] font-bold">Go Back</button>
      </div>
    );
  }

  // Simple Markdown-to-HTML parser for formatting the text
  const formattedContent = content
    .trim()
    .split('\n\n')
    .map((paragraph, idx) => {
      let html = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--dark)]">$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em class="text-gray-600 italic">$1</em>') // Italic
        .replace(/\n/g, '<br />'); // Newlines
      
      return (
        <p key={idx} className="mb-4 text-gray-600 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: html }} />
      );
    });

  return (
    <div className="bg-white min-h-screen">
      {/* Header Image/Banner Area */}
      <div className="bg-[var(--primary-light)] p-8 pt-10 pb-12 flex flex-col items-center justify-center text-center rounded-b-[40px]">
        <span className="text-6xl mb-4 shadow-sm bg-white w-20 h-20 rounded-full flex items-center justify-center">{article.icon}</span>
        <span className="bg-white/80 text-[var(--primary)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
          {article.tag}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--dark)] leading-tight">{article.title}</h1>
        <div className="flex items-center gap-2 mt-4 text-[var(--primary)] text-sm font-semibold">
          <span>⏱️ {article.time} read</span>
          <span>•</span>
          <span>Expert Curated</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8 max-w-none pb-32">
        <div className="prose prose-purple">
          {formattedContent}
        </div>
        
        {/* Footer Action */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
          <p className="font-bold text-[var(--dark)] mb-2">Ready to apply what you've learned?</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full mt-2">
            <span>Explore Funds</span>
          </button>
        </div>
      </div>
    </div>
  );
}
