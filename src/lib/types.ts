export type UserRole = "owner" | "member";

export type RaffleStatus = "active" | "closed" | "draft";
export type NumberStatus = "available" | "reserved" | "sold";
export type SaleStatus = "pending" | "paid" | "cancelled";
export type PaymentMethod = "pix" | "cash" | "card" | "other";

export interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Raffle {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  prize: string | null;
  draw_date: string | null;
  ticket_price_cents: number;
  total_numbers: number;
  default_numbers_per_sale: number;
  status: RaffleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RaffleNumber {
  id: string;
  raffle_id: string;
  number: number;
  status: NumberStatus;
  sale_id: string | null;
  buyer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Buyer {
  id: string;
  organization_id: string;
  name: string;
  cpf: string;
  email: string | null;
  whatsapp: string;
  created_at: string;
}

export interface Sale {
  id: string;
  organization_id: string;
  raffle_id: string;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: SaleStatus;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
}

export interface SaleNumber {
  id: string;
  sale_id: string;
  raffle_number_id: string;
  number_value: number;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

export interface InvitationPreview {
  organization_name: string;
  email: string;
  inviter_name: string;
  role: UserRole;
}

export interface SaleWithDetails extends Sale {
  buyer: Buyer | null;
  seller: Pick<Profile, "id" | "name" | "email"> | null;
  sale_numbers: Pick<SaleNumber, "id" | "number_value">[];
}

export interface TeamMember extends Membership {
  profile: Profile | null;
}
