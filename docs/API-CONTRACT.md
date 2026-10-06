# Contrato da API — KlinSync

> Implementado em [`klinsync-backend`](https://github.com/ViniciusFelipe2/klinsync-backend) (testes de integração cobrem todos os endpoints abaixo).

Contrato que o `klinsync-backend` (EC2) precisa implementar para o `klinsync-frontend`.
Os tipos exatos de request/response estão em `src/lib/api/*.ts`; as tabelas, em `src/lib/api/db-types.ts`.
Cada endpoint corresponde a uma server function do projeto mãe (`trizion/src/lib/*.functions.ts`), cuja regra de negócio deve ser reproduzida.

## Convenções

- Base URL: `https://api.<dominio>`. JSON em UTF-8. Datas em ISO 8601 (UTC). IDs são UUID.
- Autenticação: `Authorization: Bearer <accessToken>` em tudo, exceto onde marcado **(público)**.
- Erros: status HTTP adequado e corpo `{ "message": "texto seguro para o usuário" }`.
  O front exibe `message` direto; **não** vazar SQL, stack, nomes de tabela ou URLs internas.
  - `401` token ausente/inválido/expirado (o front tenta `/auth/refresh` uma vez e, se falhar, volta ao login).
  - `403` sem permissão para a operação. `404` não encontrado. `422` validação. `423` bloqueado. `429` rate limit.
- **Isolamento por hospital (tenant):** toda consulta de `hospital_admin`/`operador` é filtrada pelo `tenant_id` do perfil do chamador,
  nunca por parâmetro vindo do cliente. Perfil inativo (`usuarios_perfil.ativo = false`) é tratado como não autorizado.
- Papéis: `master_admin` (equipe Trizion), `hospital_admin`, `operador` (vinculado a uma `feature`).
- Auditoria: ações sensíveis gravam em `log_acoes_sensiveis` (`registrarAcao`), com os mesmos nomes de ação de `src/lib/api/auditoria.ts`.
- CORS: ver [deploy/AWS.md](../deploy/AWS.md).

## Autenticação

Sessão devolvida por login/refresh/MFA: `{ accessToken, refreshToken, expiresAt, user: { id, email } }` (`expiresAt` em segundos epoch).

| Método | Rota                             | Corpo → Resposta                                                           |
| ------ | -------------------------------- | -------------------------------------------------------------------------- |
| POST   | `/auth/login` **(público)**      | `{ email, senha, captchaToken                                              | null }`→ sessão, **ou**`{ mfaRequired: true, mfaToken, factorId }` |
| POST   | `/auth/mfa/verify` **(público)** | `{ mfaToken, factorId, code }` → sessão                                    |
| POST   | `/auth/refresh` **(público)**    | `{ refreshToken }` → sessão (rotaciona o refresh token)                    |
| POST   | `/auth/logout`                   | `{ refreshToken }` → 204 (revoga o refresh token)                          |
| GET    | `/auth/me`                       | → `{ id, email }`                                                          |
| GET    | `/auth/mfa/factors`              | → `{ id, status, friendly_name }[]`                                        |
| POST   | `/auth/mfa/enroll`               | `{ friendlyName }` → `{ id, qr, secret }` (`qr` = data URL/SVG do QR TOTP) |
| POST   | `/auth/mfa/enroll/confirm`       | `{ factorId, code }` → `{ ok: true }`                                      |
| DELETE | `/auth/mfa/factors/:id`          | → `{ ok: true }`                                                           |

Regras do `/auth/login` (antes feitas por `verificarBloqueio` + `registrarTentativaLogin`, agora no servidor):

1. Rate limit por IP: 30 requisições/min → `429` "Muitas tentativas seguidas. Aguarde um minuto e tente novamente."
2. Validar captcha (reCAPTCHA v3, ação `login`) quando `RECAPTCHA_SECRET_KEY` estiver configurada.
3. Bloqueio: IP em `ip_bloqueios` (permanente ou `bloqueado_ate` futuro) ou falhas recentes (`log_acessos`, `sucesso=false`, dentro de `config_seguranca.janela_minutos`)
   do mesmo e-mail/IP ≥ `max_tentativas` → `423 { message, bloqueado: true, minutosRestantes }`.
   Falhas do IP ≥ `2 × max_tentativas` criam bloqueio automático do IP por `bloqueio_minutos`.
4. Credenciais inválidas → `401` (mensagem genérica; não revelar se o e-mail existe). Perfil inativo também → `401`.
5. Registrar **toda** tentativa em `log_acessos` (`usuario_id`, `email_tentado`, `tenant_id`, `ip`, `pais_regiao` por geolocalização do IP, `sucesso`).
6. Se o usuário tem fator TOTP verificado, responder `mfaRequired` em vez da sessão; `mfaToken` é curto (≈5 min) e de uso único.
7. `master_admin` deve ter MFA ativo (o painel já alerta "Master sem MFA").

Senhas: mínimo conforme `src/lib/senha.ts` (`senhaForte`) e rejeitar senhas vazadas (HIBP k-anonymity) em criação/reset/aceite de convite.

## Sessão e módulos

| Método | Rota                      | Corpo → Resposta                                                                                                                                                                                           |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/sessao`                 | → `{ perfil, tenant, features: [{id,chave,nome}] }` (`perfil` nulo se inativo)                                                                                                                             |
| GET    | `/sessao/destino-inicial` | → `{ destino }`: `master_admin`→`/master`, `hospital_admin`→`/hospital`, operador→`/check-in` (feature `checkin_cirurgioes`) ou `/giro-sala` (feature `giro_de_sala`) ou `/operacional`; `null` se inativo |
| POST   | `/modulos/acesso`         | `{ chave }` → `AcessoModulo` (`modulos.ts`): feature precisa estar habilitada no hospital; operador só abre a feature vinculada; master sempre pode; hospital `status != ativo` → `hospital_inativo`       |
| GET    | `/modulos/equipe-nomes`   | → `{ id, nome }[]` da equipe do próprio hospital                                                                                                                                                           |

## Painel Master (`master_admin`)

| Método | Rota                                                                | Observação                                                                                                                             |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/master/dashboard`                                                 | tenants, features, tenant_features, usuarios (resumo), acessos dos últimos 7 dias                                                      |
| POST   | `/master/hospitais/salvar`                                          | cria/atualiza tenant; ações `criou_hospital`/`atualizou_hospital`                                                                      |
| POST   | `/master/features/alternar`                                         | upsert em `tenant_features` + linha em `tenant_features_historico`; ação `alterou_feature_flag`                                        |
| POST   | `/master/salas/listar` · `/salvar` · `/excluir`                     | respeita `tenants.limite_salas`; excluir só sem histórico em `eventos_giro` (remove antes `sala_dispositivos` e `eventos_sala_parada`) |
| GET    | `/master/usuarios`                                                  | todos os perfis                                                                                                                        |
| POST   | `/master/usuarios/criar`                                            | cria credencial + `usuarios_perfil`; `operador` exige feature habilitada no hospital; desfaz a credencial se o perfil falhar           |
| POST   | `/master/usuarios/resetar-senha` · `/alternar-ativo` · `/atualizar` | e-mail único; ações `resetou_senha`, `ativou_usuario`/`desativou_usuario`, `atualizou_usuario`                                         |
| GET    | `/master/seguranca/painel`                                          | últimos 200 acessos, 100 ações, config, tenants, 50 históricos de feature                                                              |
| POST   | `/master/seguranca/config`                                          | atualiza `config_seguranca` (linha única)                                                                                              |
| POST   | `/master/seguranca/ips`                                             | indicadores e IPs suspeitos (até 3000 acessos no período)                                                                              |
| POST   | `/master/seguranca/ips/bloquear` · `/desbloquear`                   | upsert/delete em `ip_bloqueios`                                                                                                        |
| POST   | `/master/seguranca/purgar-logs`                                     | retenção LGPD (`purgar_dados_antigos(_dias)`), 30–3650 dias                                                                            |
| POST   | `/master/seguranca/postura`                                         | checagens do banco/arquivos/contas + observabilidade de usuários (ver `seguranca.ts`)                                                  |
| POST   | `/auditoria`                                                        | master vê tudo; `hospital_admin` só o próprio hospital; máx. 800 eventos                                                               |

## Convites

| Método | Rota                              | Observação                                                                                                                                                                                                                                                   |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/convites/criar`                 | master (qualquer papel) ou hospital_admin (só `operador` do próprio hospital); token aleatório 16–64 alfanuméricos, guardar só o **hash**; 7 dias; revoga convite pendente anterior do mesmo e-mail; devolve `{ id, token }` (única vez que o token aparece) |
| GET    | `/convites`                       | sem `token_hash`; hospital_admin vê só os do seu hospital                                                                                                                                                                                                    |
| POST   | `/convites/revogar` · `/regerar`  | regerar renova token e validade                                                                                                                                                                                                                              |
| POST   | `/convites/validar` **(público)** | `{ token }` → `{ valido:false, motivo:"indisponivel" }` único para inexistente/revogado/usado/expirado (anti-enumeração); rate limit 20/min por IP                                                                                                           |
| POST   | `/convites/aceitar` **(público)** | `{ token, nome, senha }` → `{ email }`; cria credencial + perfil, marca `aceito_em`; rate limit 10/min por IP                                                                                                                                                |

## Hospital (`hospital_admin`)

`GET /hospital/resumo`, `GET /hospital/usuarios`, `GET /hospital/salas`, `POST /hospital/salas/salvar` (respeita `limite_salas`),
`POST /hospital/checkins`, `/hospital/giro`, `/hospital/acessos`, `/hospital/paradas` (paginados: `pagina`, `porPagina` 5–200, `de`/`ate` = `YYYY-MM-DD`),
`POST /hospital/giro/estatisticas`, `POST /hospital/paradas/estatisticas`.
Os cálculos (médias de enfermagem/limpeza/ciclo, janelas de 7/15/30/45 dias, etc.) seguem `trizion/src/lib/hospital.functions.ts`.

## Check-in de cirurgiões

| Método | Rota                                 | Observação                                                                                                                                                                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/checkins`                          | `{ doctorName (3–120), photoBase64 (data URL jpeg/png/webp, ≤ ~1,5 MB) }` → `{ id, doctor_name, checked_in_at }`; salva a foto em `<tenant>/<uuid>.<ext>` (S3 privado) e a linha em `check_ins`; rate limit por IP |
| POST   | `/checkins/listar`                   | `{ busca?, de?, ate?, pagina, porPagina }` → `{ linhas, total, hoje }`                                                                                                                                             |
| POST   | `/checkins/exportar`                 | mesmos filtros, até 5000 linhas                                                                                                                                                                                    |
| POST   | `/checkins/foto-url` · `/fotos-urls` | URL assinada curta (5 min / 30 min) — fotos são dado pessoal (LGPD); bucket nunca público                                                                                                                          |
| POST   | `/checkins/excluir`                  | apaga a foto e a linha (do próprio tenant)                                                                                                                                                                         |
| POST   | `/checkins/uso`                      | `{ usedBytes, totalBytes (1 GB), isEstimate, checkInCount }`                                                                                                                                                       |

## Giro de sala

| Método | Rota                                                  | Observação                                                                                                                                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/giro/salas`                                         | salas ativas do tenant do chamador, ordem por nome                                                                                                                                                                                                                                                                                               |
| GET    | `/giro/eventos?abertos=true` · `?horas=48`            | `eventos_giro` abertos (`fim` nulo) ou dos últimos N horas                                                                                                                                                                                                                                                                                       |
| GET    | `/giro/paradas?abertas=true`                          | `eventos_sala_parada` abertos                                                                                                                                                                                                                                                                                                                    |
| GET    | `/giro/historico?de=ISO&ate=ISO`                      | `{ giro, paradas }` no período                                                                                                                                                                                                                                                                                                                   |
| POST   | `/giro/etapas/iniciar`                                | `{ salaId, tipo }` — `usuario_inicio_id` vem do token; `desmontagem` grava `cirurgia_anterior = sala.cirurgia_atual`; valida a regra: enfermagem só com sala `livre`                                                                                                                                                                             |
| POST   | `/giro/etapas/finalizar`                              | `{ eventoId, cirurgiaProxima? }` — `desmontagem` exige `cirurgiaProxima` e só finaliza após a limpeza do ciclo; `salas.status_atual`/`cirurgia_atual` precisam acompanhar os eventos (no projeto mãe isso não aparece nas migrations do repositório — provavelmente trigger do banco anterior a elas; reproduzir no backend ou no `klinsync-db`) |
| POST   | `/giro/paradas/iniciar` · `/finalizar`                | `{ salaId }` / `{ paradaId }`                                                                                                                                                                                                                                                                                                                    |
| GET    | `/giro/reservas`                                      | `{ sala_id, device_id, ultimo_sinal }[]`                                                                                                                                                                                                                                                                                                         |
| POST   | `/giro/reservas/reservar` · `/liberar` · `/heartbeat` | `{ salaId, deviceId }`; `reservar` → `{ reservada: boolean }` (falso se outro tablet já tem a sala)                                                                                                                                                                                                                                              |

Todas as rotas de giro validam que a sala pertence ao tenant do chamador.

## Tempo real (opcional, evolução futura)

O front hoje usa polling (10–15 s). Se for preciso latência menor, expor SSE/WebSocket autenticado
(ex.: `GET /giro/stream`) emitindo "salas/eventos/paradas mudaram"; no front basta invalidar as queries em `src/hooks/use-giro.ts`.

## Notas da implementação (klinsync-backend)

- `/auth/logout` é público e usa só o `refreshToken` do corpo (funciona mesmo com o access token expirado).
- `/auth/refresh` faz **rotação**: cada refresh token vale uma vez; reutilizar um token já trocado revoga a sessão inteira (401).
- MFA: o login com fator verificado devolve `{ mfaRequired, mfaToken, factorId }`; o código TOTP é de **uso único** (um mesmo código não é aceito duas vezes).
- Limites de taxa (por IP, janela de 1 min): login 30, MFA 10 (e 10 por usuário a cada 5 min), refresh 120, check-in 60, validar convite 20, aceitar convite 10.
- Status HTTP: `401` não autenticado/credenciais ou código inválidos; `403` sem permissão; `404` fora do escopo do hospital; `409` conflito (duplicidade, etapa já iniciada/finalizada);
  `422` validação e regras de negócio; `423` login bloqueado (`{ bloqueado, minutosRestantes }`); `429` rate limit; `503` fotos sem bucket configurado.
- Datas de filtro (`de`/`ate`, `YYYY-MM-DD`) valem no fuso do hospital (`APP_TIMEZONE`); o limite final é exclusivo no dia seguinte.
- `/master/seguranca/postura`: as checagens de RLS/anon do projeto mãe foram substituídas por controles que existem na nova arquitetura
  (hash scrypt, role do banco sem superusuário, bucket privado, reCAPTCHA, MFA, política de login). `resumoTabelas.comRls` = total (acesso só pela API).
- `/master/seguranca/purgar-logs` devolve `{ acessos, acoes, auditoria }`, onde `auditoria` = registros de sessão (refresh tokens) expirados/revogados.
- `POST /giro/etapas/iniciar|finalizar` aplicam as regras da tela operacional no servidor (enfermagem com sala livre; limpeza dentro do ciclo;
  enfermagem só finaliza após a limpeza e com a próxima cirurgia) e mantêm `salas.status_atual/cirurgia_atual` na mesma transação.
