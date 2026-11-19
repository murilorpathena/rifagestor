"use client";

import { useState } from "react";
import { Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { buyerSchema } from "@/lib/validation";
import { cn, onlyDigits } from "@/lib/utils";

interface BuyerFormProps {
  initial?: { name: string; cpf: string; email: string; whatsapp: string };
  onSubmit: (data: { name: string; cpf: string; email: string; whatsapp: string }) => void;
  loading?: boolean;
  className?: string;
}

export function BuyerForm({ initial, onSubmit, loading, className }: BuyerFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    cpf: initial?.cpf ?? "",
    email: initial?.email ?? "",
    whatsapp: initial?.whatsapp ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const parsed = buyerSchema.safeParse({
      name: form.name,
      cpf: form.cpf,
      email: form.email,
      whatsapp: form.whatsapp,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSubmit({
      name: parsed.data.name,
      cpf: parsed.data.cpf,
      email: parsed.data.email,
      whatsapp: parsed.data.whatsapp,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-4", className)}>
      <Field label="Nome do comprador" htmlFor="buyer-name" error={errors.name}>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="buyer-name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="João da Silva"
            required
            className="pl-10"
            autoComplete="name"
          />
        </div>
      </Field>

      <Field label="CPF" htmlFor="buyer-cpf" error={errors.cpf} hint="Apenas números. Será formatado automaticamente.">
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="buyer-cpf"
            value={form.cpf}
            onChange={(e) =>
              handleChange("cpf", e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            className="pl-10"
          />
        </div>
      </Field>

      <Field label="E-mail" htmlFor="buyer-email" error={errors.email} hint="Opcional.">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="buyer-email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="joao@exemplo.com"
            autoComplete="email"
            className="pl-10"
          />
        </div>
      </Field>

      <Field label="WhatsApp" htmlFor="buyer-whatsapp" error={errors.whatsapp} hint="Opcional. Usado para contato após o sorteio.">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="buyer-whatsapp"
            value={form.whatsapp}
            onChange={(e) =>
              handleChange("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            placeholder="(11) 90000-0000"
            inputMode="tel"
            maxLength={15}
            className="pl-10"
          />
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={submitting || loading}>
        Próximo passo
      </Button>
    </form>
  );
}
