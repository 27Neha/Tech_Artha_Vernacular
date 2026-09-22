export class MinorInvestorProfileEngine {
  
  static calculate(answers: any[]) {
    // Q1: Goal (index 0)
    const goalAnswer = answers[0]?.t || '';
    let goalType = 'OTHER';
    if (goalAnswer.includes('Education')) goalType = 'EDUCATION';
    else if (goalAnswer.includes('Technology')) goalType = 'TECHNOLOGY';
    else if (goalAnswer.includes('Travel')) goalType = 'EXPERIENCE';
    else if (goalAnswer.includes('Career')) goalType = 'CAREER_BUSINESS';
    else if (goalAnswer.includes('Wealth')) goalType = 'LONG_TERM_WEALTH';

    // Q2: Time Horizon (index 1) - max 100
    const timeAnswer = answers[1]?.t || '';
    let timeHorizonScore = 20;
    if (timeAnswer.includes('1–3')) timeHorizonScore = 40;
    else if (timeAnswer.includes('3–5')) timeHorizonScore = 60;
    else if (timeAnswer.includes('5–10')) timeHorizonScore = 80;
    else if (timeAnswer.includes('10+')) timeHorizonScore = 100;

    // Q3: Loss Reaction (20%) - index 2
    const lossAnswer = answers[2]?.t || '';
    let q3Score = 0;
    if (lossAnswer.includes('wait')) q3Score = 40;
    else if (lossAnswer.includes('stay invested')) q3Score = 80;
    else if (lossAnswer.includes('investing more')) q3Score = 100;

    // Q4: Stability/Growth (15%) - index 3
    const stabAnswer = answers[3]?.t || '';
    let q4Score = 20;
    if (stabAnswer.includes('balance')) q4Score = 60;
    else if (stabAnswer.includes('More growth')) q4Score = 100;

    // Q5: Knowledge (index 4) - max 100
    const knowAnswer = answers[4]?.t || '';
    let knowledgeScore = 25;
    if (knowAnswer.includes('SIPs')) knowledgeScore = 45;
    else if (knowAnswer.includes('basics')) knowledgeScore = 70;
    else if (knowAnswer.includes('explored')) knowledgeScore = 90;

    // Q6: Financial Habits (index 5) - max 100
    const habitAnswer = answers[5]?.t || '';
    let financialHabitScore = 25;
    if (habitAnswer.includes('some and save some')) financialHabitScore = 50;
    else if (habitAnswer.includes('Mostly save')) financialHabitScore = 75;
    else if (habitAnswer.includes('Save first')) financialHabitScore = 90;

    // Q7: Patience (15%) - index 6
    const patAnswer = answers[6]?.t || '';
    let q7Score = 20;
    if (patAnswer.includes('few years')) q7Score = 50;
    else if (patAnswer.includes('5+ years')) q7Score = 80;
    else if (patAnswer.includes('future self')) q7Score = 100;

    // Q8: Fluctuations (20%) - index 7
    const flucAnswer = answers[7]?.t || '';
    let q8Score = 20;
    if (flucAnswer.includes('Some movement')) q8Score = 60;
    else if (flucAnswer.includes('bigger fluctuations')) q8Score = 100;

    // Q9: Protection/Growth (10%) - index 8
    const protAnswer = answers[8]?.t || '';
    let q9Score = 20;
    if (protAnswer.includes('Balancing')) q9Score = 60;
    else if (protAnswer.includes('Growing')) q9Score = 100;

    // Q10: Scenario (20%) - index 9
    const scenAnswer = answers[9]?.t || '';
    let q10Score = 20;
    if (scenAnswer.includes('understand')) q10Score = 50;
    else if (scenAnswer.includes('stay invested')) q10Score = 80;
    else if (scenAnswer.includes('continuing my plan')) q10Score = 100;

    // Calculate Risk Tolerance Score
    const riskToleranceScore = Math.round(
      (q3Score * 0.20) +
      (q4Score * 0.15) +
      (q7Score * 0.15) +
      (q8Score * 0.20) +
      (q9Score * 0.10) +
      (q10Score * 0.20)
    );

    // Profile Classification
    let profileType = 'CAUTIOUS_STARTER';
    let profileTitle = '🛡️ Cautious Starter';
    let profileTagline = 'Steady steps. Strong foundations.';
    
    if (riskToleranceScore >= 25 && riskToleranceScore < 50) {
      profileType = 'STEADY_BUILDER';
      profileTitle = '🌱 Steady Builder';
      profileTagline = "You're playing the long game.";
    } else if (riskToleranceScore >= 50 && riskToleranceScore < 75) {
      profileType = 'BALANCED_BUILDER';
      profileTitle = '⚖️ Balanced Builder';
      profileTagline = "Growth matters. So does staying grounded.";
    } else if (riskToleranceScore >= 75) {
      profileType = 'GROWTH_EXPLORER';
      profileTitle = '🚀 Growth Explorer';
      profileTagline = "You're comfortable giving your future room to grow.";
    }

    // Consistency Check
    let profileConsistency = 'ALIGNED';
    if (riskToleranceScore >= 70 && timeHorizonScore <= 40) {
      profileConsistency = 'MIXED';
    } else if (riskToleranceScore <= 30 && timeHorizonScore >= 80) {
      profileConsistency = 'MIXED';
    }

    // Dynamic Insights
    const insights = [];
    if (timeHorizonScore >= 60) {
      insights.push({ type: 'TIME_HORIZON', title: '⏳ Long-term thinker', description: `You selected a ${timeAnswer} horizon.` });
    } else {
      insights.push({ type: 'TIME_HORIZON', title: '⏱️ Near-term focus', description: `You selected a ${timeAnswer} horizon.` });
    }

    if (riskToleranceScore >= 60) {
      insights.push({ type: 'RISK', title: '📈 Comfortable with movement', description: "You indicated that temporary fluctuations would not automatically make you exit." });
    } else {
      insights.push({ type: 'RISK', title: '🛡️ Protection focused', description: "You prefer avoiding large swings in value and value stability." });
    }

    if (knowledgeScore < 70) {
      insights.push({ type: 'KNOWLEDGE', title: '🧠 Still learning', description: "You're building your investing knowledge." });
    } else {
      insights.push({ type: 'KNOWLEDGE', title: '📚 Solid foundation', description: "You have a good grasp of basic investing concepts." });
    }
    
    insights.push({ type: 'GOAL', title: '🎯 Goal-driven', description: `Your primary goal is ${goalAnswer}.` });

    return {
      riskToleranceScore,
      timeHorizonScore,
      knowledgeScore,
      financialHabitScore,
      goalType,
      goalLabel: goalAnswer,
      profileType,
      profileTitle,
      profileTagline,
      profileConsistency,
      insights
    };
  }
}
