import { describe, expect, it } from 'vitest';
import { answerWithLocalRag } from '@/utils/localRag';
import { InstagramPost } from '@/types/instagram';

function makePost(overrides: Partial<InstagramPost>): InstagramPost {
  const publishedAt = overrides.publishedAt || new Date('2026-01-05T10:00:00');
  const likes = overrides.likes || 0;
  const comments = overrides.comments || 0;
  const shares = overrides.shares || 0;
  const saves = overrides.saves || 0;
  const reach = overrides.reach || 1;
  const views = overrides.views || 1;
  const engagementTotal = likes + comments + shares + saves;

  return {
    id: overrides.id || crypto.randomUUID(),
    accountId: 'account',
    username: 'nadsongl',
    accountName: 'Nadson',
    description: overrides.description || '',
    duration: overrides.duration || 20,
    publishedAt,
    permalink: '',
    postType: overrides.postType || 'Reel do Instagram',
    views,
    reach,
    likes,
    shares,
    follows: overrides.follows || 0,
    comments,
    saves,
    engagementRate: overrides.engagementRate ?? (engagementTotal / reach) * 100,
    engagementTotal,
    reachRate: (reach / views) * 100,
    dayOfWeek: publishedAt.getDay(),
    dayName: overrides.dayName || 'Segunda',
    hour: overrides.hour ?? publishedAt.getHours(),
    period: 'morning',
    weekNumber: 1,
    descriptionLength: overrides.description?.length || 0,
    hasEmoji: false,
    emojiCount: 0,
    hashtagCount: 0,
  };
}

const posts = [
  makePost({
    id: 'top',
    description: 'Storytelling forte sobre rotina de criador',
    views: 10000,
    reach: 8000,
    likes: 900,
    comments: 80,
    shares: 120,
    saves: 240,
    engagementRate: 16.75,
    hour: 9,
    dayName: 'Sexta',
  }),
  makePost({
    id: 'mid',
    description: 'Bastidores de gravação no estúdio',
    views: 4200,
    reach: 3000,
    likes: 260,
    comments: 20,
    shares: 30,
    saves: 50,
    engagementRate: 12,
    hour: 11,
    dayName: 'Quarta',
  }),
  makePost({
    id: 'low',
    description: 'Post informativo sem gancho inicial',
    views: 900,
    reach: 700,
    likes: 20,
    comments: 1,
    shares: 2,
    saves: 1,
    engagementRate: 3.42,
    hour: 18,
    dayName: 'Domingo',
  }),
];

describe('answerWithLocalRag', () => {
  it('understands broad ranking questions like "Quais os melhores posts?"', () => {
    const answer = answerWithLocalRag('Quais os melhores posts?', posts);

    expect(answer).toContain('melhores');
    expect(answer).toContain('Storytelling forte');
    expect(answer).toContain('score composto');
  });

  it('understands low-performance questions', () => {
    const answer = answerWithLocalRag('Quais posts tiveram pior desempenho?', posts);

    expect(answer).toContain('menor performance');
    expect(answer).toContain('Post informativo');
  });

  it('returns recommendations from natural strategic questions', () => {
    const answer = answerWithLocalRag('O que devo melhorar na estratégia?', posts);

    expect(answer).toContain('recomendações');
    expect(answer).toContain('top 15%');
  });
});
