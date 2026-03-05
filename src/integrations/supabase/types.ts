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
      diet_plan_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          diet_plan_id: string
          fats_g: number
          food_name: string
          id: string
          meal_type: string
          notes: string | null
          protein_g: number
          quantity: number
          sort_order: number
          sugars_g: number
          unit: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          diet_plan_id: string
          fats_g?: number
          food_name: string
          id?: string
          meal_type: string
          notes?: string | null
          protein_g?: number
          quantity?: number
          sort_order?: number
          sugars_g?: number
          unit?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          diet_plan_id?: string
          fats_g?: number
          food_name?: string
          id?: string
          meal_type?: string
          notes?: string | null
          protein_g?: number
          quantity?: number
          sort_order?: number
          sugars_g?: number
          unit?: string
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
          id: string
          kcal_target: number
          meal_type: string
          protein_g: number
          sugars_g: number
        }
        Insert: {
          carbs_g: number
          diet_plan_id: string
          fats_g: number
          id?: string
          kcal_target: number
          meal_type: string
          protein_g: number
          sugars_g?: number
        }
        Update: {
          carbs_g?: number
          diet_plan_id?: string
          fats_g?: number
          id?: string
          kcal_target?: number
          meal_type?: string
          protein_g?: number
          sugars_g?: number
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
          id: string
          kcal_target: number
          meal_type: string
          protein_g: number
          sugars_g: number
          template_id: string
        }
        Insert: {
          carbs_g: number
          fats_g: number
          id?: string
          kcal_target: number
          meal_type: string
          protein_g: number
          sugars_g?: number
          template_id: string
        }
        Update: {
          carbs_g?: number
          fats_g?: number
          id?: string
          kcal_target?: number
          meal_type?: string
          protein_g?: number
          sugars_g?: number
          template_id?: string
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
          id: string
          kcal_day: number
          notes: string | null
          professional_id: string
          protein_g_day: number
          title: string
        }
        Insert: {
          carbs_g_day: number
          created_at?: string
          fats_g_day: number
          id?: string
          kcal_day: number
          notes?: string | null
          professional_id: string
          protein_g_day: number
          title?: string
        }
        Update: {
          carbs_g_day?: number
          created_at?: string
          fats_g_day?: number
          id?: string
          kcal_day?: number
          notes?: string | null
          professional_id?: string
          protein_g_day?: number
          title?: string
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
          id: string
          is_active: boolean
          kcal_day: number
          notes: string | null
          professional_id: string
          protein_g_day: number
          start_date: string
          title: string
        }
        Insert: {
          carbs_g_day: number
          client_user_id: string
          created_at?: string
          end_date?: string | null
          fats_g_day: number
          id?: string
          is_active?: boolean
          kcal_day: number
          notes?: string | null
          professional_id: string
          protein_g_day: number
          start_date?: string
          title?: string
        }
        Update: {
          carbs_g_day?: number
          client_user_id?: string
          created_at?: string
          end_date?: string | null
          fats_g_day?: number
          id?: string
          is_active?: boolean
          kcal_day?: number
          notes?: string | null
          professional_id?: string
          protein_g_day?: number
          start_date?: string
          title?: string
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
      inventory_items: {
        Row: {
          calories_total: number | null
          created_at: string
          expiry_date: string | null
          id: string
          macros_total: Json | null
          notes: string | null
          owner_user_id: string | null
          product_id: string
          quantity: number | null
          restaurant_id: string | null
          storage_type: string
          unit: string | null
        }
        Insert: {
          calories_total?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          macros_total?: Json | null
          notes?: string | null
          owner_user_id?: string | null
          product_id: string
          quantity?: number | null
          restaurant_id?: string | null
          storage_type?: string
          unit?: string | null
        }
        Update: {
          calories_total?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          macros_total?: Json | null
          notes?: string | null
          owner_user_id?: string | null
          product_id?: string
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
      nutrition_targets: {
        Row: {
          carbs_g: number | null
          fats_g: number | null
          kcal_day: number
          protein_g: number | null
          sugars_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          fats_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          sugars_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          fats_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          sugars_g?: number | null
          updated_at?: string
          user_id?: string
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
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          label_code: string | null
          name: string
          notes: string | null
          owner_user_id: string | null
          portions: number | null
          prepared_at: string
          restaurant_id: string | null
          storage_type: string
          use_by_date: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label_code?: string | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          portions?: number | null
          prepared_at?: string
          restaurant_id?: string | null
          storage_type?: string
          use_by_date: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label_code?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          portions?: number | null
          prepared_at?: string
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
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
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
          id: string
          name: string
          owner_id: string
          phone: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_admin: { Args: never; Returns: boolean }
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
