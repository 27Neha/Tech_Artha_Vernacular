import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const LESSONS = [
  { key: 'mutual-funds-basics', level: 'BEGINNER', minutes: 5, title: { en: 'What is a mutual fund?', hi: 'म्यूचुअल फंड क्या है?', mr: 'म्युच्युअल फंड म्हणजे काय?' }, summary: { en: 'A simple introduction to pooled investing, NAV and market risk.', hi: 'साझा निवेश, NAV और बाजार जोखिम का आसान परिचय।', mr: 'एकत्रित गुंतवणूक, NAV आणि बाजारातील जोखमीची सोपी ओळख.' } },
  { key: 'sip-basics', level: 'BEGINNER', minutes: 4, title: { en: 'How SIPs work', hi: 'SIP कैसे काम करती है?', mr: 'SIP कशी काम करते?' }, summary: { en: 'Understand regular investments and why returns are never guaranteed.', hi: 'नियमित निवेश और बिना गारंटी वाले रिटर्न को समझें।', mr: 'नियमित गुंतवणूक आणि हमी नसलेले परतावे समजून घ्या.' } },
  { key: 'risk-basics', level: 'BEGINNER', minutes: 6, title: { en: 'Understanding risk', hi: 'जोखिम को समझें', mr: 'जोखीम समजून घ्या' }, summary: { en: 'Learn why your investor profile differs from a fund Risk-o-Meter.', hi: 'जानें कि आपका निवेशक प्रोफाइल फंड के Risk-o-Meter से अलग क्यों है।', mr: 'तुमचे गुंतवणूकदार प्रोफाइल फंड Risk-o-Meter पेक्षा वेगळे का आहे ते जाणून घ्या.' } },
];

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, locale = 'en') {
    const progress = await this.prisma.learningProgress.findMany({ where: { userId } });
    const map = new Map(progress.map((item) => [item.lessonKey, item]));
    const language = ['en', 'hi', 'mr'].includes(locale) ? locale as 'en' | 'hi' | 'mr' : 'en';
    return LESSONS.map((lesson) => ({ key: lesson.key, level: lesson.level, minutes: lesson.minutes, title: lesson.title[language], summary: lesson.summary[language], completed: map.get(lesson.key)?.completed ?? false }));
  }

  async complete(userId: string, lessonKey: string, score?: number) {
    if (!LESSONS.some((lesson) => lesson.key === lessonKey)) throw new BadRequestException('Lesson not found.');
    if (score !== undefined && (!Number.isInteger(score) || score < 0 || score > 100)) throw new BadRequestException('Score must be between 0 and 100.');
    return this.prisma.learningProgress.upsert({ where: { userId_lessonKey: { userId, lessonKey } }, update: { completed: true, score }, create: { userId, lessonKey, completed: true, score } });
  }
}
