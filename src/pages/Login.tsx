
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Fingerprint, Lock, AlertCircle, Key, CheckCircle, Send, ArrowRight, ShieldCheck } from 'lucide-react';
import { ShootingStars } from '../components/Effects';
import logo from '../assets/logo.jpg';

export const Login = () => {
  const { login } = useUser();
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  // Password mode fields
  const [digitalIdOrEmail, setDigitalIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  // OTP mode fields
  const [fan, setFan] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'enter-fan' | 'enter-otp'>('enter-fan');
  const [otpSending, setOtpSending] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fan.trim()) { setError('Please enter your Fayda Alias Number.'); return; }
    setError(''); setOtpSending(true);
    // Simulate OTP send — backend will handle real dispatch
    await new Promise(r => setTimeout(r, 1200));
    setOtpSending(false);
    setOtpStep('enter-otp');
    setSuccess(`OTP sent to the contact linked with FAN: ${fan}`);
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Please enter the 6-digit OTP.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await login({ digitalIdOrEmail: fan, password: '', otp });
      if (result.success) navigate(result.redirect || '/');
      else setError(result.error || 'Invalid OTP. Please try again.');
    } catch { setError('An error occurred. Please try again.'); }
    finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await login({ digitalIdOrEmail, password, otp: '' });
      if (result.success) navigate(result.redirect || '/');
      else setError(result.error || 'Invalid credentials.');
    } catch { setError('An error occurred during login.'); }
    finally { setLoading(false); }
  };

  const resetOtp = () => { setOtpStep('enter-fan'); setFan(''); setOtp(''); setSuccess(''); setError(''); };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <ShootingStars />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="p-2 bg-white dark:bg-slate-900 rounded-3xl shadow-xl floating">
              <img src={logo} alt="Abdi Adama School" className="w-24 h-24 rounded-2xl object-cover" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {loginMode === 'otp' ? 'Sign in with your Fayda ID (FAN) + OTP' : 'Access the Abdi Adama School Ecosystem'}
          </p>
        </div>

        <div className="card p-8">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-8">
            <button
              onClick={() => { setLoginMode('password'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${loginMode === 'password' ? 'bg-white dark:bg-slate-700 text-school-primary shadow-sm' : 'text-slate-500'}`}
            >
              Password
            </button>
            <button
              onClick={() => { setLoginMode('otp'); setError(''); setSuccess(''); resetOtp(); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${loginMode === 'otp' ? 'bg-white dark:bg-slate-700 text-school-primary shadow-sm' : 'text-slate-500'}`}
            >
              OTP (Fayda)
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm mb-6">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm mb-6">
              <CheckCircle size={18} className="shrink-0" /> {success}
            </div>
          )}

          {/* ── PASSWORD MODE ── */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Digital ID / Email</label>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text" required value={digitalIdOrEmail}
                    onChange={e => setDigitalIdOrEmail(e.target.value)}
                    placeholder="e.g. SA-1001 or email@school.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-school-primary focus:ring-4 focus:ring-school-primary/10 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="password" required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-school-primary focus:ring-4 focus:ring-school-primary/10 transition-all outline-none"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-school-primary hover:bg-school-primary/90 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-school-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={20} /> Sign In Securely</>}
              </button>
            </form>
          )}

          {/* ── OTP MODE ── */}
          {loginMode === 'otp' && (
            <div className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${otpStep === 'enter-fan' ? 'bg-school-primary text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                  {otpStep === 'enter-otp' ? <CheckCircle size={16} /> : '1'}
                </div>
                <div className={`flex-1 h-1 rounded-full transition-all ${otpStep === 'enter-otp' ? 'bg-school-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${otpStep === 'enter-otp' ? 'bg-school-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>2</div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {otpStep === 'enter-fan' ? 'Enter FAN' : 'Enter OTP'}
                </span>
              </div>

              {/* Step 1: Enter FAN */}
              {otpStep === 'enter-fan' && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Fayda Alias Number (FAN)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text" required value={fan}
                        onChange={e => setFan(e.target.value)}
                        placeholder="e.g. FAN-12345678"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-school-primary focus:ring-4 focus:ring-school-primary/10 transition-all outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 ml-1">Your alias number from the Ethiopia Digital ID (Fayda) system</p>
                  </div>
                  <button
                    type="submit" disabled={otpSending}
                    className="w-full bg-school-primary hover:bg-school-primary/90 text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-school-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {otpSending ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={18} /> Send OTP Code</>}
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {otpStep === 'enter-otp' && (
                <form onSubmit={handleOtpVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">6-Digit OTP Code</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="text" required maxLength={6} value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="● ● ● ● ● ●"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-school-primary focus:ring-4 focus:ring-school-primary/10 transition-all outline-none text-2xl tracking-[0.5em] font-black text-center"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 ml-1">Enter the 6-digit code sent to your registered contact</p>
                  </div>
                  <button
                    type="submit" disabled={loading || otp.length < 6}
                    className="w-full bg-school-primary hover:bg-school-primary/90 text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-school-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRight size={18} /> Verify & Sign In</>}
                  </button>
                  <button type="button" onClick={resetOtp} className="w-full text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2 transition-colors">
                    ← Use a different FAN
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer link */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              New student?{' '}
              <Link to="/" className="text-school-primary font-bold hover:underline">
                Apply for Admission
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-slate-400 hover:text-school-primary text-sm font-medium transition-colors">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
