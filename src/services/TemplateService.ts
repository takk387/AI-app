import { createClient } from '@/utils/supabase/client';
import type { DesignTemplate } from '@/components/layout-builder/TemplateLibrary';

/**
 * TemplateService
 *
 * Handles CRUD operations for design templates stored in Supabase.
 * Supports both user-specific and public templates.
 */
class TemplateServiceClass {
  private supabase = createClient();
  private tableName = 'design_templates';

  /**
   * Fetch all templates for the current user
   * Includes user's own templates and public templates from others
   */
  async getTemplates(): Promise<DesignTemplate[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      // Return only public templates for unauthenticated users
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching public templates:', error);
        return [];
      }

      return this.mapTemplates(data || []);
    }

    // Fetch user's own templates + public templates
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return this.mapTemplates(data || []);
  }

  /**
   * Fetch templates by category
   */
  async getTemplatesByCategory(category: DesignTemplate['category']): Promise<DesignTemplate[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (user) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates by category:', error);
      return [];
    }

    return this.mapTemplates(data || []);
  }

  /**
   * Fetch a single template by ID
   */
  async getTemplate(templateId: string): Promise<DesignTemplate | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return this.mapTemplate(data);
  }

  /**
   * Save a new template
   */
  async saveTemplate(
    name: string,
    category: DesignTemplate['category'],
    design: Record<string, unknown>,
    options?: {
      description?: string;
      thumbnail?: string;
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<DesignTemplate | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.error('User must be authenticated to save templates');
      return null;
    }

    const templateData = {
      user_id: user.id,
      name,
      category,
      design,
      description: options?.description || null,
      thumbnail: options?.thumbnail || null,
      tags: options?.tags || [],
      is_public: options?.isPublic ?? false,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error saving template:', error);
      return null;
    }

    return this.mapTemplate(data);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      category: DesignTemplate['category'];
      description: string;
      design: Record<string, unknown>;
      thumbnail: string;
      tags: string[];
      isPublic: boolean;
    }>
  ): Promise<DesignTemplate | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.error('User must be authenticated to update templates');
      return null;
    }

    // Map camelCase to snake_case for database
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.design !== undefined) dbUpdates.design = updates.design;
    if (updates.thumbnail !== undefined) dbUpdates.thumbnail = updates.thumbnail;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(dbUpdates)
      .eq('id', templateId)
      .eq('user_id', user.id) // Ensure user owns the template
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return null;
    }

    return this.mapTemplate(data);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.error('User must be authenticated to delete templates');
      return false;
    }

    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id); // Ensure user owns the template

    if (error) {
      console.error('Error deleting template:', error);
      return false;
    }

    return true;
  }

  /**
   * Duplicate a template (creates a copy for the current user)
   */
  async duplicateTemplate(templateId: string, newName?: string): Promise<DesignTemplate | null> {
    const original = await this.getTemplate(templateId);
    if (!original) {
      console.error('Template not found');
      return null;
    }

    return this.saveTemplate(
      newName || `${original.name} (Copy)`,
      original.category,
      original.design,
      {
        description: original.description,
        tags: original.tags,
        isPublic: false, // Copies are private by default
      }
    );
  }

  /**
   * Search templates by name or tags
   */
  async searchTemplates(query: string): Promise<DesignTemplate[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    // Use ilike for case-insensitive search
    let dbQuery = this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (user) {
      dbQuery = dbQuery.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      dbQuery = dbQuery.eq('is_public', true);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error searching templates:', error);
      return [];
    }

    return this.mapTemplates(data || []);
  }

  /**
   * Upload thumbnail image for a template
   */
  async uploadThumbnail(templateId: string, imageBlob: Blob): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.error('User must be authenticated to upload thumbnails');
      return null;
    }

    const fileName = `${user.id}/${templateId}-${Date.now()}.png`;

    const { error: uploadError } = await this.supabase.storage
      .from('template-thumbnails')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from('template-thumbnails').getPublicUrl(fileName);

    // Update template with thumbnail URL
    await this.updateTemplate(templateId, { thumbnail: publicUrl });

    return publicUrl;
  }

  /**
   * Map database row to DesignTemplate interface
   */
  private mapTemplate(row: Record<string, unknown>): DesignTemplate {
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as DesignTemplate['category'],
      description: row.description as string | undefined,
      thumbnail: row.thumbnail as string | undefined,
      design: row.design as Record<string, unknown>,
      tags: row.tags as string[] | undefined,
      isPublic: row.is_public as boolean | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Map multiple database rows to DesignTemplate array
   */
  private mapTemplates(rows: Record<string, unknown>[]): DesignTemplate[] {
    return rows.map((row) => this.mapTemplate(row));
  }
}

// Export singleton instance
export const TemplateService = new TemplateServiceClass();

// Export class for testing
export { TemplateServiceClass };
