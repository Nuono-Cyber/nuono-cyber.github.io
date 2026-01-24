import { InstagramPost } from '@/types/instagram';
import { formatNumber } from '@/utils/dataProcessor';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';

interface PostsTableProps {
  posts: InstagramPost[];
  limit?: number;
  showRank?: boolean;
}

export function PostsTable({ posts, limit = 10, showRank = true }: PostsTableProps) {
  const displayPosts = posts.slice(0, limit);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/40">
            {showRank && <TableHead className="w-12">#</TableHead>}
            <TableHead className="min-w-[200px]">Descrição</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Eye className="w-4 h-4" />
                <span>Views</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Heart className="w-4 h-4" />
                <span>Likes</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>Coment.</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Bookmark className="w-4 h-4" />
                <span>Salvos</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Share2 className="w-4 h-4" />
                <span>Shares</span>
              </div>
            </TableHead>
            <TableHead className="text-right">Engaj.</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayPosts.map((post, index) => (
            <TableRow key={post.id} className="hover:bg-secondary/20">
              {showRank && (
                <TableCell className="font-mono text-muted-foreground">
                  {index + 1}
                </TableCell>
              )}
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="truncate text-sm font-medium">{post.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.publishedAt.toLocaleDateString('pt-BR')} às {post.publishedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {formatNumber(post.views)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(post.likes)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {post.comments}
              </TableCell>
              <TableCell className="text-right font-mono">
                {post.saves}
              </TableCell>
              <TableCell className="text-right font-mono">
                {post.shares}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={post.engagementRate > 5 ? 'default' : 'secondary'} className="font-mono">
                  {post.engagementRate.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
