import { sendPasswordResetEmail } from './emails'

export async function sendAccountPasswordLink(db, email, base, name = '') {
  const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email })
  if (error) {
    if (error.code === 'user_not_found' || error.status === 404) return false
    throw new Error('Password link could not be generated.')
  }
  if (!data?.properties?.hashed_token) throw new Error('Password link could not be generated.')
  const resetUrl = `${base.replace(/\/$/, '')}/auth/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`
  const result = await sendPasswordResetEmail({ to: email, name, resetUrl })
  if (result?.error || result?.skipped) throw new Error('Password email could not be sent.')
  return true
}
