export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generated_apps: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          code: string;
          metadata: Json | null;
          is_public: boolean;
          preview_slug: string | null;
          preview_enabled: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          code: string;
          metadata?: Json | null;
          is_public?: boolean;
          preview_slug?: string | null;
          preview_enabled?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          code?: string;
          metadata?: Json | null;
          is_public?: boolean;
          preview_slug?: string | null;
          preview_enabled?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generated_apps_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_history_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          event_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          event_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          event_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      app_templates: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          code_template: string;
          category: string | null;
          tags: string[] | null;
          is_public: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          code_template: string;
          category?: string | null;
          tags?: string[] | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          code_template?: string;
          category?: string | null;
          tags?: string[] | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_documentation: {
        Row: {
          id: string;
          app_id: string;
          user_id: string;
          project_name: string;
          project_description: string | null;
          concept_snapshot: Json | null;
          layout_snapshot: Json | null;
          plan_snapshot: Json | null;
          build_status: 'planning' | 'ready' | 'building' | 'completed' | 'failed' | 'paused';
          build_started_at: string | null;
          build_completed_at: string | null;
          phase_executions: Json;
          stats: Json;
          notes: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          app_id: string;
          user_id: string;
          project_name: string;
          project_description?: string | null;
          concept_snapshot?: Json | null;
          layout_snapshot?: Json | null;
          plan_snapshot?: Json | null;
          build_status?: 'planning' | 'ready' | 'building' | 'completed' | 'failed' | 'paused';
          build_started_at?: string | null;
          build_completed_at?: string | null;
          phase_executions?: Json;
          stats?: Json;
          notes?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          app_id?: string;
          user_id?: string;
          project_name?: string;
          project_description?: string | null;
          concept_snapshot?: Json | null;
          layout_snapshot?: Json | null;
          plan_snapshot?: Json | null;
          build_status?: 'planning' | 'ready' | 'building' | 'completed' | 'failed' | 'paused';
          build_started_at?: string | null;
          build_completed_at?: string | null;
          phase_executions?: Json;
          stats?: Json;
          notes?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'project_documentation_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string | null;
          token_expires_at: string | null;
          account_id: string | null;
          account_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          access_token_encrypted: string;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          account_id?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          access_token_encrypted?: string;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          account_id?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_integrations_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'user_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
