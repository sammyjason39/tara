import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class BulletinService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(params: {
    tenantId: string;
    authorId: string;
    title: string;
    body: string;
    category?: string;
    isPinned?: boolean;
    scopeType?: string;
    scopeId?: string;
  }) {
    return this.prisma.bulletinPost.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: params.tenantId,
        authorId: params.authorId,
        title: params.title,
        body: params.body,
        category: params.category ?? 'general',
        isPinned: params.isPinned ?? false,
        scopeType: params.scopeType ?? 'company',
        scopeId: params.scopeId ?? null,
      },
    });
  }

  async getPosts(tenantId: string, filters: any) {
    const page = filters.page ?? 1;
    const limit = filters.limit ? parseInt(filters.limit) : 100;
    const skip = (page - 1) * limit;

    const where: any = { 
      tenantId,
      deletedAt: null,
      status: 'published',
    };

    if (filters.category) where.category = filters.category;
    if (filters.authorId) where.authorId = filters.authorId;

    const [data, total] = await Promise.all([
      this.prisma.bulletinPost.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: {
            select: { 
              bulletinReactions: true, 
              bulletinComments: true,
              bulletinReads: true 
            }
          },
          bulletinReactions: {
            select: { type: true, userId: true }
          }
        },
        skip,
        take: limit,
      }),
      this.prisma.bulletinPost.count({ where }),
    ]);

    // Map to include counts by type
    const enrichedData = (data as any[]).map(post => {
      const likes = post.bulletinReactions.filter((r: any) => r.type === 'LIKE').length;
      const dislikes = post.bulletinReactions.filter((r: any) => r.type === 'DISLIKE').length;
      return {
        ...post,
        likesCount: likes,
        dislikesCount: dislikes,
        commentsCount: post._count.bulletinComments,
      };
    });

    return { data: enrichedData, total, page, limit };
  }

  async getPostById(tenantId: string, id: string) {
    const post = await this.prisma.bulletinPost.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        bulletinComments: {
          orderBy: { createdAt: 'desc' },
        },
        bulletinReactions: {
          select: { type: true, userId: true }
        },
        _count: {
          select: { bulletinReactions: true, bulletinReads: true, bulletinComments: true },
        },
      },
    });

    if (!post) return null;

    return {
      ...post,
      likesCount: post.bulletinReactions.filter((r: any) => r.type === 'LIKE').length,
      dislikesCount: post.bulletinReactions.filter((r: any) => r.type === 'DISLIKE').length,
      commentsCount: post._count.bulletinComments,
    };
  }

  async addComment(params: {
    tenantId: string;
    postId: string;
    authorId: string;
    body: string;
  }) {
    return this.prisma.bulletinComment.create({
      data: {
        id: uuidv4(),
        
        tenantId: params.tenantId,
        postId: params.postId,
        authorId: params.authorId,
        body: params.body,
      },
    });
  }

  async toggleReaction(params: {
    tenantId: string;
    postId: string;
    userId: string;
    type: string; // 'LIKE' or 'DISLIKE'
  }) {
    const existing = await this.prisma.bulletinReaction.findFirst({
      where: {
        postId: params.postId,
        userId: params.userId,
        tenantId: params.tenantId,
      },
    });

    if (existing) {
      // If clicking same type, remove it
      if (existing.type === params.type) {
        return this.prisma.bulletinReaction.delete({
          where: { id: existing.id },
        });
      }
      // If clicking different type, update it
      return this.prisma.bulletinReaction.update({
        where: { id: existing.id },
        data: { type: params.type },
      });
    }

    // New reaction
    return this.prisma.bulletinReaction.create({
      data: {
        id: uuidv4(),
        
        postId: params.postId,
        userId: params.userId,
        tenantId: params.tenantId,
        type: params.type,
      },
    });
  }

  async updatePost(tenantId: string, id: string, data: any) {
    return this.prisma.bulletinPost.update({
      where: { id, tenantId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async deletePost(tenantId: string, id: string) {
    return this.prisma.bulletinPost.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        status: 'archived',
      },
    });
  }

  // Categories management
  async getCategories(tenantId: string) {
    return this.prisma.bulletinCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, data: { name: string; code: string; color?: string }) {
    return this.prisma.bulletinCategory.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, data: any) {
    return this.prisma.bulletinCategory.update({
      where: { id, tenantId },
      data,
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    // Check if any posts use this category code
    const category = await this.prisma.bulletinCategory.findFirst({ where: { id, tenantId } });
    if (!category) return null;

    // We don't strictly enforce relational integrity with string codes here, 
    // but we could update posts or just let it be.
    return this.prisma.bulletinCategory.delete({
      where: { id, tenantId },
    });
  }
}
