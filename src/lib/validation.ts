import { z } from "zod";
import { isValidCpf, onlyDigits } from "./utils";

export const emailSchema = z.string().trim().email("Informe um e-mail válido.");

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo."),
  email: emailSchema,
  password: passwordSchema,
  organization_name: z.string().trim().min(2, "Informe o nome da rifa."),
  raffle_title: z.string().trim().min(2, "Informe o título do campanha."),
  ticket_price_cents: z.coerce.number().int().min(100, "O valor mínimo é R$ 1,00.").max(100_000_00),
  total_numbers: z.coerce.number().int().min(1).max(100_000),
  default_numbers_per_sale: z.coerce.number().int().min(1).max(100),
});

export const buyerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do comprador."),
  cpf: z
    .string()
    .optional()
    .transform((value) => onlyDigits(value ?? ""))
    .refine((value) => value === "" || isValidCpf(value), "Informe um CPF válido."),
  email: z
    .string()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || emailSchema.safeParse(value).success, "Informe um e-mail válido."),
  whatsapp: z
    .string()
    .optional()
    .transform((value) => onlyDigits(value ?? ""))
    .refine((value) => value === "" || value.length >= 10, "Informe um WhatsApp válido."),
});

export const saleSchema = z.object({
  buyer: buyerSchema,
  quantity: z.coerce.number().int().min(1).max(1000),
  payment_method: z.enum(["pix", "cash", "card", "other"]),
  payment_status: z.enum(["pending", "paid"]),
  notes: z.string().trim().max(500).optional(),
  number_ids: z.array(z.string().uuid()).optional(),
});

export function getZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os campos informados.";
}
