# Publicação do front na AWS (S3 + CloudFront)

Configuração única. O bucket é **privado**; só o CloudFront lê (Origin Access Control).

## 1. Bucket S3

- Nome: ex. `klinsync-frontend-prod`, região `us-east-2`.
- Block Public Access: **ligado**. Sem "static website hosting".
- Bucket policy: permitir `s3:GetObject` apenas para o serviço `cloudfront.amazonaws.com` com condição `AWS:SourceArn` = ARN da distribuição.

## 2. CloudFront

- Origem: o bucket, com **Origin Access Control** (OAC).
- Domínio alternativo + certificado ACM (em `us-east-1`), ex.: `app.meudominio.com.br`.
- Default root object: `index.html`.
- **Fallback de SPA** (rotas como `/entrar`, `/hospital/salas` não existem como arquivo): em _Error pages_, mapear `403` e `404` para `/index.html` com código de resposta `200`, TTL 0.
- Comportamento padrão: HTTPS obrigatório, compressão ligada, cache policy `CachingOptimized`.
  Os arquivos em `/assets/*` têm hash no nome e já saem do S3 com `Cache-Control: immutable`.

## 3. Response headers policy (segurança)

No projeto mãe os headers vinham do servidor Node. Agora devem ser aplicados no CloudFront
(_Response headers policy_ anexada ao comportamento). Substitua `API` pelo domínio da API:

| Header                       | Valor                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`                     |
| `X-Content-Type-Options`     | `nosniff`                                                          |
| `X-Frame-Options`            | `DENY`                                                             |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                  |
| `Permissions-Policy`         | `camera=(self), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                      |
| `Content-Security-Policy`    | ver abaixo                                                         |

```
default-src 'self';
script-src 'self' https://www.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' data: https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
media-src 'self' blob:;
connect-src 'self' https://api.meudominio.com.br https://www.google.com;
frame-src https://www.google.com;
frame-ancestors 'none';
object-src 'none';
manifest-src 'self';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests
```

`img-src https:` cobre as fotos de check-in servidas por URL assinada (ajuste para o domínio exato do bucket de fotos quando o backend estiver definido).
`script-src` não precisa de `'unsafe-inline'`: o SPA não injeta scripts inline.

## 4. CORS no backend (EC2)

A API fica em outro subdomínio, então o backend deve responder CORS:

- `Access-Control-Allow-Origin`: `https://app.meudominio.com.br` (origem exata, nunca `*`).
- `Access-Control-Allow-Headers`: `Authorization, Content-Type`.
- `Access-Control-Allow-Methods`: `GET, POST, DELETE, OPTIONS`.
- Responder o preflight `OPTIONS` sem exigir autenticação.

## 5. IAM da role do GitHub Actions (OIDC)

Permissões mínimas:

- `s3:ListBucket` no bucket; `s3:PutObject`, `s3:DeleteObject` em `bucket/*`.
- `cloudfront:CreateInvalidation` na distribuição.

Secrets do ambiente `develop` no GitHub: ver cabeçalho de
[.github/workflows/deploy-frontend.yml](../.github/workflows/deploy-frontend.yml).

## 6. DNS

- `app.meudominio.com.br` → CNAME/ALIAS para a distribuição CloudFront.
- `api.meudominio.com.br` → EC2 (ou ALB) do backend, com HTTPS.
