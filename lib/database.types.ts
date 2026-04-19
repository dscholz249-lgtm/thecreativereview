// Hand-written type stub matching supabase/migrations/20260417120000_initial_schema.sql.
// Regenerate from the live DB once linked:
//   npm run db:types       (writes this file from the linked Supabase project)
// Keep this file in sync with migrations until we wire generation into CI.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspacePlan = "oss" | "solo" | "studio" | "agency";
export type AdminRole = "owner" | "member";
export type ProjectStatus = "draft" | "in_review" | "completed" | "archived";
export type AssetType = "image" | "document" | "design" | "wireframe";
export type AssetStatus = "pending" | "approved" | "rejected" | "revision_submitted";
export type DecisionVerdict = "approve" | "reject";

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          plan: WorkspacePlan;
          storage_used_bytes: number;
          admin_seat_count: number;
          custom_domain: string | null;
          white_label: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          plan?: WorkspacePlan;
          storage_used_bytes?: number;
          admin_seat_count?: number;
          custom_domain?: string | null;
          white_label?: boolean;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          name?: string;
          plan?: WorkspacePlan;
          storage_used_bytes?: number;
          admin_seat_count?: number;
          custom_domain?: string | null;
          white_label?: boolean;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      admin_profiles: {
        Row: {
          user_id: string;
          workspace_id: string;
          role: AdminRole;
          name: string | null;
          timezone: string;
          created_at: Timestamp;
        };
        Insert: {
          user_id: string;
          workspace_id: string;
          role?: AdminRole;
          name?: string | null;
          timezone?: string;
          created_at?: Timestamp;
        };
        Update: {
          user_id?: string;
          workspace_id?: string;
          role?: AdminRole;
          name?: string | null;
          timezone?: string;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "admin_profiles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          primary_email: string;
          logo_url: string | null;
          archived: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          primary_email: string;
          logo_url?: string | null;
          archived?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          primary_email?: string;
          logo_url?: string | null;
          archived?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      client_reviewers: {
        Row: {
          id: string;
          client_id: string;
          auth_user_id: string | null;
          email: string;
          name: string | null;
          timezone: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          client_id: string;
          auth_user_id?: string | null;
          email: string;
          name?: string | null;
          timezone?: string;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          client_id?: string;
          auth_user_id?: string | null;
          email?: string;
          name?: string | null;
          timezone?: string;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "client_reviewers_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          deadline: string | null;
          status: ProjectStatus;
          last_reminded_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          description?: string | null;
          deadline?: string | null;
          status?: ProjectStatus;
          last_reminded_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          description?: string | null;
          deadline?: string | null;
          status?: ProjectStatus;
          last_reminded_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          type: AssetType;
          current_version_id: string | null;
          deadline: string | null;
          status: AssetStatus;
          archived: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          type: AssetType;
          current_version_id?: string | null;
          deadline?: string | null;
          status?: AssetStatus;
          archived?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          type?: AssetType;
          current_version_id?: string | null;
          deadline?: string | null;
          status?: AssetStatus;
          archived?: boolean;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_current_version_id_fkey";
            columns: ["current_version_id"];
            isOneToOne: false;
            referencedRelation: "asset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      asset_versions: {
        Row: {
          id: string;
          asset_id: string;
          version_number: number;
          storage_path: string | null;
          external_url: string | null;
          upload_note: string | null;
          uploaded_by: string | null;
          uploaded_at: Timestamp;
        };
        Insert: {
          id?: string;
          asset_id: string;
          version_number: number;
          storage_path?: string | null;
          external_url?: string | null;
          upload_note?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: Timestamp;
        };
        Update: {
          id?: string;
          asset_id?: string;
          version_number?: number;
          storage_path?: string | null;
          external_url?: string | null;
          upload_note?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "asset_versions_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
      decisions: {
        Row: {
          id: string;
          asset_version_id: string;
          reviewer_id: string;
          verdict: DecisionVerdict;
          feedback_text: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          asset_version_id: string;
          reviewer_id: string;
          verdict: DecisionVerdict;
          feedback_text?: string | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          asset_version_id?: string;
          reviewer_id?: string;
          verdict?: DecisionVerdict;
          feedback_text?: string | null;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_asset_version_id_fkey";
            columns: ["asset_version_id"];
            isOneToOne: false;
            referencedRelation: "asset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "client_reviewers";
            referencedColumns: ["id"];
          },
        ];
      };
      annotations: {
        Row: {
          id: string;
          asset_version_id: string;
          reviewer_id: string;
          x_pct: number;
          y_pct: number;
          comment_text: string;
          resolved_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          asset_version_id: string;
          reviewer_id: string;
          x_pct: number;
          y_pct: number;
          comment_text: string;
          resolved_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          asset_version_id?: string;
          reviewer_id?: string;
          x_pct?: number;
          y_pct?: number;
          comment_text?: string;
          resolved_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "annotations_asset_version_id_fkey";
            columns: ["asset_version_id"];
            isOneToOne: false;
            referencedRelation: "asset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "annotations_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "client_reviewers";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          kind: string;
          recipient_email: string;
          payload_json: Json;
          sent_at: Timestamp | null;
          opened_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          kind: string;
          recipient_email: string;
          payload_json?: Json;
          sent_at?: Timestamp | null;
          opened_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          kind?: string;
          recipient_email?: string;
          payload_json?: Json;
          sent_at?: Timestamp | null;
          opened_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_decision: {
        Args: {
          p_asset_version_id: string;
          p_verdict: DecisionVerdict;
          p_feedback_text?: string | null;
          p_annotations?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      workspace_plan: WorkspacePlan;
      admin_role: AdminRole;
      project_status: ProjectStatus;
      asset_type: AssetType;
      asset_status: AssetStatus;
      decision_verdict: DecisionVerdict;
    };
    CompositeTypes: Record<string, never>;
  };
};
