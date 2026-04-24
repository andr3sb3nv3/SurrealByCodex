# Firebase Cloud Functions

Esta carpeta agrega la función callable `requestPasswordRecovery` para recuperar contraseñas usando únicamente email.

## Qué hace

1. Recibe `recoveryEmail`.
2. Busca coincidencia en `users/{uid}.recoveryEmail` para cuentas de usuario anónimo.
3. Si no hay coincidencia, intenta recuperar cuenta por el mismo email en Firebase Auth.
4. Genera un link de restablecimiento de Firebase Auth.
5. Envía ese link al email recibido usando SMTP.

## Configuración de secretos

Antes de deploy, cargar secretos:

```bash
firebase functions:secrets:set MAIL_HOST
firebase functions:secrets:set MAIL_PORT
firebase functions:secrets:set MAIL_SECURE
firebase functions:secrets:set MAIL_USER
firebase functions:secrets:set MAIL_PASS
firebase functions:secrets:set MAIL_FROM
```

Valores típicos:

- `MAIL_PORT`: `465` o `587`
- `MAIL_SECURE`: `true` para 465, `false` para 587
- `MAIL_FROM`: `"Surreal Horizons <no-reply@tu-dominio.com>"`

## Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## Ejemplo de llamada desde el frontend

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'requestPasswordRecovery');
await fn({
  recoveryEmail: 'mi@email.com'
});
```
