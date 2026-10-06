import { z } from "zod";

/**
 * Política de senha forte do KlinSync (LGPD / boas práticas):
 * mínimo de 10 caracteres, com maiúscula, minúscula, número e símbolo.
 */
export const REGRA_SENHA =
  "A senha precisa ter no mínimo 10 caracteres, com letra maiúscula, minúscula, número e símbolo.";

export const senhaForte = z
  .string()
  .min(10, REGRA_SENHA)
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[a-z]/, REGRA_SENHA)
  .regex(/[A-Z]/, REGRA_SENHA)
  .regex(/[0-9]/, REGRA_SENHA)
  .regex(/[^A-Za-z0-9]/, REGRA_SENHA);

export function senhaEhForte(valor: string): boolean {
  return senhaForte.safeParse(valor).success;
}
