import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeTableSchema, parseCSVData } from '@/utils/dataProcessor';

function readFixtureLines(relativePath: string, lineCount = 3) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).slice(0, lineCount).join('\n');
}

describe('parseCSVData', () => {
  it('accepts the repository Meta export column layout', () => {
    const csv = [
      '\uFEFF"Identificação do post","Identificação da conta","Nome de usuário da conta","Nome da conta",Descrição,"Duração (s)","Horário de publicação","Link permanente","Tipo de post","Comentário de dados",Data,Visualizações,Alcance,Curtidas,Compartilhamentos,Seguimentos,Comentários,Salvamentos',
      '18278838484304774,17841403684060377,nadsongl,Nadson,"Banalizaram o uso do laele 🤦🏾‍♀️",22,"01/17/2026 10:29",https://www.instagram.com/reel/DTnzJNojp1n/,"Reel do Instagram",,Total,2752,1732,153,7,0,8,2',
      '17963547213009228,17841403684060377,nadsongl,Nadson,"Talvez eu esteja ficando louco 🤔",20,"01/17/2026 08:16",https://www.instagram.com/reel/DTnj7osDip_/,"Reel do Instagram",,Total,1856,1424,146,15,1,2,1',
    ].join('\n');
    const posts = parseCSVData(csv);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      id: '18278838484304774',
      accountId: '17841403684060377',
      username: 'nadsongl',
      accountName: 'Nadson',
      postType: 'Reel do Instagram',
      views: 2752,
      reach: 1732,
      likes: 153,
      shares: 7,
      comments: 8,
      saves: 2,
    });
    expect(posts[0].publishedAt.getFullYear()).toBe(2026);
    expect(posts[0].publishedAt.getMonth()).toBe(0);
    expect(posts[0].publishedAt.getDate()).toBe(17);
  });

  it('accepts the repository normalized database export column layout', () => {
    const raw = readFixtureLines('server/data/instagram_posts-export-2026-05-02_09-17-47.csv');
    const csv = raw.replace(/;/g, ',');
    const posts = parseCSVData(csv);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      id: '18089698688014346',
      accountId: '17841403684060377',
      username: 'nadsongl',
      accountName: 'Nadson',
      postType: 'Reel do Instagram',
      views: 1512,
      reach: 1157,
      likes: 109,
      shares: 1,
      comments: 1,
      saves: 2,
    });
    expect(posts[0].publishedAt.toISOString()).toContain('2027-08-01T17:39:00');
  });

  it('maps similar English table headers for individual analysis uploads', () => {
    const csv = [
      'media_id,username,caption,timestamp,permalink,media_type,plays,reach,like_count,comments_count,share_count,save_count',
      'abc123,nadsongl,"Hook forte para teste","2026-03-10 09:30",https://instagram.com/p/abc,REELS,12000,9000,800,44,60,180',
    ].join('\n');
    const posts = parseCSVData(csv);
    const schema = analyzeTableSchema([
      {
        media_id: 'abc123',
        username: 'nadsongl',
        caption: 'Hook forte para teste',
        timestamp: '2026-03-10 09:30',
        permalink: 'https://instagram.com/p/abc',
        media_type: 'REELS',
        plays: '12000',
        reach: '9000',
        like_count: '800',
        comments_count: '44',
        share_count: '60',
        save_count: '180',
      },
    ]);

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: 'abc123',
      description: 'Hook forte para teste',
      postType: 'REELS',
      views: 12000,
      reach: 9000,
      likes: 800,
      comments: 44,
      shares: 60,
      saves: 180,
    });
    expect(schema.missingRequired).toHaveLength(0);
    expect(schema.mappedFields.find((field) => field.field === 'description')?.sourceColumn).toBe('caption');
    expect(schema.mappedFields.find((field) => field.field === 'views')?.sourceColumn).toBe('plays');
  });
});
