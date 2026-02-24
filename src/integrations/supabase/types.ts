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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string | null
          id: string
          priority: number
          title: string
          type: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: number
          title: string
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: number
          title?: string
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          filename: string
          id: string
          type: Database["public"]["Enums"]["attachment_type"]
          uploaded_at: string
          uploaded_by: string
          url: string
        }
        Insert: {
          filename: string
          id?: string
          type: Database["public"]["Enums"]["attachment_type"]
          uploaded_at?: string
          uploaded_by: string
          url: string
        }
        Update: {
          filename?: string
          id?: string
          type?: Database["public"]["Enums"]["attachment_type"]
          uploaded_at?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_auth_accounts: {
        Row: {
          auth_user_id: string | null
          client_id: string
          created_at: string
          id: string
          last_login_at: string | null
          must_change_password: boolean | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_auth_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_email_consents: {
        Row: {
          client_id: string
          confirmation_ip: string | null
          confirmation_token: string | null
          confirmation_url: string | null
          confirmation_user_agent: string | null
          confirmed_at: string | null
          contract_id: string | null
          created_at: string | null
          delivered_at: string | null
          email_address: string
          id: string
          message_html: string
          message_subject: string
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          client_id: string
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_address: string
          id?: string
          message_html: string
          message_subject: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_address?: string
          id?: string
          message_html?: string
          message_subject?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_email_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_email_consents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ownership_transfers: {
        Row: {
          client_id: string
          from_user_id: string
          id: string
          notes: string | null
          to_user_id: string
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          client_id: string
          from_user_id: string
          id?: string
          notes?: string | null
          to_user_id: string
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          client_id?: string
          from_user_id?: string
          id?: string
          notes?: string | null
          to_user_id?: string
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ownership_transfers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ownership_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ownership_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ownership_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_referrals: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          id: string
          referred_address: string
          referred_city: string | null
          referred_email: string
          referred_first_name: string
          referred_last_name: string
          referred_notes: string | null
          referred_phone: string
          referred_province: string | null
          referred_zip_code: string | null
          referrer_client_id: string
          referrer_contract_id: string
          resulting_contract_id: string | null
          status: Database["public"]["Enums"]["referral_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string
          voucher_amount: number
          voucher_code: string | null
          voucher_redeemed_at: string | null
          voucher_sent_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          referred_address: string
          referred_city?: string | null
          referred_email: string
          referred_first_name: string
          referred_last_name: string
          referred_notes?: string | null
          referred_phone: string
          referred_province?: string | null
          referred_zip_code?: string | null
          referrer_client_id: string
          referrer_contract_id: string
          resulting_contract_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_code?: string | null
          voucher_redeemed_at?: string | null
          voucher_sent_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          referred_address?: string
          referred_city?: string | null
          referred_email?: string
          referred_first_name?: string
          referred_last_name?: string
          referred_notes?: string | null
          referred_phone?: string
          referred_province?: string | null
          referred_zip_code?: string | null
          referrer_client_id?: string
          referrer_contract_id?: string
          resulting_contract_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_code?: string | null
          voucher_redeemed_at?: string | null
          voucher_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_referrals_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_referrer_contract_id_fkey"
            columns: ["referrer_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_resulting_contract_id_fkey"
            columns: ["resulting_contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sms_consents: {
        Row: {
          client_id: string
          confirmation_ip: string | null
          confirmation_token: string | null
          confirmation_url: string | null
          confirmation_user_agent: string | null
          confirmed_at: string | null
          contract_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          infobip_message_id: string | null
          message_text: string
          phone_number: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["sms_status"] | null
        }
        Insert: {
          client_id: string
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          infobip_message_id?: string | null
          message_text: string
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
        }
        Update: {
          client_id?: string
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          infobip_message_id?: string | null
          message_text?: string
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sms_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sms_consents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_supply_addresses: {
        Row: {
          address: string
          city: string
          client_id: string
          created_at: string | null
          current_operator: string | null
          id: string
          is_primary: boolean | null
          meter_number: string | null
          pdr_code: string | null
          pod_code: string | null
          province: string
          supply_type: Database["public"]["Enums"]["supply_type"] | null
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          client_id: string
          created_at?: string | null
          current_operator?: string | null
          id?: string
          is_primary?: boolean | null
          meter_number?: string | null
          pdr_code?: string | null
          pod_code?: string | null
          province: string
          supply_type?: Database["public"]["Enums"]["supply_type"] | null
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          client_id?: string
          created_at?: string | null
          current_operator?: string | null
          id?: string
          is_primary?: boolean | null
          meter_number?: string | null
          pdr_code?: string | null
          pod_code?: string | null
          province?: string
          supply_type?: Database["public"]["Enums"]["supply_type"] | null
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_supply_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_type: Database["public"]["Enums"]["client_type"]
          company_id: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string
          fiscal_code: string
          fiscal_code_normalized: string | null
          id: string
          last_name: string
          marketing_consent: boolean | null
          phone: string
          privacy_accepted: boolean | null
          privacy_accepted_at: string | null
          privacy_ip_address: string | null
          privacy_user_agent: string | null
          referral_code: string | null
          residence_address: string | null
          residence_city: string | null
          residence_province: string | null
          residence_zip_code: string | null
          updated_at: string | null
          vat_number: string | null
          vat_number_normalized: string | null
        }
        Insert: {
          client_type: Database["public"]["Enums"]["client_type"]
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name: string
          fiscal_code: string
          fiscal_code_normalized?: string | null
          id?: string
          last_name: string
          marketing_consent?: boolean | null
          phone: string
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          privacy_ip_address?: string | null
          privacy_user_agent?: string | null
          referral_code?: string | null
          residence_address?: string | null
          residence_city?: string | null
          residence_province?: string | null
          residence_zip_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          vat_number_normalized?: string | null
        }
        Update: {
          client_type?: Database["public"]["Enums"]["client_type"]
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string
          fiscal_code?: string
          fiscal_code_normalized?: string | null
          id?: string
          last_name?: string
          marketing_consent?: boolean | null
          phone?: string
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          privacy_ip_address?: string | null
          privacy_user_agent?: string | null
          referral_code?: string | null
          residence_address?: string | null
          residence_city?: string | null
          residence_province?: string | null
          residence_zip_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          vat_number_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_packages: {
        Row: {
          active: boolean
          calculation_type: string
          commission_admin_bollettino: number
          commission_admin_rid: number
          commission_manager_bollettino: number
          commission_manager_rid: number
          commission_subagente_bollettino: number
          commission_subagente_rid: number
          commission_team_manager_bollettino: number
          commission_team_manager_rid: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          calculation_type: string
          commission_admin_bollettino?: number
          commission_admin_rid?: number
          commission_manager_bollettino?: number
          commission_manager_rid?: number
          commission_subagente_bollettino?: number
          commission_subagente_rid?: number
          commission_team_manager_bollettino?: number
          commission_team_manager_rid?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          calculation_type?: string
          commission_admin_bollettino?: number
          commission_admin_rid?: number
          commission_manager_bollettino?: number
          commission_manager_rid?: number
          commission_subagente_bollettino?: number
          commission_subagente_rid?: number
          commission_team_manager_bollettino?: number
          commission_team_manager_rid?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["app_role"]
          offer_id: string | null
          package_id: string | null
          type: string
          user_id: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["app_role"]
          offer_id?: string | null
          package_id?: string | null
          type: string
          user_id?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["app_role"]
          offer_id?: string | null
          package_id?: string | null
          type?: string
          user_id?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "commission_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_reports: {
        Row: {
          commissions_count: number
          created_at: string
          generated_by: string
          id: string
          pdf_url: string
          period_end: string
          period_start: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commissions_count?: number
          created_at?: string
          generated_by: string
          id?: string
          pdf_url: string
          period_end: string
          period_start: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commissions_count?: number
          created_at?: string
          generated_by?: string
          id?: string
          pdf_url?: string
          period_end?: string
          period_start?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          created_at: string
          created_by: string | null
          email: string | null
          fiscal_code: string | null
          id: string
          legal_representative: string | null
          notes: string | null
          phone: string | null
          province: string | null
          updated_at: string
          vat_number: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          fiscal_code?: string | null
          id?: string
          legal_representative?: string | null
          notes?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          vat_number: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          fiscal_code?: string | null
          id?: string
          legal_representative?: string | null
          notes?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          vat_number?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      contract_requests: {
        Row: {
          address: string
          admin_commission: number | null
          assigned_manager_id: string | null
          assigned_user_id: string | null
          bill_type: Database["public"]["Enums"]["bill_type"]
          city: string
          client_email: string
          client_id: string | null
          client_name: string
          client_phone: string
          client_type: Database["public"]["Enums"]["client_type"]
          code: string
          commission: number
          company_name: string | null
          created_at: string
          current_ccv: number | null
          current_operator: string | null
          current_unit_price: number | null
          current_yearly_cost: number | null
          document_type: Database["public"]["Enums"]["document_type"]
          fiscal_code: string
          iban: string | null
          id: string
          last_status_change: string
          manager_commission: number | null
          meter_number: string | null
          migration_code: string | null
          monthly_consumption: number | null
          monthly_spend: number | null
          notes: string | null
          offer_id: string
          offer_yearly_cost: number | null
          operation_type: Database["public"]["Enums"]["operation_type"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          pdr_code: string | null
          pod_code: string | null
          provider_id: string
          province: string
          rejection_reason: string | null
          savings_percentage: number | null
          signed_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          supply_address_id: string | null
          supply_type: Database["public"]["Enums"]["supply_type"]
          uploaded_at: string | null
          user_commission: number | null
          vat_number: string | null
          yearly_consumption: number | null
          yearly_savings: number | null
          zip_code: string
        }
        Insert: {
          address: string
          admin_commission?: number | null
          assigned_manager_id?: string | null
          assigned_user_id?: string | null
          bill_type: Database["public"]["Enums"]["bill_type"]
          city: string
          client_email: string
          client_id?: string | null
          client_name: string
          client_phone: string
          client_type: Database["public"]["Enums"]["client_type"]
          code: string
          commission?: number
          company_name?: string | null
          created_at?: string
          current_ccv?: number | null
          current_operator?: string | null
          current_unit_price?: number | null
          current_yearly_cost?: number | null
          document_type: Database["public"]["Enums"]["document_type"]
          fiscal_code: string
          iban?: string | null
          id?: string
          last_status_change?: string
          manager_commission?: number | null
          meter_number?: string | null
          migration_code?: string | null
          monthly_consumption?: number | null
          monthly_spend?: number | null
          notes?: string | null
          offer_id: string
          offer_yearly_cost?: number | null
          operation_type: Database["public"]["Enums"]["operation_type"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          pdr_code?: string | null
          pod_code?: string | null
          provider_id: string
          province: string
          rejection_reason?: string | null
          savings_percentage?: number | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supply_address_id?: string | null
          supply_type: Database["public"]["Enums"]["supply_type"]
          uploaded_at?: string | null
          user_commission?: number | null
          vat_number?: string | null
          yearly_consumption?: number | null
          yearly_savings?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          admin_commission?: number | null
          assigned_manager_id?: string | null
          assigned_user_id?: string | null
          bill_type?: Database["public"]["Enums"]["bill_type"]
          city?: string
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          code?: string
          commission?: number
          company_name?: string | null
          created_at?: string
          current_ccv?: number | null
          current_operator?: string | null
          current_unit_price?: number | null
          current_yearly_cost?: number | null
          document_type?: Database["public"]["Enums"]["document_type"]
          fiscal_code?: string
          iban?: string | null
          id?: string
          last_status_change?: string
          manager_commission?: number | null
          meter_number?: string | null
          migration_code?: string | null
          monthly_consumption?: number | null
          monthly_spend?: number | null
          notes?: string | null
          offer_id?: string
          offer_yearly_cost?: number | null
          operation_type?: Database["public"]["Enums"]["operation_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pdr_code?: string | null
          pod_code?: string | null
          provider_id?: string
          province?: string
          rejection_reason?: string | null
          savings_percentage?: number | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          supply_address_id?: string | null
          supply_type?: Database["public"]["Enums"]["supply_type"]
          uploaded_at?: string | null
          user_commission?: number | null
          vat_number?: string | null
          yearly_consumption?: number | null
          yearly_savings?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_requests_assigned_manager_id_fkey"
            columns: ["assigned_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_requests_supply_address_id_fkey"
            columns: ["supply_address_id"]
            isOneToOne: false
            referencedRelation: "client_supply_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_market_prices: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          psv_value: number
          pun_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          psv_value: number
          pun_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          psv_value?: number
          pun_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      offer_documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          offer_id: string
          provider_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          offer_id: string
          provider_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          offer_id?: string
          provider_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          activation_cost: number | null
          active: boolean
          bollettino_enabled: boolean
          calculation_type: string
          code: string
          commission_admin: number | null
          commission_admin_bollettino: number
          commission_admin_rid: number
          commission_manager: number | null
          commission_manager_bollettino: number
          commission_manager_rid: number
          commission_subagente_bollettino: number
          commission_subagente_rid: number
          commission_team_manager: number | null
          commission_team_manager_bollettino: number
          commission_team_manager_rid: number
          commission_total: number | null
          commission_user: number | null
          contract_duration: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          description: string | null
          download_speed: number | null
          early_termination_fee: number | null
          earning_bollettino: number
          earning_rid: number
          fiber_technology:
            | Database["public"]["Enums"]["fiber_technology"]
            | null
          fixed_monthly_cost: number
          id: string
          is_fiber: boolean | null
          mobile_bundle: string | null
          name: string
          price_per_unit: number
          price_unit: Database["public"]["Enums"]["price_unit"]
          provider_id: string
          pun_spread: number | null
          router_cost: number | null
          router_included: boolean | null
          target_customer: Database["public"]["Enums"]["target_customer"]
          time_slot: Database["public"]["Enums"]["time_slot"] | null
          type: Database["public"]["Enums"]["offer_type"]
          unlimited_calls: boolean | null
          updated_at: string
          upload_speed: number | null
          valid_from: string
          valid_operations: Database["public"]["Enums"]["operation_type"][]
          valid_until: string | null
        }
        Insert: {
          activation_cost?: number | null
          active?: boolean
          bollettino_enabled?: boolean
          calculation_type?: string
          code: string
          commission_admin?: number | null
          commission_admin_bollettino?: number
          commission_admin_rid?: number
          commission_manager?: number | null
          commission_manager_bollettino?: number
          commission_manager_rid?: number
          commission_subagente_bollettino?: number
          commission_subagente_rid?: number
          commission_team_manager?: number | null
          commission_team_manager_bollettino?: number
          commission_team_manager_rid?: number
          commission_total?: number | null
          commission_user?: number | null
          contract_duration: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_speed?: number | null
          early_termination_fee?: number | null
          earning_bollettino?: number
          earning_rid?: number
          fiber_technology?:
            | Database["public"]["Enums"]["fiber_technology"]
            | null
          fixed_monthly_cost?: number
          id?: string
          is_fiber?: boolean | null
          mobile_bundle?: string | null
          name: string
          price_per_unit: number
          price_unit: Database["public"]["Enums"]["price_unit"]
          provider_id: string
          pun_spread?: number | null
          router_cost?: number | null
          router_included?: boolean | null
          target_customer?: Database["public"]["Enums"]["target_customer"]
          time_slot?: Database["public"]["Enums"]["time_slot"] | null
          type: Database["public"]["Enums"]["offer_type"]
          unlimited_calls?: boolean | null
          updated_at?: string
          upload_speed?: number | null
          valid_from: string
          valid_operations?: Database["public"]["Enums"]["operation_type"][]
          valid_until?: string | null
        }
        Update: {
          activation_cost?: number | null
          active?: boolean
          bollettino_enabled?: boolean
          calculation_type?: string
          code?: string
          commission_admin?: number | null
          commission_admin_bollettino?: number
          commission_admin_rid?: number
          commission_manager?: number | null
          commission_manager_bollettino?: number
          commission_manager_rid?: number
          commission_subagente_bollettino?: number
          commission_subagente_rid?: number
          commission_team_manager?: number | null
          commission_team_manager_bollettino?: number
          commission_team_manager_rid?: number
          commission_total?: number | null
          commission_user?: number | null
          contract_duration?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_speed?: number | null
          early_termination_fee?: number | null
          earning_bollettino?: number
          earning_rid?: number
          fiber_technology?:
            | Database["public"]["Enums"]["fiber_technology"]
            | null
          fixed_monthly_cost?: number
          id?: string
          is_fiber?: boolean | null
          mobile_bundle?: string | null
          name?: string
          price_per_unit?: number
          price_unit?: Database["public"]["Enums"]["price_unit"]
          provider_id?: string
          pun_spread?: number | null
          router_cost?: number | null
          router_included?: boolean | null
          target_customer?: Database["public"]["Enums"]["target_customer"]
          time_slot?: Database["public"]["Enums"]["time_slot"] | null
          type?: Database["public"]["Enums"]["offer_type"]
          unlimited_calls?: boolean | null
          updated_at?: string
          upload_speed?: number | null
          valid_from?: string
          valid_operations?: Database["public"]["Enums"]["operation_type"][]
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_offer_associations: {
        Row: {
          created_at: string
          offer_id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          offer_id: string
          package_id: string
        }
        Update: {
          created_at?: string
          offer_id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_offer_associations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_offer_associations_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "commission_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commission_rate: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          address: string
          contact_person: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          logo: string | null
          name: string
          notes: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type"]
          phone: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          status: Database["public"]["Enums"]["provider_status"]
          updated_at: string
          vat_number: string
          website: string | null
        }
        Insert: {
          address: string
          contact_person: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          logo?: string | null
          name: string
          notes?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type"]
          phone: string
          provider_type?: Database["public"]["Enums"]["provider_type"]
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          vat_number: string
          website?: string | null
        }
        Update: {
          address?: string
          contact_person?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          logo?: string | null
          name?: string
          notes?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type"]
          phone?: string
          provider_type?: Database["public"]["Enums"]["provider_type"]
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          vat_number?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_contact_requests: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          interest_type: string | null
          last_name: string
          notes: string | null
          phone: string
          province: string | null
          referral_code: string | null
          referred_by_client_id: string | null
          status: Database["public"]["Enums"]["contact_request_status"]
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          interest_type?: string | null
          last_name: string
          notes?: string | null
          phone: string
          province?: string | null
          referral_code?: string | null
          referred_by_client_id?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"]
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          interest_type?: string | null
          last_name?: string
          notes?: string | null
          phone?: string
          province?: string | null
          referral_code?: string | null
          referred_by_client_id?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"]
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_contact_requests_referred_by_client_id_fkey"
            columns: ["referred_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          attachment_id: string
          request_id: string
        }
        Insert: {
          attachment_id: string
          request_id: string
        }
        Update: {
          attachment_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_edit_history: {
        Row: {
          created_at: string
          edited_by: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          request_id: string
        }
        Insert: {
          created_at?: string
          edited_by: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          request_id: string
        }
        Update: {
          created_at?: string
          edited_by?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_edit_history_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_edit_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          request_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          request_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          confirmation_ip: string | null
          confirmation_token: string | null
          confirmation_url: string | null
          confirmed_at: string | null
          contract_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          infobip_message_id: string | null
          message_text: string
          metadata: Json | null
          phone_number: string
          privacy_accepted: boolean
          privacy_accepted_at: string | null
          read_at: string | null
          sent_at: string
          sent_by: string
          status: Database["public"]["Enums"]["sms_status"]
          updated_at: string
        }
        Insert: {
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmed_at?: string | null
          contract_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          infobip_message_id?: string | null
          message_text: string
          metadata?: Json | null
          phone_number: string
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          read_at?: string | null
          sent_at?: string
          sent_by: string
          status?: Database["public"]["Enums"]["sms_status"]
          updated_at?: string
        }
        Update: {
          confirmation_ip?: string | null
          confirmation_token?: string | null
          confirmation_url?: string | null
          confirmed_at?: string | null
          contract_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          infobip_message_id?: string | null
          message_text?: string
          metadata?: Json | null
          phone_number?: string
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          read_at?: string | null
          sent_at?: string
          sent_by?: string
          status?: Database["public"]["Enums"]["sms_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_commission_packages: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          id: string
          package_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          package_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          package_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_commission_packages_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_commission_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "commission_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_commission_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hierarchy: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_offer_commission_overrides: {
        Row: {
          active: boolean
          calculation_type: string | null
          commission_admin_bollettino: number | null
          commission_admin_rid: number | null
          commission_manager_bollettino: number | null
          commission_manager_rid: number | null
          commission_subagente_bollettino: number | null
          commission_subagente_rid: number | null
          commission_team_manager_bollettino: number | null
          commission_team_manager_rid: number | null
          created_at: string
          created_by: string | null
          id: string
          offer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          calculation_type?: string | null
          commission_admin_bollettino?: number | null
          commission_admin_rid?: number | null
          commission_manager_bollettino?: number | null
          commission_manager_rid?: number | null
          commission_subagente_bollettino?: number | null
          commission_subagente_rid?: number | null
          commission_team_manager_bollettino?: number | null
          commission_team_manager_rid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          calculation_type?: string | null
          commission_admin_bollettino?: number | null
          commission_admin_rid?: number | null
          commission_manager_bollettino?: number | null
          commission_manager_rid?: number | null
          commission_subagente_bollettino?: number | null
          commission_subagente_rid?: number | null
          commission_team_manager_bollettino?: number | null
          commission_team_manager_rid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offer_commission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_commission_overrides_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_commission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      calculate_contract_commissions: {
        Args: {
          contract_id_param: string
          offer_id_param: string
          user_id_param: string
        }
        Returns: {
          amount: number
          level: Database["public"]["Enums"]["app_role"]
          package_id: string
          type: string
          user_id: string
        }[]
      }
      check_and_disable_auto_import: { Args: never; Returns: undefined }
      cleanup_database_except_admins: { Args: never; Returns: Json }
      find_duplicate_clients: {
        Args: never
        Returns: {
          client_ids: string[]
          count: number
          fiscal_code_norm: string
          vat_number_norm: string
        }[]
      }
      get_available_parents: {
        Args: { for_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          email: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_user_hierarchy: {
        Args: { target_user_id: string }
        Returns: {
          email: string
          full_name: string
          level: number
          parent_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_duplicate_clients: {
        Args: { keep_client_id: string; merge_client_ids: string[] }
        Returns: Json
      }
      normalize_code: { Args: { code: string }; Returns: string }
      search_products: {
        Args: { limit_count?: number; search_term: string }
        Returns: {
          barcode: string
          brand: string
          calories_per_100g: number
          category: string
          id: string
          image_url: string
          is_generic: boolean
          name: string
          popularity_score: number
          similarity_score: number
          unit_type: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "manager" | "subagente" | "team_manager" | "gestore"
      attachment_type:
        | "documento_identita"
        | "codice_fiscale"
        | "bolletta"
        | "iban"
        | "altro"
      bill_type: "mensile" | "bimestrale"
      client_type: "privato" | "business" | "condominio"
      conserve_type: "frigo" | "freezer" | "ambiente"
      contact_request_status:
        | "new"
        | "contacted"
        | "converted"
        | "not_interested"
      contract_type: "fisso" | "variabile"
      document_type: "carta_identita" | "patente" | "passaporto"
      fiber_technology: "ftth" | "fttc" | "fwa" | "adsl"
      offer_type: "electricity" | "gas" | "dual"
      operation_type: "switch" | "subentro" | "prima_attivazione" | "voltura"
      partnership_type: "standard" | "premium" | "gold"
      payment_method: "RID" | "Bollettino"
      price_unit: "€/MWh" | "€/kWh" | "€/Smc"
      provider_status: "pending" | "active" | "inactive"
      provider_type: "energy" | "fiber"
      recipe_difficulty: "facile" | "media" | "difficile"
      referral_status:
        | "pending"
        | "contacted"
        | "contract_signed"
        | "contract_completed"
        | "voucher_sent"
        | "voucher_redeemed"
        | "rejected"
      reminder_type: "oggi" | "meno_1" | "meno_3" | "meno_7" | "lunedi"
      request_status:
        | "pending"
        | "integration_required"
        | "signed"
        | "rejected"
        | "uploaded"
        | "perfezionato"
        | "in_attesa"
        | "richiesta_integrazioni"
        | "ko"
        | "caricata_portale"
        | "firmata"
      sms_status: "pending" | "sent" | "delivered" | "read" | "failed"
      sub_status: "prova" | "attivo" | "scaduto" | "cancellato"
      supply_type: "electricity" | "gas" | "dual" | "fiber"
      target_customer: "privato" | "business" | "condominio" | "all"
      time_slot: "monoraria" | "bioraria" | "trioraria"
      unit_type: "pezzi" | "g" | "kg" | "ml" | "l" | "porzioni"
      visibility_type: "privata" | "pubblica"
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
    Enums: {
      app_role: ["admin", "manager", "subagente", "team_manager", "gestore"],
      attachment_type: [
        "documento_identita",
        "codice_fiscale",
        "bolletta",
        "iban",
        "altro",
      ],
      bill_type: ["mensile", "bimestrale"],
      client_type: ["privato", "business", "condominio"],
      conserve_type: ["frigo", "freezer", "ambiente"],
      contact_request_status: [
        "new",
        "contacted",
        "converted",
        "not_interested",
      ],
      contract_type: ["fisso", "variabile"],
      document_type: ["carta_identita", "patente", "passaporto"],
      fiber_technology: ["ftth", "fttc", "fwa", "adsl"],
      offer_type: ["electricity", "gas", "dual"],
      operation_type: ["switch", "subentro", "prima_attivazione", "voltura"],
      partnership_type: ["standard", "premium", "gold"],
      payment_method: ["RID", "Bollettino"],
      price_unit: ["€/MWh", "€/kWh", "€/Smc"],
      provider_status: ["pending", "active", "inactive"],
      provider_type: ["energy", "fiber"],
      recipe_difficulty: ["facile", "media", "difficile"],
      referral_status: [
        "pending",
        "contacted",
        "contract_signed",
        "contract_completed",
        "voucher_sent",
        "voucher_redeemed",
        "rejected",
      ],
      reminder_type: ["oggi", "meno_1", "meno_3", "meno_7", "lunedi"],
      request_status: [
        "pending",
        "integration_required",
        "signed",
        "rejected",
        "uploaded",
        "perfezionato",
        "in_attesa",
        "richiesta_integrazioni",
        "ko",
        "caricata_portale",
        "firmata",
      ],
      sms_status: ["pending", "sent", "delivered", "read", "failed"],
      sub_status: ["prova", "attivo", "scaduto", "cancellato"],
      supply_type: ["electricity", "gas", "dual", "fiber"],
      target_customer: ["privato", "business", "condominio", "all"],
      time_slot: ["monoraria", "bioraria", "trioraria"],
      unit_type: ["pezzi", "g", "kg", "ml", "l", "porzioni"],
      visibility_type: ["privata", "pubblica"],
    },
  },
} as const
