# Resend Email Hardening Checklist

Este checklist resume a configuracao recomendada para reduzir spam, bloqueios e falhas de seguranca no envio de e-mails transacionais.

## 1. Dominio e autenticacao
- Configure um subdominio dedicado para envios transacionais (exemplo: `mail.seudominio.com`).
- Configure e valide SPF e DKIM no painel do Resend.
- Configure DMARC com politica e monitoramento.
- Configure custom return-path e tracking domain para alinhamento de autenticacao.

## 2. Seguranca operacional
- Use chaves de API com escopo minimo necessario.
- Armazene `RESEND_API_KEY` e `RESEND_WEBHOOK_SECRET` apenas em variaveis de ambiente seguras.
- Rotacione chaves periodicamente.
- Nunca exponha chaves no frontend.
- Valide assinatura de webhook (`svix-*`) antes de processar eventos.
- Trate webhook como entrega "at-least-once": deduplicate por `svix-id`.

## 3. Entregabilidade e anti-spam
- Envie apenas para usuarios que deram consentimento.
- Mantenha conteudo consistente, claro e com versao texto (`text/plain`) junto do HTML.
- Evite picos de volume sem warm-up gradual.
- Monitore bounce, complaint e suppression e bloqueie reenvio para destinatarios suprimidos.
- Monitore reputacao do dominio/subdominio e ajuste volume quando houver degradacao.

## 4. Resiliencia de aplicacao
- Use idempotency key para envios sensiveis a clique duplicado.
- Trate 429/5xx do provedor com resposta retryable.
- Registre logs estruturados por `emailType`, `userId`, `orderId` e `resendMessageId`.
- Aplique cooldown por acao de usuario para reduzir duplicidade e abuso (recibos: 3 minutos por pedido).

