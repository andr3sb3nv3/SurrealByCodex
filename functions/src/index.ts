import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import nodemailer from 'nodemailer';

initializeApp();

const mailHost = defineSecret('MAIL_HOST');
const mailPort = defineSecret('MAIL_PORT');
const mailSecure = defineSecret('MAIL_SECURE');
const mailUser = defineSecret('MAIL_USER');
const mailPass = defineSecret('MAIL_PASS');
const mailFrom = defineSecret('MAIL_FROM');

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_DOMAIN = 'user.local';

interface RecoverPasswordInput {
  username?: string;
  recoveryEmail?: string;
  continueUrl?: string;
}

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const buildResetEmailHtml = (username: string, resetLink: string) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:auto;">
    <h2 style="margin:0 0 8px;">Recuperar contraseña</h2>
    <p style="margin:0 0 16px;">Recibimos una solicitud para restablecer la contraseña del usuario <b>${username}</b>.</p>
    <p style="margin:0 0 20px;">
      <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Restablecer contraseña</a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Si no solicitaste este cambio, podés ignorar este email.</p>
  </div>
`;

const getStoredRecoveryEmail = async (uid: string): Promise<string | null> => {
  const db = getFirestore();

  const [prefsSnap, userSnap] = await Promise.all([
    db.doc(`users/${uid}/user_settings/preferences`).get(),
    db.doc(`users/${uid}`).get(),
  ]);

  const fromPrefs = prefsSnap.get('recoveryEmail');
  if (typeof fromPrefs === 'string' && EMAIL_REGEX.test(fromPrefs.trim())) {
    return normalizeEmail(fromPrefs);
  }

  const fromUser = userSnap.get('recoveryEmail');
  if (typeof fromUser === 'string' && EMAIL_REGEX.test(fromUser.trim())) {
    return normalizeEmail(fromUser);
  }

  return null;
};

export const requestPasswordRecovery = onCall(
  {
    region: 'us-central1',
    secrets: [mailHost, mailPort, mailSecure, mailUser, mailPass, mailFrom],
  },
  async (request) => {
    const { username, recoveryEmail, continueUrl } = (request.data ?? {}) as RecoverPasswordInput;

    if (!username || !USERNAME_REGEX.test(username)) {
      throw new HttpsError('invalid-argument', 'El usuario no es válido.');
    }

    if (!recoveryEmail || !EMAIL_REGEX.test(recoveryEmail)) {
      throw new HttpsError('invalid-argument', 'El email de recuperación no es válido.');
    }

    const normalizedUsername = normalizeUsername(username);
    const normalizedRecoveryEmail = normalizeEmail(recoveryEmail);
    const authEmail = `${normalizedUsername}@${USERNAME_DOMAIN}`;

    let userRecord;
    try {
      userRecord = await getAuth().getUserByEmail(authEmail);
    } catch {
      throw new HttpsError('not-found', 'No existe un usuario con esos datos.');
    }

    const savedRecoveryEmail = await getStoredRecoveryEmail(userRecord.uid);
    if (!savedRecoveryEmail || savedRecoveryEmail !== normalizedRecoveryEmail) {
      throw new HttpsError('permission-denied', 'No existe un usuario con esos datos.');
    }

    const resetLink = await getAuth().generatePasswordResetLink(authEmail, continueUrl ? { url: continueUrl } : undefined);

    const transporter = nodemailer.createTransport({
      host: mailHost.value(),
      port: Number(mailPort.value()),
      secure: String(mailSecure.value()).toLowerCase() === 'true',
      auth: {
        user: mailUser.value(),
        pass: mailPass.value(),
      },
    });

    await transporter.sendMail({
      from: mailFrom.value(),
      to: normalizedRecoveryEmail,
      subject: 'Recuperación de contraseña - Surreal Horizons',
      html: buildResetEmailHtml(normalizedUsername, resetLink),
    });

    return {
      ok: true,
      message: 'Te enviamos un email para restablecer tu contraseña.',
    };
  }
);
