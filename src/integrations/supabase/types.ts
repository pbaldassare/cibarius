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
          id: string
          inventory_item_id: string | null
          macros: Json | null
          meal_id: string
          product_id: string | null
          quantity: number | null
          source_type: string
          unit: string | null
        }
        Insert: {
          calories?: number | null
          created_at?: string
          custom_name?: string | null
          id?: string
          inventory_item_id?: string | null
          macros?: Json | null
          meal_id: string
          product_id?: string | null
          quantity?: number | null
          source_type: string
          unit?: string | null
        }
        Update: {
          calories?: number | null
          created_at?: string
          custom_name?: string | null
          id?: string
          inventory_item_id?: string | null
          macros?: Json | null
          meal_id?: string
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
      nutrition_targets: {
        Row: {
          carbs_g: number | null
          fats_g: number | null
          kcal_day: number
          protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          fats_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          fats_g?: number | null
          kcal_day?: number
          protein_g?: number | null
          updated_at?: string
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
          unit?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
