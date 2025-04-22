import { PrismaClient, Workspace, WorkspaceUser } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class WorkspaceService {
  async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    return prisma.workspace.findMany({
      where: {
        users: {
          some: {
            userId: userId
          }
        }
      }
    });
  }

  async createWorkspace(params: {
    name: string;
    settings?: any;
    creatorId: string;
  }): Promise<{ workspace?: Workspace; error?: string }> {
    const { name, settings, creatorId } = params;

    try {
      const workspace = await prisma.$transaction(async (tx) => {
        // Opret workspace
        const workspace = await tx.workspace.create({
          data: {
            id: uuidv4(),
            name,
            slug: this.generateSlug(name),
            settings: settings || {},
          }
        });

        // Tilføj creator som admin
        await tx.workspaceUser.create({
          data: {
            workspaceId: workspace.id,
            userId: creatorId,
            role: 'admin'
          }
        });

        return workspace;
      });

      return { workspace };
    } catch (error) {
      console.error('Fejl ved oprettelse af workspace:', error);
      return { error: 'Kunne ikke oprette workspace' };
    }
  }

  async userCanManageWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const user = await prisma.workspaceUser.findFirst({
      where: {
        userId,
        workspaceId,
        role: 'admin'
      }
    });

    return !!user;
  }

  async userCanAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const user = await prisma.workspaceUser.findFirst({
      where: {
        userId,
        workspaceId
      }
    });

    return !!user;
  }

  private generateSlug(name: string): string {
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uuidv4().slice(0, 8)}`;
  }
} 