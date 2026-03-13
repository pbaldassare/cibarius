export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      allergens: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
        }
        Relationships: []
      }
      appointments: {
        Row: {
          client_user_id: string
          created_at: string
          ends_at: string | null
          id: string
          notes: string | null
          professional_id: string
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          professional_id: string
          starts_at: string
          status?: string
          title?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          professional_id?: string
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_path: string
          id: string
          owner_user_id: string | null
          public_url: string | null
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_path: string
          id?: string
          owner_user_id?: string | null
          public_url?: string | null
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_path?: string
          id?: string
          owner_user_id?: string | null
          public_url?: string | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          chest_cm: number | null
          created_at: string
          hips_cm: number | null
          id: string
          measured_at: string
          notes: string | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      client_links: {
        Row: {
          activated_at: string | null
          client_user_id: string
          created_at: string
          id: string
          invite_code: string
          professional_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          client_user_id: string
          created_at?: string
          id?: string
          invite_code: string
          professional_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          client_user_id?: string
          created_at?: string
          id?: string
          invite_code?: string
          professional_id?: string
          status?: string
        }
        Relationships: []
      }
      custom_coupons: {
        Row: {
          applies_to_plan_id: string | null
          applies_to_role_type: string | null
          assigned_to_user_id: string | null
          code: string
          created_at: string
          created_by_admin_id: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to_plan_id?: string | null
          applies_to_role_type?: string | null
          assigned_to_user_id?: string | null
          code: string
          created_at?: string
          created_by_admin_id?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to_plan_id?: string | null
          applies_to_role_type?: string | null
          assigned_to_user_id?: string | null
          code?: string
          created_at?: string
          created_by_admin_id?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_coupons_applies_to_plan_id_fkey"
            columns: ["applies_to_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_progress: {
        Row: {
          carbs_actual: number | null
          carbs_target: number | null
          compliance_pct: number | null
          created_at: string | null
          day_date: string
          fats_actual: number | null
          fats_target: number | null
          id: string
          kcal_actual: number
          kcal_target: number
          meals_logged: Json | null
          notes: string | null
          plan_id: string | null
          protein_actual: number | null
          protein_target: number | null
          user_id: string
        }
        Insert: {
          carbs_actual?: number | null
          carbs_target?: number | null
          compliance_pct?: number | null
          created_at?: string | null
          day_date: string
          fats_actual?: number | null
          fats_target?: number | null
          id?: string
          kcal_actual?: number
          kcal_target?: number
          meals_logged?: Json | null
          notes?: string | null
          plan_id?: string | null
          protein_actual?: number | null
          protein_target?: number | null
          user_id: string
        }
        Update: {
          carbs_actual?: number | null
          carbs_target?: number | null
          compliance_pct?: number | null
          created_at?: string | null
          day_date?: string
          fats_actual?: number | null
          fats_target?: number | null
          id?: string
          kcal_actual?: number
          kcal_target?: number
          meals_logged?: Json | null
          notes?: string | null
          plan_id?: string | null
          protein_actual?: number | null
          protein_target?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_progress_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          diet_plan_id: string
          fats_g: number
          fiber_g: number | null
          food_name: string
          id: string
          meal_type: string
          notes: string | null
          protein_g: number
          quantity: number
          saturated_fats_g: number | null
          sort_order: number
          sugars_g: number
          unit: string
          unsaturated_fats_g: number | null
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          diet_plan_id: string
          fats_g?: number
          fiber_g?: number | null
          food_name: string
          id?: string
          meal_type: string
          notes?: string | null
          protein_g?: number
          quantity?: number
          saturated_fats_g?: number | null
          sort_order?: number
          sugars_g?: number
          unit?: string
          unsaturated_fats_g?: number | null
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          diet_plan_id?: string
          fats_g?: number
          fiber_g?: number | null
          food_name?: string
          id?: string
          meal_type?: string
          notes?: string | null
          protein_g?: number
          quantity?: number
          saturated_fats_g?: number | null
          sort_order?: number
          sugars_g?: number
          unit?: string
          unsaturated_fats_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_items_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_meal_targets: {
        Row: {
          carbs_g: number
          diet_plan_id: string
          fats_g: number
          fiber_g: number | null
          id: string
          kcal_target: number
          meal_type: string
          protein_g: number
          saturated_fats_g: number | null
          sugars_g: number
          unsaturated_fats_g: number | null
        }
        Insert: {
          carbs_g: number
          diet_plan_id: string
          fats_g: number
          fiber_g?: number | null
          id?: string
          kcal_target: number
          meal_type: string
          protein_g: number
          saturated_fats_g?: number | null
          sugars_g?: number
          unsaturated_fats_g?: number | null
        }
        Update: {
          carbs_g?: number
          diet_plan_id?: string
          fats_g?: number
          fiber_g?: number | null
          id?: string
          kcal_target?: number
          meal_type?: string
          protein_g?: number
          saturated_fats_g?: number | null
          sugars_g?: number
          unsaturated_fats_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_meal_targets_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_template_meals: {
        Row: {
          carbs_g: number
          fats_g: number
          fiber_g: number | null
          id: string
          kcal_target: number
          meal_type: string
          protein_g: number
          saturated_fats_g: number | null
          sugars_g: number
          template_id: string
          unsaturated_fats_g: number | null
        }
        Insert: {
          carbs_g: number
          fats_g: number
          fiber_g?: number | null
          id?: string
          kcal_target: number
          meal_type: string
          protein_g: number
          saturated_fats_g?: number | null
          sugars_g?: number
          template_id: string
          unsaturated_fats_g?: number | null
        }
        Update: {
          carbs_g?: number
          fats_g?: number
          fiber_g?: number | null
          id?: string
          kcal_target?: number
          meal_type?: string
          protein_g?: number
          saturated_fats_g?: number | null
          sugars_g?: number
          template_id?: string
          unsaturated_fats_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plan_template_meals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plan_templates: {
        Row: {
          carbs_g_day: number
          created_at: string
          fats_g_day: number
          fiber_g_day: number | null
          id: string
          kcal_day: number
          notes: string | null
          professional_id: string
          protein_g_day: number
          saturated_fats_g_day: number | null
          sugars_g_day: number | null
          title: string
          unsaturated_fats_g_day: number | null
          weekly_data: Json | null
        }
        Insert: {
          carbs_g_day: number
          created_at?: string
          fats_g_day: number
          fiber_g_day?: number | null
          id?: string
          kcal_day: number
          notes?: string | null
          professional_id: string
          protein_g_day: number
          saturated_fats_g_day?: number | null
          sugars_g_day?: number | null
          title?: string
          unsaturated_fats_g_day?: number | null
          weekly_data?: Json | null
        }
        Update: {
          carbs_g_day?: number
          created_at?: string
          fats_g_day?: number
          fiber_g_day?: number | null
          id?: string
          kcal_day?: number
          notes?: string | null
          professional_id?: string
          protein_g_day?: number
          saturated_fats_g_day?: number | null
          sugars_g_day?: number | null
          title?: string
          unsaturated_fats_g_day?: number | null
          weekly_data?: Json | null
        }
        Relationships: []
      }
      diet_plans: {
        Row: {
          carbs_g_day: number
          client_user_id: string
          created_at: string
          end_date: string | null
          fats_g_day: number
          fiber_g_day: number | null
          id: string
          is_active: boolean
          kcal_day: number
          notes: string | null
          professional_id: string
          protein_g_day: number
          saturated_fats_g_day: number | null
          start_date: string
          sugars_g_day: number | null
          title: string
          unsaturated_fats_g_day: number | null
        }
        Insert: {
          carbs_g_day: number
          client_user_id: string
          created_at?: string
          end_date?: string | null
          fats_g_day: number
          fiber_g_day?: number | null
          id?: string
          is_active?: boolean
          kcal_day: number
          notes?: string | null
          professional_id: string
          protein_g_day: number
          saturated_fats_g_day?: number | null
          start_date?: string
          sugars_g_day?: number | null
          title?: string
          unsaturated_fats_g_day?: number | null
        }
        Update: {
          carbs_g_day?: number
          client_user_id?: string
          created_at?: string
          end_date?: string | null
          fats_g_day?: number
          fiber_g_day?: number | null
          id?: string
          is_active?: boolean
          kcal_day?: number
          notes?: string | null
          professional_id?: string
          protein_g_day?: number
          saturated_fats_g_day?: number | null
          start_date?: string
          sugars_g_day?: number | null
          title?: string
          unsaturated_fats_g_day?: number | null
        }
        Relationships: []
      }
      dish_ingredients: {
        Row: {
          created_at: string | null
          dish_id: string
          grams_in_standard_portion: number
          id: string
          ingredient_id: string
        }
        Insert: {
          created_at?: string | null
          dish_id: string
          grams_in_standard_portion?: number
          id?: string
          ingredient_id: string
        }
        Update: {
          created_at?: string | null
          dish_id?: string
          grams_in_standard_portion?: number
          id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredients_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "food_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          canonical_name: string | null
          created_at: string | null
          id: string
          name: string
          photo_example_url: string | null
        }
        Insert: {
          canonical_name?: string | null
          created_at?: string | null
          id?: string
          name: string
          photo_example_url?: string | null
        }
        Update: {
          canonical_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
          photo_example_url?: string | null
        }
        Relationships: []
      }
      email_notifications_log: {
        Row: {
          email_type: string
          id: string
          metadata: Json | null
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          email_type: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          receive_expiry_alerts: boolean
          receive_password_reset: boolean
          receive_verification: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          receive_expiry_alerts?: boolean
          receive_password_reset?: boolean
          receive_verification?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          receive_expiry_alerts?: boolean
          receive_password_reset?: boolean
          receive_verification?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_meal_items: {
        Row: {
          carbs_g: number | null
          fats_g: number | null
          favorite_meal_id: string
          grams: number
          id: string
          ingredient_id: string | null
          ingredient_name: string
          kcal: number | null
          protein_g: number | null
        }
        Insert: {
          carbs_g?: number | null
          fats_g?: number | null
          favorite_meal_id: string
          grams?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          kcal?: number | null
          protein_g?: number | null
        }
        Update: {
          carbs_g?: number | null
          fats_g?: number | null
          favorite_meal_id?: string
          grams?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          kcal?: number | null
          protein_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_meal_items_favorite_meal_id_fkey"
            columns: ["favorite_meal_id"]
            isOneToOne: false
            referencedRelation: "user_favorite_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      food_templates: {
        Row: {
          calories_100g: number
          carbs_100g: number
          category: string | null
          created_at: string | null
          default_unit: string | null
          external_ref: string | null
          fats_100g: number
          id: string
          keywords: string[] | null
          name: string
          protein_100g: number
          source: string | null
          sugars_100g: number
        }
        Insert: {
          calories_100g: number
          carbs_100g?: number
          category?: string | null
          created_at?: string | null
          default_unit?: string | null
          external_ref?: string | null
          fats_100g?: number
          id?: string
          keywords?: string[] | null
          name: string
          protein_100g?: number
          source?: string | null
          sugars_100g?: number
        }
        Update: {
          calories_100g?: number
          carbs_100g?: number
          category?: string | null
          created_at?: string | null
          default_unit?: string | null
          external_ref?: string | null
          fats_100g?: number
          id?: string
          keywords?: string[] | null
          name?: string
          protein_100g?: number
          source?: string | null
          sugars_100g?: number
        }
        Relationships: []
      }
      generated_recipes: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          ingredients: Json
          instructions: string | null
          kcal_total: number | null
          macros: Json | null
          meal_type: string | null
          professional_id: string
          title: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          ingredients?: Json
          instructions?: string | null
          kcal_total?: number | null
          macros?: Json | null
          meal_type?: string | null
          professional_id: string
          title: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          ingredients?: Json
          instructions?: string | null
          kcal_total?: number | null
          macros?: Json | null
          meal_type?: string | null
          professional_id?: string
          title?: string
        }
        Relationships: []
      }
      haccp_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          record_id: string
          table_name?: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      haccp_equipment: {
        Row: {
          count: number
          equipment_type: string
          id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          equipment_type: string
          id?: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          equipment_type?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_equipment_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_logs: {
        Row: {
          area: string | null
          cancelled_reason: string | null
          completed_at: string
          completed_by: string
          completed_by_name: string | null
          created_at: string
          frequency: string | null
          id: string
          is_rectification: boolean
          log_date: string
          notes: string | null
          original_log_id: string | null
          restaurant_id: string
          status: string
          task_id: string
          task_name: string | null
        }
        Insert: {
          area?: string | null
          cancelled_reason?: string | null
          completed_at?: string
          completed_by: string
          completed_by_name?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_rectification?: boolean
          log_date?: string
          notes?: string | null
          original_log_id?: string | null
          restaurant_id: string
          status?: string
          task_id: string
          task_name?: string | null
        }
        Update: {
          area?: string | null
          cancelled_reason?: string | null
          completed_at?: string
          completed_by?: string
          completed_by_name?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_rectification?: boolean
          log_date?: string
          notes?: string | null
          original_log_id?: string | null
          restaurant_id?: string
          status?: string
          task_id?: string
          task_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haccp_logs_original_log_id_fkey"
            columns: ["original_log_id"]
            isOneToOne: false
            referencedRelation: "haccp_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "haccp_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_task_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          restaurant_id: string
          task_log_id: string
          uploaded_by_name: string | null
          uploaded_by_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          restaurant_id: string
          task_log_id: string
          uploaded_by_name?: string | null
          uploaded_by_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          restaurant_id?: string
          task_log_id?: string
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_task_photos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_task_photos_task_log_id_fkey"
            columns: ["task_log_id"]
            isOneToOne: false
            referencedRelation: "haccp_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_tasks: {
        Row: {
          category: string
          created_at: string
          custom_interval_days: number | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          custom_interval_days?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          custom_interval_days?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_temperature_logs: {
        Row: {
          equipment_name: string
          equipment_type: string
          id: string
          note: string | null
          recorded_at: string
          recorded_by_name: string | null
          recorded_by_user_id: string
          restaurant_id: string
          task_log_id: string
          temperature_value: number
        }
        Insert: {
          equipment_name: string
          equipment_type: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by_name?: string | null
          recorded_by_user_id: string
          restaurant_id: string
          task_log_id: string
          temperature_value: number
        }
        Update: {
          equipment_name?: string
          equipment_type?: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by_name?: string | null
          recorded_by_user_id?: string
          restaurant_id?: string
          task_log_id?: string
          temperature_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "haccp_temperature_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_temperature_logs_task_log_id_fkey"
            columns: ["task_log_id"]
            isOneToOne: false
            referencedRelation: "haccp_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_template_tasks: {
        Row: {
          category: string
          created_at: string
          default_area_type: string | null
          frequency_type: string
          id: string
          is_required: boolean
          sort_order: number
          task_name: string
          template_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_area_type?: string | null
          frequency_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          task_name: string
          template_id: string
        }
        Update: {
          category?: string
          created_at?: string
          default_area_type?: string | null
          frequency_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          task_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "haccp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_templates: {
        Row: {
          business_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          business_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          business_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      ingredient_categories: {
        Row: {
          category: string
          id: string
          ingredient_name: string
          subcategory: string | null
        }
        Insert: {
          category: string
          id?: string
          ingredient_name: string
          subcategory?: string | null
        }
        Update: {
          category?: string
          id?: string
          ingredient_name?: string
          subcategory?: string | null
        }
        Relationships: []
      }
      ingredient_compatibility_matrix: {
        Row: {
          category_a: string
          category_b: string
          id: string
          is_compatible: boolean
        }
        Insert: {
          category_a: string
          category_b: string
          id?: string
          is_compatible?: boolean
        }
        Update: {
          category_a?: string
          category_b?: string
          id?: string
          is_compatible?: boolean
        }
        Relationships: []
      }
      ingredient_translation: {
        Row: {
          id: string
          name_en: string
          name_it: string
        }
        Insert: {
          id?: string
          name_en: string
          name_it: string
        }
        Update: {
          id?: string
          name_en?: string
          name_it?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          carbs_per_100g: number
          category: string | null
          created_at: string | null
          fat_per_100g: number
          id: string
          kcal_per_100g: number
          name: string
          name_en: string | null
          protein_per_100g: number
          source: string | null
          usda_fdc_id: string | null
        }
        Insert: {
          carbs_per_100g?: number
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          kcal_per_100g?: number
          name: string
          name_en?: string | null
          protein_per_100g?: number
          source?: string | null
          usda_fdc_id?: string | null
        }
        Update: {
          carbs_per_100g?: number
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number
          id?: string
          kcal_per_100g?: number
          name?: string
          name_en?: string | null
          protein_per_100g?: number
          source?: string | null
          usda_fdc_id?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          calories_total: number | null
          chef_life_hours: number | null
          created_at: string
          expiry_date: string | null
          id: string
          lot_number: string | null
          macros_total: Json | null
          notes: string | null
          owner_user_id: string | null
          product_id: string
          production_date: string | null
          quantity: number | null
          restaurant_id: string | null
          storage_type: string
          unit: string | null
        }
        Insert: {
          calories_total?: number | null
          chef_life_hours?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          macros_total?: Json | null
          notes?: string | null
          owner_user_id?: string | null
          product_id: string
          production_date?: string | null
          quantity?: number | null
          restaurant_id?: string | null
          storage_type?: string
          unit?: string | null
        }
        Update: {
          calories_total?: number | null
          chef_life_hours?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          macros_total?: Json | null
          notes?: string | null
          owner_user_id?: string | null
          product_id?: string
          production_date?: string | null
          quantity?: number | null
          restaurant_id?: string | null
          storage_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_subscription_overrides: {
        Row: {
          created_at: string
          end_date: string | null
          granted_by_admin_id: string | null
          id: string
          override_type: string
          reason: string | null
          role_type: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          granted_by_admin_id?: string | null
          id?: string
          override_type?: string
          reason?: string | null
          role_type: string
          start_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          granted_by_admin_id?: string | null
          id?: string
          override_type?: string
          reason?: string | null
          role_type?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_days: {
        Row: {
          created_at: string
          day_date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          calories: number | null
          created_at: string
          custom_name: string | null
          dish_name: string | null
          id: string
          inventory_item_id: string | null
          macros: Json | null
          meal_id: string
          photo_url: string | null
          product_id: string | null
          quantity: number | null
          source_type: string
          unit: string | null
        }
        Insert: {
          calories?: number | null
          created_at?: string
          custom_name?: string | null
          dish_name?: string | null
          id?: string
          inventory_item_id?: string | null
          macros?: Json | null
          meal_id: string
          photo_url?: string | null
          product_id?: string | null
          quantity?: number | null
          source_type: string
          unit?: string | null
        }
        Update: {
          calories?: number | null
          created_at?: string
          custom_name?: string | null
          dish_name?: string | null
          id?: string
          inventory_item_id?: string | null
          macros?: Json | null
          meal_id?: string
          photo_url?: string | null
          product_id?: string | null
          quantity?: number | null
          source_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log_ingredients: {
        Row: {
          carbs_g: number | null
          created_at: string | null
          fat_g: number | null
          grams: number
          id: string
          ingredient_id: string | null
          ingredient_name: string | null
          kcal: number | null
          meal_log_id: string
          protein_g: number | null
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          grams?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string | null
          kcal?: number | null
          meal_log_id: string
          protein_g?: number | null
        }
        Update: {
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          grams?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string | null
          kcal?: number | null
          meal_log_id?: string
          protein_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_ingredients_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          carbs_g: number | null
          created_at: string | null
          dish_name: string | null
          fat_g: number | null
          id: string
          kcal: number | null
          meal_type: string
          photo_url: string | null
          portion_g: number | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string | null
          dish_name?: string | null
          fat_g?: number | null
          id?: string
          kcal?: number | null
          meal_type: string
          photo_url?: string | null
          portion_g?: number | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string | null
          dish_name?: string | null
          fat_g?: number | null
          id?: string
          kcal?: number | null
          meal_type?: string
          photo_url?: string | null
          portion_g?: number | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meal_reminder_settings: {
        Row: {
          cena_enabled: boolean
          cena_time: string
          colazione_enabled: boolean
          colazione_time: string
          enabled: boolean
          pranzo_enabled: boolean
          pranzo_time: string
          push_subscription: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cena_enabled?: boolean
          cena_time?: string
          colazione_enabled?: boolean
          colazione_time?: string
          enabled?: boolean
          pranzo_enabled?: boolean
          pranzo_time?: string
          push_subscription?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cena_enabled?: boolean
          cena_time?: string
          colazione_enabled?: boolean
          colazione_time?: string
          enabled?: boolean
          pranzo_enabled?: boolean
          pranzo_time?: string
          push_subscription?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          id: string
          meal_day_id: string
          meal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_day_id: string
          meal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_day_id?: string
          meal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_meal_day_id_fkey"
            columns: ["meal_day_id"]
            isOneToOne: false
            referencedRelation: "meal_days"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      nutrition_plan_days: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          notes: string | null
          week_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          notes?: string | null
          week_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          notes?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plan_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plan_meals: {
        Row: {
          created_at: string
          day_id: string
          id: string
          meal_text: string
          meal_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          meal_text?: string
          meal_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          meal_text?: string
          meal_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plan_meals_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plan_weeks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          plan_id: string
          week_number: number
          week_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          plan_id: string
          week_number: number
          week_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          plan_id?: string
          week_number?: number
          week_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plan_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          client_user_id: string
          created_at: string
          end_date: string | null
          fat_target: number | null
          id: string
          is_active: boolean
          notes_general: string | null
          nutritionist_user_id: string
          plan_mode: string
          protein_target: number | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          client_user_id: string
          created_at?: string
          end_date?: string | null
          fat_target?: number | null
          id?: string
          is_active?: boolean
          notes_general?: string | null
          nutritionist_user_id: string
          plan_mode?: string
          protein_target?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          client_user_id?: string
          created_at?: string
          end_date?: string | null
          fat_target?: number | null
          id?: string
          is_active?: boolean
          notes_general?: string | null
          nutritionist_user_id?: string
          plan_mode?: string
          protein_target?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          carbs_g: number | null
          fats_g: number | null
          fiber_g: number | null
          kcal_day: number
          protein_g: number | null
          saturated_fats_g: number | null
          sugars_g: number | null
          unsaturated_fats_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          fats_g?: number | null
          fiber_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          saturated_fats_g?: number | null
          sugars_g?: number | null
          unsaturated_fats_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          fats_g?: number | null
          fiber_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          saturated_fats_g?: number | null
          sugars_g?: number | null
          unsaturated_fats_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutritionist_commissions: {
        Row: {
          client_user_id: string
          commission_amount: number
          commission_percent: number
          coupon_id: string | null
          created_at: string
          final_paid_amount: number
          id: string
          nutritionist_user_id: string
          original_amount: number
          paid_at: string | null
          payment_id: string | null
          status: string
        }
        Insert: {
          client_user_id: string
          commission_amount: number
          commission_percent: number
          coupon_id?: string | null
          created_at?: string
          final_paid_amount: number
          id?: string
          nutritionist_user_id: string
          original_amount: number
          paid_at?: string | null
          payment_id?: string | null
          status?: string
        }
        Update: {
          client_user_id?: string
          commission_amount?: number
          commission_percent?: number
          coupon_id?: string | null
          created_at?: string
          final_paid_amount?: number
          id?: string
          nutritionist_user_id?: string
          original_amount?: number
          paid_at?: string | null
          payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutritionist_commissions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "nutritionist_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutritionist_commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      nutritionist_coupons: {
        Row: {
          client_discount_percent: number
          coupon_code: string
          created_at: string
          current_uses: number
          id: string
          is_active: boolean
          max_uses: number | null
          nutritionist_commission_percent: number
          nutritionist_user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          client_discount_percent?: number
          coupon_code: string
          created_at?: string
          current_uses?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          nutritionist_commission_percent?: number
          nutritionist_user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          client_discount_percent?: number
          coupon_code?: string
          created_at?: string
          current_uses?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          nutritionist_commission_percent?: number
          nutritionist_user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      preparation_allergens: {
        Row: {
          allergen_id: string
          id: string
          preparation_id: string
        }
        Insert: {
          allergen_id: string
          id?: string
          preparation_id: string
        }
        Update: {
          allergen_id?: string
          id?: string
          preparation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_allergens_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_ingredients: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          preparation_id: string
          product_id: string | null
          quantity: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          preparation_id: string
          product_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          preparation_id?: string
          product_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preparation_ingredients_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      preparations: {
        Row: {
          chef_life_hours: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          label_code: string | null
          lot_number: string | null
          name: string
          notes: string | null
          owner_user_id: string | null
          portions: number | null
          prepared_at: string
          production_date: string | null
          restaurant_id: string | null
          storage_type: string
          use_by_date: string
        }
        Insert: {
          chef_life_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label_code?: string | null
          lot_number?: string | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          portions?: number | null
          prepared_at?: string
          production_date?: string | null
          restaurant_id?: string | null
          storage_type?: string
          use_by_date: string
        }
        Update: {
          chef_life_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label_code?: string | null
          lot_number?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          portions?: number | null
          prepared_at?: string
          production_date?: string | null
          restaurant_id?: string | null
          storage_type?: string
          use_by_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_suggestions: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          payload: Json | null
          professional_id: string
          seen_at: string | null
          type: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          professional_id: string
          seen_at?: string | null
          type: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          professional_id?: string
          seen_at?: string | null
          type?: string
        }
        Relationships: []
      }
      product_submissions: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_100g: number | null
          created_at: string
          id: string
          image_url: string | null
          macros_100g: Json | null
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          serving_size_g: number | null
          status: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_100g?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          macros_100g?: Json | null
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serving_size_g?: number | null
          status?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_100g?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          macros_100g?: Json | null
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serving_size_g?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_100g: number | null
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          macros_100g: Json | null
          name: string
          serving_size_g: number | null
          template_id: string | null
          unit: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_100g?: number | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          macros_100g?: Json | null
          name: string
          serving_size_g?: number | null
          template_id?: string | null
          unit?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_100g?: number | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          macros_100g?: Json | null
          name?: string
          serving_size_g?: number | null
          template_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "food_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_invites: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          professional_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          professional_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          professional_id?: string
          status?: string
        }
        Relationships: []
      }
      professional_notes: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          note: string
          professional_id: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          note: string
          professional_id: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          note?: string
          professional_id?: string
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          additional_roles: string[] | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          experience_years: number | null
          facebook: string | null
          id: string
          instagram: string | null
          is_visible: boolean | null
          linkedin: string | null
          photo_url: string | null
          public_slug: string | null
          specialization: string
          user_id: string
          website: string | null
          workplace: string | null
          works_in_person: boolean | null
          works_online: boolean | null
        }
        Insert: {
          additional_roles?: string[] | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          experience_years?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_visible?: boolean | null
          linkedin?: string | null
          photo_url?: string | null
          public_slug?: string | null
          specialization?: string
          user_id: string
          website?: string | null
          workplace?: string | null
          works_in_person?: boolean | null
          works_online?: boolean | null
        }
        Update: {
          additional_roles?: string[] | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          experience_years?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_visible?: boolean | null
          linkedin?: string | null
          photo_url?: string | null
          public_slug?: string | null
          specialization?: string
          user_id?: string
          website?: string | null
          workplace?: string | null
          works_in_person?: boolean | null
          works_online?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          ref_coupon_code: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          ref_coupon_code?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          ref_coupon_code?: string | null
          role?: string
        }
        Relationships: []
      }
      quick_day_logs: {
        Row: {
          created_at: string
          day_date: string
          day_type: string
          estimated_carbs: number | null
          estimated_fats: number | null
          estimated_kcal: number
          estimated_protein: number | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_date?: string
          day_type: string
          estimated_carbs?: number | null
          estimated_fats?: number | null
          estimated_kcal?: number
          estimated_protein?: number | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_date?: string
          day_type?: string
          estimated_carbs?: number | null
          estimated_fats?: number | null
          estimated_kcal?: number
          estimated_protein?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_allergens: {
        Row: {
          allergen_id: string
          id: string
          recipe_id: string
        }
        Insert: {
          allergen_id: string
          id?: string
          recipe_id: string
        }
        Update: {
          allergen_id?: string
          id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_allergens_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string | null
          cook_time_minutes: number | null
          created_at: string
          difficulty: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_public: boolean | null
          prep_time_minutes: number | null
          restaurant_id: string
          servings: number | null
          title: string
        }
        Insert: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_public?: boolean | null
          prep_time_minutes?: number | null
          restaurant_id: string
          servings?: number | null
          title: string
        }
        Update: {
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_public?: boolean | null
          prep_time_minutes?: number | null
          restaurant_id?: string
          servings?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_documents: {
        Row: {
          created_at: string
          doc_date: string | null
          doc_type: string
          extracted_data: Json | null
          file_path: string
          id: string
          public_url: string | null
          restaurant_id: string
          supplier_name: string | null
        }
        Insert: {
          created_at?: string
          doc_date?: string | null
          doc_type?: string
          extracted_data?: Json | null
          file_path: string
          id?: string
          public_url?: string | null
          restaurant_id: string
          supplier_name?: string | null
        }
        Update: {
          created_at?: string
          doc_date?: string | null
          doc_type?: string
          extracted_data?: Json | null
          file_path?: string
          id?: string
          public_url?: string | null
          restaurant_id?: string
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_documents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          id: string
          member_role: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_role?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_role?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          facebook: string | null
          haccp_template_id: string | null
          id: string
          image_url: string | null
          instagram: string | null
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          facebook?: string | null
          haccp_template_id?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          phone: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          facebook?: string | null
          haccp_template_id?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_haccp_template_id_fkey"
            columns: ["haccp_template_id"]
            isOneToOne: false
            referencedRelation: "haccp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_settings: {
        Row: {
          environment: string
          id: string
          is_active: boolean
          publishable_key_masked: string | null
          secret_key_masked: string | null
          updated_at: string
          updated_by_admin_id: string | null
          webhook_secret_masked: string | null
        }
        Insert: {
          environment?: string
          id?: string
          is_active?: boolean
          publishable_key_masked?: string | null
          secret_key_masked?: string | null
          updated_at?: string
          updated_by_admin_id?: string | null
          webhook_secret_masked?: string | null
        }
        Update: {
          environment?: string
          id?: string
          is_active?: boolean
          publishable_key_masked?: string | null
          secret_key_masked?: string | null
          updated_at?: string
          updated_by_admin_id?: string | null
          webhook_secret_masked?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          discount_amount: number
          discount_percent: number
          final_amount: number
          id: string
          original_amount: number
          payment_status: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          final_amount: number
          id?: string
          original_amount: number
          payment_status?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          final_amount?: number
          id?: string
          original_amount?: number
          payment_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "nutritionist_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          local_price: number
          monthly_price: number | null
          name: string | null
          plan_name: string
          role_type: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          local_price?: number
          monthly_price?: number | null
          name?: string | null
          plan_name: string
          role_type: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
        }
        Update: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          local_price?: number
          monthly_price?: number | null
          name?: string | null
          plan_name?: string
          role_type?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          free_override_reason: string | null
          granted_by_admin_id: string | null
          id: string
          is_free_override: boolean
          next_billing_date: string | null
          plan_id: string | null
          plan_type: string
          start_date: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_override_reason?: string | null
          granted_by_admin_id?: string | null
          id?: string
          is_free_override?: boolean
          next_billing_date?: string | null
          plan_id?: string | null
          plan_type: string
          start_date?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_override_reason?: string | null
          granted_by_admin_id?: string | null
          id?: string
          is_free_override?: boolean
          next_billing_date?: string | null
          plan_id?: string | null
          plan_type?: string
          start_date?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invites: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invites_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string | null
          supplier_id: string | null
          total: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id?: string | null
          supplier_id?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string | null
          supplier_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          availability: string | null
          currency: string | null
          id: string
          price: number
          product_id: string
          supplier_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          currency?: string | null
          id?: string
          price: number
          product_id: string
          supplier_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          currency?: string | null
          id?: string
          price?: number
          product_id?: string
          supplier_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_restaurants: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          restaurant_id: string
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          restaurant_id: string
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          restaurant_id?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_restaurants_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_user_id: string
          phone: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_user_id: string
          phone?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          phone?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_recipes: {
        Row: {
          carbs_total: number
          created_at: string | null
          diet_category: string
          fats_total: number
          id: string
          ingredients: Json
          instructions: string | null
          kcal_total: number
          meal_type: string
          portion_scale_female: number | null
          prep_time_min: number | null
          protein_total: number
          title: string
        }
        Insert: {
          carbs_total?: number
          created_at?: string | null
          diet_category: string
          fats_total?: number
          id?: string
          ingredients?: Json
          instructions?: string | null
          kcal_total?: number
          meal_type: string
          portion_scale_female?: number | null
          prep_time_min?: number | null
          protein_total?: number
          title: string
        }
        Update: {
          carbs_total?: number
          created_at?: string | null
          diet_category?: string
          fats_total?: number
          id?: string
          ingredients?: Json
          instructions?: string | null
          kcal_total?: number
          meal_type?: string
          portion_scale_female?: number | null
          prep_time_min?: number | null
          protein_total?: number
          title?: string
        }
        Relationships: []
      }
      user_favorite_meals: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_snapshot: Json | null
          item_type: string
          meal_types: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_snapshot?: Json | null
          item_type: string
          meal_types?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_snapshot?: Json | null
          item_type?: string
          meal_types?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_nutritionist_links: {
        Row: {
          client_user_id: string
          coupon_id: string | null
          id: string
          is_active: boolean
          link_source: string
          linked_at: string
          nutritionist_user_id: string
        }
        Insert: {
          client_user_id: string
          coupon_id?: string | null
          id?: string
          is_active?: boolean
          link_source?: string
          linked_at?: string
          nutritionist_user_id: string
        }
        Update: {
          client_user_id?: string
          coupon_id?: string | null
          id?: string
          is_active?: boolean
          link_source?: string
          linked_at?: string
          nutritionist_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutritionist_links_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "nutritionist_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_savings: {
        Row: {
          estimated_price: number | null
          id: string
          item_name: string
          saved_at: string
          source: string
          user_id: string
          weight_g: number | null
        }
        Insert: {
          estimated_price?: number | null
          id?: string
          item_name: string
          saved_at?: string
          source?: string
          user_id: string
          weight_g?: number | null
        }
        Update: {
          estimated_price?: number | null
          id?: string
          item_name?: string
          saved_at?: string
          source?: string
          user_id?: string
          weight_g?: number | null
        }
        Relationships: []
      }
      weight_goals: {
        Row: {
          created_at: string
          current_weight_kg: number | null
          height_cm: number | null
          id: string
          started_at: string | null
          starting_weight_kg: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_weight_kg?: number | null
          height_cm?: number | null
          id?: string
          started_at?: string | null
          starting_weight_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_weight_kg?: number | null
          height_cm?: number | null
          id?: string
          started_at?: string | null
          starting_weight_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_admin: { Args: never; Returns: boolean }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_active_client_link: {
        Args: { _client_id: string; _pro_id: string }
        Returns: boolean
      }
      has_active_pro_link: {
        Args: { _client_id: string; _pro_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_restaurant_accessible: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
      owns_meal: { Args: { _meal_id: string }; Returns: boolean }
      owns_meal_day: { Args: { _meal_day_id: string }; Returns: boolean }
      owns_np_day: { Args: { _day_id: string }; Returns: boolean }
      owns_np_week: { Args: { _week_id: string }; Returns: boolean }
      owns_nutrition_plan: { Args: { _plan_id: string }; Returns: boolean }
      owns_recipe_restaurant: { Args: { _recipe_id: string }; Returns: boolean }
      owns_supplier: { Args: { _supplier_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
