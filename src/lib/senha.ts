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

/** Sorteia um inteiro em [0, max) com o gerador seguro do navegador, sem viés de módulo. */
function inteiroSeguro(max: number): number {
  const limite = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limite);
  return buf[0]! % max;
}

/** Gera uma senha que cumpre a política acima (sem caracteres ambíguos como 0/O e 1/l/I). */
export function gerarSenhaForte(tamanho = 16): string {
  const grupos = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*?-_",
  ];
  const todos = grupos.join("");
  // Uma de cada grupo garante a política; o resto sai de qualquer grupo.
  const chars = grupos.map((g) => g[inteiroSeguro(g.length)]!);
  while (chars.length < tamanho) chars.push(todos[inteiroSeguro(todos.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = inteiroSeguro(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
