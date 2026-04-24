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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RecoverPasswordInput {
  recoveryEmail?: string;
  continueUrl?: string;
}

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

export const requestPasswordRecovery = onCall(
  {
    region: 'us-central1',
    secrets: [mailHost, mailPort, mailSecure, mailUser, mailPass, mailFrom],
  },
  async (request) => {
    const { recoveryEmail, continueUrl } = (request.data ?? {}) as RecoverPasswordInput;

    if (!recoveryEmail || !EMAIL_REGEX.test(recoveryEmail)) {
      throw new HttpsError('invalid-argument', 'El email de recuperación no es válido.');
    }

    const normalizedRecoveryEmail = normalizeEmail(recoveryEmail);
    const usersSnap = await getFirestore()
      .collection('users')
      .where('recoveryEmail', '==', normalizedRecoveryEmail)
      .limit(1)
      .get();

    let accountEmail: string | null = null;

    if (!usersSnap.empty) {
      const uid = usersSnap.docs[0].id;
      try {
        const userByUid = await getAuth().getUser(uid);
        accountEmail = userByUid.email ?? null;
      } catch {
        accountEmail = null;
      }
    }

    if (!accountEmail) {
      try {
        const userByEmail = await getAuth().getUserByEmail(normalizedRecoveryEmail);
        accountEmail = userByEmail.email ?? null;
      } catch {
        accountEmail = null;
      }
    }

    if (!accountEmail) {
      throw new HttpsError('not-found', 'No existe una cuenta con ese email.');
    }

    const resetLink = await getAuth().generatePasswordResetLink(accountEmail, continueUrl ? { url: continueUrl } : undefined);

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
      html: buildResetEmailHtml(normalizedRecoveryEmail, resetLink),
    });

    return {
      ok: true,
      message: 'Te enviamos un email para restablecer tu contraseña.',
    };
  }
);
