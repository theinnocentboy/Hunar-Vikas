import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Logo from '@shared/Logo.tsx'
import { copyText } from '@shared/clipboard.ts'
import { isEmail, isName, isPassword } from '@shared/validators.ts'
import { register, resendVerification, verifyEmail } from './services/auth.service.ts'
import './index.css'

const MINI_STEPS = ['Create account', 'Verify email', 'Explore & grow']
const RESEND_COOLDOWN_SECONDS = 60

type Errors = { name?: string; email?: string; password?: string; confirm?: string; agree?: string }

export default function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agree, setAgree] = useState(false)
  const [accountType, setAccountType] = useState<'individual' | 'employer'>('individual')
  const [organizationName, setOrganizationName] = useState('')
  const [otp, setOtp] = useState('')
  const [verifyError, setVerifyError] = useState<string | undefined>()
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'verify' | 'success'>('idle')
  const [newUserId, setNewUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Resend timer & feedback state
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendInfo, setResendInfo] = useState<string | undefined>()

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) {
      setVerificationToken(token)
      setStatus('verify')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Tick down the 60-second resend cooldown every second
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  function validate(): boolean {
    const next: Errors = {}
    if (!isName(name)) {
      next.name = 'Enter your full name.'
    }
    if (!isEmail(email)) {
      next.email = 'Enter a valid email address.'
    }
    if (!isPassword(password)) {
      next.password = 'Password must be at least 8 characters.'
    }
    if (confirm !== password || confirm.length === 0) {
      next.confirm = 'Passwords do not match.'
    }
    if (!agree) {
      next.agree = 'Please accept the Terms to continue.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (status === 'loading') return
    if (!validate()) return
    setVerifyError(undefined)
    setResendInfo(undefined)
    setStatus('loading')
    try {
      await register(name, email, password, accountType, organizationName)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setStatus('verify')
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Could not create the account.')
      setStatus('idle')
    }
  }

  async function onResendCode(): Promise<void> {
    if (resendCooldown > 0 || resendLoading) return
    setVerifyError(undefined)
    setResendInfo(undefined)
    setResendLoading(true)
    try {
      await resendVerification(email)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setResendInfo('A new verification code has been sent to your email.')
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Could not resend verification code.')
    } finally {
      setResendLoading(false)
    }
  }

  async function copyId(): Promise<void> {
    if (!newUserId) return
    const ok = await copyText(newUserId)
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setStatus('idle')
    setName('')
    setEmail('')
    setPassword('')
    setConfirm('')
    setAgree(false)
    setAccountType('individual')
    setOrganizationName('')
    setOtp('')
    setVerifyError(undefined)
    setResendInfo(undefined)
    setResendCooldown(0)
    setErrors({})
    setCopied(false)
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Logo tagline="Building Skills. Empowering Futures" />
          <div className="header-actions">
            <span className="header-note hide-sm">
              <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Secure sign-up
            </span>
            <a href="/login/" className="btn btn-outline">
              Sign In
            </a>
          </div>
        </div>
      </header>

      <main className="container login-wrap">
        <div className="login-grid">
          <section className="login-card hero-fade" style={{ animationDelay: '150ms' }} aria-label="Create account">
            <ol className="mini-steps" aria-label="How joining works">
              {MINI_STEPS.map((s, i) => (
                <li key={s}>
                  <span className="num" aria-hidden="true">{i + 1}</span> {s}
                </li>
              ))}
            </ol>
            {status === 'verify' ? (
              <div className="success" role="status">
                <span className="success-ico"><i className="fa-solid fa-envelope" aria-hidden="true" /></span>
                <div>
                  <strong>Verify your email</strong>
                  <p>Enter the 6-digit code sent to <span className="muted">{email.trim()}</span>.</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    setVerifyError(undefined)
                    setResendInfo(undefined)
                    setVerifyLoading(true)
                    try {
                      const user = await verifyEmail(email, otp, true, verificationToken || undefined)
                      setNewUserId(user.userId)
                      setStatus('success')
                    } catch (err) {
                      setVerifyError(err instanceof Error ? err.message : 'Verification failed.')
                      setStatus('verify')
                    } finally {
                      setVerifyLoading(false)
                    }
                  }} noValidate>
                    {!verificationToken && <div className="field">
                      <label htmlFor="otp">Verification code</label>
                      <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                    </div>}
                    {verifyError && <small className="err" role="alert">{verifyError}</small>}
                    {resendInfo && <small className="muted" role="status" style={{ display: 'block', marginBottom: '8px' }}>{resendInfo}</small>}
                    <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={verifyLoading || (!verificationToken && otp.length !== 6)}>
                      {verifyLoading ? 'Verifying…' : 'Verify email →'}
                    </button>
                  </form>
                  {!verificationToken && (
                    <button
                      type="button"
                      className="link-btn"
                      disabled={resendCooldown > 0 || resendLoading}
                      style={{
                        marginTop: '10px',
                        opacity: resendCooldown > 0 || resendLoading ? 0.6 : 1,
                        cursor: resendCooldown > 0 || resendLoading ? 'not-allowed' : 'pointer',
                      }}
                      onClick={onResendCode}
                    >
                      {resendLoading
                        ? 'Sending…'
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>
            ) : status === 'success' ? (
              <div className="success" role="status">
                <span className="success-ico">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                </span>
                <div>
                  <strong>Welcome, {name.trim()}!</strong>
                  <p>
                    Your account is ready. <br />
                    <span className="muted">
                      {email.trim()} · India
                    </span>
                  </p>
                  {newUserId && (
                    <p className="user-id-row">
                      <span className="muted">Your ID:</span>{' '}
                      <code className="user-id">{newUserId}</code>{' '}
                      <button type="button" className="btn btn-outline btn-sm" onClick={copyId}>
                        <i className="fa-regular fa-copy" aria-hidden="true" />{' '}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </p>
                  )}
                  <div className="success-actions">
                    <a href="/dashboard/" className="btn btn-primary">
                      Open Dashboard →
                    </a>
                    <button type="button" className="btn btn-outline" onClick={reset}>
                      Register another account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="login-head">
                  <h2>Create your account</h2>
                  <p>Join Hunar Vikas India and start your skills journey.</p>
                </div>

                <form onSubmit={onSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="name">Full name</label>
                    <div className={`control ${errors.name ? 'invalid' : ''}`}>
                      <i className="fa-regular fa-user" aria-hidden="true" />
                      <input
                        id="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'name-err' : undefined}
                      />
                    </div>
                    {errors.name && (
                      <small id="name-err" className="err" role="alert">
                        {errors.name}
                      </small>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="email">Email address</label>
                    <div className={`control ${errors.email ? 'invalid' : ''}`}>
                      <i className="fa-regular fa-envelope" aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-err' : undefined}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="account-type">Account type</label>
                      <select id="account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as 'individual' | 'employer')}>
                        <option value="individual">Citizen / Artisan</option>
                        <option value="employer">Employer</option>
                      </select>
                    </div>
                    {accountType === 'employer' && (
                      <div className="field">
                        <label htmlFor="organization-name">Organization name</label>
                        <input id="organization-name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="Your organization" required />
                      </div>
                    )}
                    {errors.email && (
                      <small id="email-err" className="err" role="alert">
                        {errors.email}
                      </small>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="password">Password</label>
                    <div className={`control ${errors.password ? 'invalid' : ''}`}>
                      <i className="fa-solid fa-lock" aria-hidden="true" />
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'pw-err' : undefined}
                      />
                      <button
                        type="button"
                        className="pw-toggle"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        <i
                          className={showPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    {errors.password && (
                      <small id="pw-err" className="err" role="alert">
                        {errors.password}
                      </small>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="confirm">Confirm password</label>
                    <div className={`control ${errors.confirm ? 'invalid' : ''}`}>
                      <i className="fa-solid fa-lock" aria-hidden="true" />
                      <input
                        id="confirm"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        aria-invalid={Boolean(errors.confirm)}
                        aria-describedby={errors.confirm ? 'confirm-err' : undefined}
                      />
                    </div>
                    {errors.confirm && (
                      <small id="confirm-err" className="err" role="alert">
                        {errors.confirm}
                      </small>
                    )}
                  </div>

                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span className="checkmark" aria-hidden="true">
                      {agree && <i className="fa-solid fa-check" />}
                    </span>
                    I agree to the Terms &amp; Privacy Policy
                  </label>
                  {errors.agree && (
                    <small className="err agree-err" role="alert">
                      {errors.agree}
                    </small>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg btn-full"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <>
                        <span className="spinner" aria-hidden="true" /> Creating account…
                      </>
                    ) : (
                      <>Create Account →</>
                    )}
                  </button>
                </form>

                {verifyError && (
                  <p className="err signin-err" role="alert">
                    {verifyError}
                  </p>
                )}

                <p className="signup">
                  Already have an account? <a href="/login/">Sign in →</a>
                </p>
              </>
            )}

            <ul className="login-trust">
              <li>
                <i className="fa-solid fa-leaf" aria-hidden="true" /> Inclusive livelihoods
              </li>
              <li>
                <i className="fa-solid fa-handshake" aria-hidden="true" /> Citizens · Employers · Partners
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <Logo tagline="Building Skills. Empowering Futures" />
          <p>© 2026 Hunar Vikas India — India pilot</p>
          <p>
            <a href="mailto:hello@hunarvikas.in">hello@hunarvikas.in</a>
          </p>
        </div>
      </footer>
    </>
  )
}