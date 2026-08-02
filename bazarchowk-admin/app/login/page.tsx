"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) verifyAndLogin(token);
  }, [searchParams]);

  const verifyAndLogin = async (token: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await res.json();
      const role = profile.role?.name || '';
      if (!['ADMIN', 'SUPER_ADMIN', 'DISTRICT_ADMIN', 'MARKET_ADMIN'].includes(role)) {
        throw new Error(`Access Denied: role '${role}' has no admin privileges.`);
      }
      localStorage.setItem('admin_token', token);
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid email or password.');
      const data = await res.json();
      verifyAndLogin(data.accessToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
    window.location.href = `${api}/auth/google/admin`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          background: #f7f8fa;
        }

        /* ── Left branding panel ── */
        .left {
          flex: 1;
          background: linear-gradient(160deg, #ffffff 0%, #fef6ec 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 80px 60px;
          position: relative;
          border-right: 1px solid #f0ede8;
          overflow: hidden;
        }

        /* Subtle background circles */
        .left::before {
          content: '';
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,93,4,0.06) 0%, transparent 70%);
          top: -200px; right: -200px;
          pointer-events: none;
        }
        .left::after {
          content: '';
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,93,4,0.05) 0%, transparent 70%);
          bottom: -100px; left: -100px;
          pointer-events: none;
        }

        .logo {
          width: 200px;
          height: auto;
          object-fit: contain;
          margin-bottom: 44px;
          position: relative;
          z-index: 1;
        }

        .headline {
          font-size: 36px;
          font-weight: 800;
          color: #1a1a1a;
          text-align: center;
          line-height: 1.25;
          letter-spacing: -0.8px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .headline span {
          background: linear-gradient(135deg, #e85d04, #f48c06);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtext {
          font-size: 15px;
          color: #888;
          text-align: center;
          line-height: 1.7;
          max-width: 320px;
          margin-bottom: 52px;
          position: relative;
          z-index: 1;
        }

        .pills-hidden {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .pill {
          background: #fff;
          border: 1px solid #ece9e4;
          border-radius: 100px;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 600;
          color: #555;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .pill-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #e85d04;
          flex-shrink: 0;
        }

        /* ── Right form panel ── */
        .right {
          width: 460px;
          flex-shrink: 0;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          box-shadow: -4px 0 40px rgba(0,0,0,0.04);
        }

        .form-box {
          width: 100%;
          max-width: 360px;
          animation: fadeUp 0.5s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Header */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff7f0;
          border: 1px solid #fddbb4;
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #e85d04;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 20px;
        }
        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #e85d04;
          animation: blink 1.4s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        .form-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .form-desc {
          font-size: 13.5px;
          color: #999;
          margin-bottom: 30px;
          line-height: 1.6;
        }

        /* Error */
        .error {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          color: #c53030;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          animation: shake 0.35s ease;
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-5px)}
          75%{transform:translateX(5px)}
        }

        /* Fields */
        .field { margin-bottom: 16px; }
        .label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #444;
          margin-bottom: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-wrap { position: relative; }
        .icon {
          position: absolute;
          left: 13px; top: 50%;
          transform: translateY(-50%);
          width: 17px; height: 17px;
          color: #ccc;
          pointer-events: none;
        }
        input[type="email"],
        input[type="password"],
        input[type="text"] {
          width: 100%;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          padding: 12px 12px 12px 40px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #111;
          background: #fdfdfd;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          -webkit-appearance: none;
        }
        input:focus {
          border-color: #e85d04;
          box-shadow: 0 0 0 3px rgba(232,93,4,0.10);
          background: #fff;
        }
        input::placeholder { color: #c8c8c8; }
        .toggle-btn {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #ccc;
          padding: 0;
          display: flex;
          transition: color 0.15s;
        }
        .toggle-btn:hover { color: #888; }

        /* Primary button */
        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #e85d04 0%, #f48c06 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          margin-top: 6px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.1px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(232,93,4,0.35);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 22px 0;
        }
        .div-line { flex:1; height:1px; background:#f0f0f0; }
        .div-text { font-size: 12px; color: #bbb; font-weight: 500; }

        /* Google button */
        .btn-google {
          width: 100%;
          background: #fff;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          padding: 12px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: all 0.2s ease;
        }
        .btn-google:hover:not(:disabled) {
          background: #fafafa;
          border-color: #d4d4d4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .btn-google:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Spinner */
        .spin {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spinning 0.65s linear infinite;
          vertical-align: middle;
        }
        .spin-dark {
          border-color: rgba(0,0,0,0.1);
          border-top-color: #666;
        }
        @keyframes spinning { to{transform:rotate(360deg)} }

        /* Footer */
        .footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11.5px;
          color: #ccc;
          line-height: 1.8;
        }
        .footer strong { color: #aaa; font-weight: 600; }

        /* Responsive */
        @media (max-width: 860px) {
          .left { display: none; }
          .right { width: 100%; box-shadow: none; padding: 48px 28px; }
        }
      `}</style>

      <div className="root">

        {/* ─── Left Branding ─── */}
        <div className="left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BazarChowk Logo" className="logo" />

          <h1 className="headline">
            The Command Center<br />for <span>BazarChowk</span>
          </h1>
          <p className="subtext">
            Manage markets, riders, shops, orders, and settlements for your entire region — all in one place.
          </p>

          <div style={{display:'none'}}>
            <div className="pill"><span className="pill-dot" />50+ Modules</div>
            <div className="pill"><span className="pill-dot" />Live Real-Time</div>
            <div className="pill"><span className="pill-dot" />RBAC Secured</div>
            <div className="pill"><span className="pill-dot" />Veritasco</div>
          </div>
        </div>

        {/* ─── Right Form ─── */}
        <div className="right">
          <div className="form-box">

            <div style={{display:'none'}}>
              <span className="badge-dot" />
              Secure Admin Portal
            </div>

            <h2 className="form-title">Welcome back, Admin</h2>
            <p className="form-desc">Sign in to manage your region's operations.</p>

            {errorMsg && (
              <div className="error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="field">
                <label className="label">Admin Email</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@bazarchowk.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Password</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" className="toggle-btn" onClick={() => setShowPassword(v => !v)}>
                    {showPassword
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? <><span className="spin" style={{marginRight:8}} />Authenticating…</>
                  : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="divider">
              <div className="div-line" /><span className="div-text">or</span><div className="div-line" />
            </div>

            <button className="btn-google" onClick={handleGoogle} disabled={loading || googleLoading}>
              {googleLoading
                ? <span className="spin spin-dark" />
                : <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
              }
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div style={{display:'none'}}>
              <strong>BazarChowk Admin Portal</strong><br />
              A Product of Veritasco · Restricted Access Only
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
