
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allowed_signup_domains": {
                  Row: {
                    "domain": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "domain": string,"note"?: string | null
                  }
                  Update: {
                    "domain"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"listing_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"listing_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"listing_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"inquiries": {
                  Row: {
                    "created_at": string,"desired_from": string | null,"desired_to": string | null,"id": string,"listing_id": string,"message": string,"recipient_id": string,"sender_id": string,"status": Database["public"]['Enums']["inquiry_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"desired_from"?: string | null,"desired_to"?: string | null,"id"?: string,"listing_id": string,"message": string,"recipient_id": string,"sender_id": string,"status"?: Database["public"]['Enums']["inquiry_status"]
                  }
                  Update: {
                    "created_at"?: string,"desired_from"?: string | null,"desired_to"?: string | null,"id"?: string,"listing_id"?: string,"message"?: string,"recipient_id"?: string,"sender_id"?: string,"status"?: Database["public"]['Enums']["inquiry_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "inquiries_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inquiries_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inquiries_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_images": {
                  Row: {
                    "alt": string,"created_at": string,"id": string,"listing_id": string,"position": number,"storage_path": string | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string,"created_at"?: string,"id"?: string,"listing_id": string,"position": number,"storage_path"?: string | null,"url": string
                  }
                  Update: {
                    "alt"?: string,"created_at"?: string,"id"?: string,"listing_id"?: string,"position"?: number,"storage_path"?: string | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_images_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "amenities": (string)[],"available_from": string,"available_to": string,"bathrooms": number,"bedrooms": number,"created_at": string,"description": string,"flexible_dates": boolean,"furnished": boolean,"house_rules": string | null,"housing_type": Database["public"]['Enums']["housing_type"],"id": string,"lease_permission": Database["public"]['Enums']["lease_permission"],"location_hint": string,"neighborhood": string,"owner_id": string,"published_at": string | null,"rent": number,"room_type": Database["public"]['Enums']["room_type"],"roommates": number,"search_text": string | null,"security_deposit": number | null,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string,"utilities_estimate": number | null,"utilities_included": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "amenities"?: (string)[],"available_from": string,"available_to": string,"bathrooms": number,"bedrooms": number,"created_at"?: string,"description": string,"flexible_dates"?: boolean,"furnished"?: boolean,"house_rules"?: string | null,"housing_type": Database["public"]['Enums']["housing_type"],"id"?: string,"lease_permission": Database["public"]['Enums']["lease_permission"],"location_hint": string,"neighborhood": string,"owner_id": string,"published_at"?: string | null,"rent": number,"room_type": Database["public"]['Enums']["room_type"],"roommates"?: number,"search_text"?: never,"security_deposit"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"updated_at"?: string,"utilities_estimate"?: number | null,"utilities_included"?: boolean
                  }
                  Update: {
                    "amenities"?: (string)[],"available_from"?: string,"available_to"?: string,"bathrooms"?: number,"bedrooms"?: number,"created_at"?: string,"description"?: string,"flexible_dates"?: boolean,"furnished"?: boolean,"house_rules"?: string | null,"housing_type"?: Database["public"]['Enums']["housing_type"],"id"?: string,"lease_permission"?: Database["public"]['Enums']["lease_permission"],"location_hint"?: string,"neighborhood"?: string,"owner_id"?: string,"published_at"?: string | null,"rent"?: number,"room_type"?: Database["public"]['Enums']["room_type"],"roommates"?: number,"search_text"?: never,"security_deposit"?: number | null,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string,"utilities_estimate"?: number | null,"utilities_included"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"display_name": string,"email": string,"email_verified": boolean,"grad_year": number | null,"id": string,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["account_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"email": string,"email_verified"?: boolean,"grad_year"?: number | null,"id": string,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"email"?: string,"email_verified"?: boolean,"grad_year"?: number | null,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"listing_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"listing_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"listing_id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "hook_restrict_signup_to_ucla":
{ Args: { "event": Json }; Returns: Json
                           },
"is_listing_owner":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"is_verified_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"listing_is_visible":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"path_is_listing_owner":
{ Args: { "p_folder": string }; Returns: boolean
                           },
"path_listing_is_visible":
{ Args: { "p_folder": string }; Returns: boolean
                           }
          }
          Enums: {
            "account_status": "active"|"suspended","housing_type": "apartment"|"house"|"townhouse"|"condo"|"other","inquiry_status": "sent"|"read"|"archived","lease_permission": "allowed"|"landlord_approved"|"pending","listing_status": "draft"|"published"|"unavailable"|"closed"|"hidden","report_reason": "scam"|"misleading"|"not_available"|"no_sublease_permission"|"inappropriate"|"other","report_status": "open"|"resolved"|"dismissed","room_type": "private"|"shared"|"entire","user_role": "student"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "suspended"],"housing_type": ["apartment", "house", "townhouse", "condo", "other"],"inquiry_status": ["sent", "read", "archived"],"lease_permission": ["allowed", "landlord_approved", "pending"],"listing_status": ["draft", "published", "unavailable", "closed", "hidden"],"report_reason": ["scam", "misleading", "not_available", "no_sublease_permission", "inappropriate", "other"],"report_status": ["open", "resolved", "dismissed"],"room_type": ["private", "shared", "entire"],"user_role": ["student", "admin"]
          }
        }
} as const
