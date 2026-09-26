import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useSearch } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, FilePlus2, Flag, HeartHandshake, Inbox, KeyRound, LayoutDashboard,
  LifeBuoy, LogOut, MapPin, Menu, MessageCircle, Moon, Pencil, Plus, Search, Send, ShieldCheck,
  Sparkles, Sun, Trash2, UsersRound,
  X, Zap
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getGetWorkspaceSummaryQueryKey,
  getListConversationsQueryKey, getListMatchesQueryKey, getListMessagesQueryKey,
  getListReportsQueryKey,
  useCreateReport, useDeleteReport, useGetActivity, useGetCurrentUser, useGetWorkspaceSummary, useListConversations,
  useListMatches, useListMessages, useListNotifications, useListRecoveryCases, useListReports,
  useLogin, useLogout, useRegister, useRespondToMatch, useSendMessage
} from '@workspace/api-client-react';
import './index.css';

const queryClient = new QueryClient();
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong.');
  return payload;
}
const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/matches', label: 'Potential matches', icon: Sparkles },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/recovery', label: 'Recovery', icon: HeartHandshake },
];

function Logo({ light = false }) {
  return <Link href="/" className={`flex items-center gap-2.5 ${light ? 'text-sidebar-foreground' : 'text-foreground'}`} data-testid="link-logo">
    <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-sm"><span className="text-lg font-bold">T</span></span>
    <span className="font-serif text-[1.35rem] font-semibold tracking-[-.04em]">TraceBack</span>
  </Link>;
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:brightness-110 shadow-sm',
    soft: 'bg-secondary text-secondary-foreground hover:bg-muted',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    accent: 'bg-accent text-accent-foreground hover:brightness-105',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-110',
  };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

function Field({ label, hint, ...props }) {
  return <label className="grid gap-2 text-sm font-semibold text-foreground">
    <span>{label}</span>
    <input className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" {...props} />
    {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
  </label>;
}

function TextField({ label, ...props }) {
  return <label className="grid gap-2 text-sm font-semibold text-foreground">
    <span>{label}</span>
    <textarea className="min-h-28 resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" {...props} />
  </label>;
}

function SelectField({ label, children, ...props }) {
  return <label className="grid gap-2 text-sm font-semibold text-foreground">
    <span>{label}</span>
    <select className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" {...props}>{children}</select>
  </label>;
}

function StatusPill({ status }) {
  const map = { active: 'bg-primary/10 text-primary', matched: 'bg-accent/15 text-[#9a4a24] dark:text-accent', recovered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', archived: 'bg-muted text-muted-foreground', pending: 'bg-accent/15 text-[#9a4a24] dark:text-accent', interested: 'bg-primary/10 text-primary', declined: 'bg-muted text-muted-foreground', potential: 'bg-accent/15 text-[#9a4a24] dark:text-accent', verification: 'bg-primary/10 text-primary', scheduled: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', disputed: 'bg-destructive/10 text-destructive', closed: 'bg-muted text-muted-foreground' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${map[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
    <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon size={22} /></span>
    <h3 className="font-serif text-xl font-semibold">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

function LoadingRows({ count = 3 }) {
  return <div className="space-y-3" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
  </div>;
}

function ErrorState({ retry }) {
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
    <CircleHelp className="mx-auto text-destructive" size={25} />
    <h3 className="mt-3 font-semibold">We couldn't load this yet</h3>
    <p className="mt-1 text-sm text-muted-foreground">Your privacy is intact. Try again in a moment.</p>
    <Button variant="outline" className="mt-4" onClick={retry} data-testid="button-retry">Try again</Button>
  </div>;
}

function PublicNav() {
  return <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
    <Logo />
    <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
      <a href="#how" className="transition hover:text-foreground" data-testid="link-how-it-works">How it works</a>
      <a href="#privacy" className="transition hover:text-foreground" data-testid="link-privacy">Privacy</a>
      <Link href="/login" className="text-foreground hover:text-primary" data-testid="link-login-nav">Sign in</Link>
    </nav>
    <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110" data-testid="link-create-account">Create account <ArrowRight size={15} /></Link>
  </header>;
}

function Landing() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiRequest('/api/public/stats').then(setStats).catch(() => {});
  }, []);
  return <div className="noise min-h-[100dvh] overflow-hidden bg-background">
    <PublicNav />
    <main>
      <section className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:items-center md:pb-28 md:pt-24">
        <div className="relative z-10 rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-primary"><ShieldCheck size={14} /> Private by design</div>
          <h1 className="max-w-xl font-serif text-[clamp(3.25rem,7vw,6.2rem)] font-semibold leading-[.96] tracking-[-.065em] text-foreground">The way back<br /><em className="font-normal text-primary">starts here.</em></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">TraceBack connects lost things with the people who can return them — without putting anyone's private details on display.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110" data-testid="link-start-report">Start a report <ArrowRight size={17} /></Link>
            <Link href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground hover:bg-muted" data-testid="link-search-reports">Search public reports <Search size={16} /></Link>
          </div>
           <div className="mt-9 flex items-center gap-3 text-xs text-muted-foreground"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-accent/30 text-primary"><UsersRound size={13} /></span><span>Built for neighbors, teams, and good outcomes.</span></div>
        </div>
        <div className="relative rise delay-2">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative rounded-[2rem] border border-border bg-card p-3 shadow-[0_22px_80px_-35px_hsl(var(--primary)/.35)]">
            <div className="rounded-[1.55rem] bg-[#e7eee8] p-5 dark:bg-[#1d302d] sm:p-7">
              <div className="flex items-center justify-between border-b border-primary/10 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary/70">Recovery signal</p><p className="mt-1 font-serif text-2xl font-semibold text-[#193b39] dark:text-[#dce9dd]">A path is forming</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Zap size={18} /></span></div>
              <div className="relative my-7 pl-8"><span className="absolute bottom-5 left-[7px] top-4 border-l border-dashed border-primary/40" />
                {[['Report shared', 'Your details stay private', CheckCircle2], ['Possible match', 'Two attributes align', Sparkles], ['Next step', 'Start a secure conversation', MessageCircle]].map(([a, b, I], i) => <div className="relative mb-5 flex items-start gap-3 last:mb-0" key={a}><span className={`absolute -left-8 grid h-4 w-4 place-items-center rounded-full ${i === 2 ? 'bg-accent' : 'bg-primary'} text-primary-foreground`}><I size={10} /></span><div><p className="text-sm font-bold text-[#193b39] dark:text-[#dce9dd]">{a}</p><p className="mt-0.5 text-xs text-[#4a6a62] dark:text-[#9bbab0]">{b}</p></div></div>)}
              </div>
              <div className="rounded-xl border border-primary/10 bg-[#f4f8f1]/80 p-4 dark:bg-[#213b36]"><div className="flex items-center justify-between text-xs"><span className="font-bold text-[#193b39] dark:text-[#dce9dd]">Privacy shield</span><span className="font-mono text-primary">ACTIVE</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10"><div className="h-full w-[84%] rounded-full bg-accent" /></div></div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-foreground"><MapPin size={16} /></span><div><p className="text-xs font-bold">Details are blurred</p><p className="text-[11px] text-muted-foreground">Until both sides agree</p></div></div>
        </div>
      </section>
      <section id="how" className="border-y border-border bg-card/45"><div className="mx-auto max-w-6xl px-5 py-20 sm:px-8"><div className="max-w-xl"><p className="font-mono text-xs uppercase tracking-[.16em] text-primary">A softer kind of search</p><h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Uncertainty, made actionable.</h2></div><div className="mt-12 grid gap-8 md:grid-cols-3">{[['01', 'Name what went missing', 'A few useful details are enough. Keep sensitive identifiers to yourself until there is a reason to share them.'], ['02', 'Let the network look', 'TraceBack compares safe, shared attributes across community and organization reports.'], ['03', 'Choose the next step', 'You stay in control. Confirm a match, open a secure conversation, or close the loop.']].map(([n, t, b]) => <article key={n} className="border-t-2 border-primary/20 pt-4"><span className="font-mono text-xs text-accent">{n}</span><h3 className="mt-8 font-serif text-2xl font-semibold">{t}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{b}</p></article>)}</div></div></section>
       <section className="border-y border-border bg-card/45"><div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-12 sm:grid-cols-4 sm:px-8">{[['itemsReported', 'Items reported'], ['potentialMatches', 'Potential matches'], ['successfulRecoveries', 'Successful recoveries'], ['organizations', 'Organizations']].map(([key, label]) => <div key={key}><p className="font-mono text-3xl text-primary">{stats?.[key] ?? '—'}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>)}</div></section>
       <section id="privacy" className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:items-center"><div><div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent-foreground"><KeyRound size={28} /></div><h2 className="mt-7 max-w-sm font-serif text-4xl font-semibold leading-tight">Trust is not a feature. It is the foundation.</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-6"><ShieldCheck className="text-primary" size={22} /><h3 className="mt-5 font-semibold">Private until useful</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Public search shows only what helps someone recognize a report. Contact details never appear in results.</p></div><div className="rounded-2xl border border-border bg-card p-6"><UsersRound className="text-primary" size={22} /><h3 className="mt-5 font-semibold">Human decisions</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">A potential match is a prompt to review, never an automatic claim about who owns what.</p></div></div></section>
      <section className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 px-5 py-14 sm:px-8 md:flex-row md:items-center"><div><p className="font-mono text-xs uppercase tracking-[.16em] text-primary-foreground/65">Ready when you are</p><h2 className="mt-2 font-serif text-3xl font-semibold">Bring something back to its person.</h2></div><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-bold text-accent-foreground hover:brightness-105" data-testid="link-cta-register">Create your free account <ArrowRight size={16} /></Link></div></section>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><Logo /><span>TraceBack · A more thoughtful way home.</span></footer>
  </div>;
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const mutation = isRegister ? register : login;
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault(); setError('');
    const data = isRegister ? form : { email: form.email, password: form.password };
    mutation.mutate({ data }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); setLocation('/dashboard'); }, onError: () => setError('That did not work. Check your details and try again.') });
  };
  return <div className="noise grid min-h-[100dvh] bg-background lg:grid-cols-[.9fr_1.1fr]">
    <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex"><div><Logo light /><div className="mt-24 max-w-md"><p className="font-mono text-xs uppercase tracking-[.16em] text-accent">A private route home</p><h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-tight">Good things find their way back.</h1><p className="mt-6 text-base leading-7 text-sidebar-foreground/65">A calm place to report, search, and coordinate — without turning a personal moment into public information.</p></div></div><div className="flex items-center gap-2 text-xs text-sidebar-foreground/50"><ShieldCheck size={14} /> Privacy-first by default</div></div>
     <div className="flex flex-col px-5 py-6 sm:px-10"><div className="lg:hidden"><Logo /></div><div className="mx-auto flex w-full max-w-md flex-1 items-center"><div className="w-full py-12"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-home"><ArrowLeft size={15} /> Back to TraceBack</Link><h2 className="font-serif text-4xl font-semibold tracking-tight">{isRegister ? 'Make a little room for good news.' : 'Welcome back.'}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{isRegister ? 'Create a private account to start a report or help someone find theirs.' : 'Sign in to see your reports, conversations, and recovery path.'}</p>{error && <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>}<form onSubmit={submit} className="mt-8 grid gap-5">{isRegister && <Field label="Your name" autoComplete="name" placeholder="How should we call you?" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required data-testid="input-name" />}<Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required data-testid="input-email" /><Field label="Password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} minLength={isRegister ? 8 : undefined} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required data-testid="input-password" />{!isRegister && <div className="flex justify-end"><Link href="/reset-password" className="text-xs font-bold text-primary hover:underline" data-testid="button-forgot-password">Forgot password?</Link></div>}<Button type="submit" className="mt-1 h-12 w-full" disabled={mutation.isPending} data-testid="button-submit-auth">{mutation.isPending ? 'Working…' : isRegister ? 'Create my account' : 'Sign in'} <ArrowRight size={16} /></Button></form><p className="mt-8 text-center text-sm text-muted-foreground">{isRegister ? 'Already have an account?' : 'New to TraceBack?'} <Link href={isRegister ? '/login' : '/register'} className="font-bold text-primary hover:underline" data-testid="link-switch-auth">{isRegister ? 'Sign in' : 'Create an account'}</Link></p></div></div><div className="border-t border-border pt-5 text-center text-xs text-muted-foreground">Your information is only used to help coordinate a return.</div></div>
  </div>;
}

function ResetPassword() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submitRequest = async (event) => {
    event.preventDefault(); setError('');
    try {
      const result = await apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(result.previewToken ? `Preview reset token: ${result.previewToken}` : result.message);
      if (result.previewToken) setToken(result.previewToken);
      setStep('reset');
    } catch (err) { setError(err.message); }
  };
  const submitReset = async (event) => {
    event.preventDefault(); setError('');
    try {
      const result = await apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      setMessage(result.message); setStep('done');
    } catch (err) { setError(err.message); }
  };
  return <div className="noise grid min-h-[100dvh] place-items-center bg-background px-5 py-10"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Back to sign in</Link><h1 className="mt-10 font-serif text-4xl font-semibold">Reset your password.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use the email on your account. In a live setup, the reset link is sent privately.</p>{message && <p className="mt-5 rounded-xl bg-secondary p-3 text-sm leading-6 text-foreground">{message}</p>}{error && <p className="mt-5 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}{step === 'request' && <form onSubmit={submitRequest} className="mt-7 grid gap-5"><Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /><Button type="submit">Create reset instructions <ArrowRight size={16} /></Button></form>}{step === 'reset' && <form onSubmit={submitReset} className="mt-7 grid gap-5"><Field label="Reset token" value={token} onChange={e => setToken(e.target.value)} required placeholder="Paste your reset token" /><Field label="New password" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters" /><Button type="submit">Update password <Check size={16} /></Button></form>}{step === 'done' && <Link href="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Return to sign in <ArrowRight size={16} /></Link>}</div></div>;
}

function Shell({ children }) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('traceback-theme') === 'dark');
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  const initials = (user?.name || 'You').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('traceback-theme', next ? 'dark' : 'light'); };
  const go = (href) => { setMobile(false); setLocation(href); };
  return <div className="min-h-[100dvh] bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col bg-sidebar text-sidebar-foreground lg:flex"><div className="px-6 pb-6 pt-7"><Logo light /></div><div className="px-4"><p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Workspace</p>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} />{label}{href === '/messages' && <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground">new</span>}</Link>)}</div><div className="mt-auto border-t border-sidebar-border p-4"><Link href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-sidebar-accent" data-testid="link-profile-sidebar"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{user?.name || 'Your profile'}</span><span className="block truncate text-xs text-sidebar-foreground/50">{user?.email || 'Account settings'}</span></span></Link><div className="mt-3 flex gap-1"><button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-toggle-theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/') })} className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-logout"><LogOut size={16} /></button></div></div></aside>
    {mobile && <div className="fixed inset-0 z-30 bg-foreground/25 lg:hidden" onClick={() => setMobile(false)} />}
    <div className="lg:pl-[250px]"><header className="sticky top-0 z-20 flex h-[73px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur sm:px-8"><button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card lg:hidden" onClick={() => setMobile(true)} data-testid="button-open-menu"><Menu size={19} /></button><div className="hidden lg:block"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Private workspace</p><p className="mt-0.5 text-sm font-bold">Move from unsure to sure</p></div><div className="ml-auto flex items-center gap-2"><Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" data-testid="link-notifications"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" /></Link><Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-bold text-primary lg:hidden" data-testid="link-profile-mobile">{initials}</Link></div></header><main className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 sm:py-10">{children}</main></div>
    {mobile && <aside className="fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-sidebar p-5 text-sidebar-foreground lg:hidden"><div className="flex items-center justify-between"><Logo light /><button onClick={() => setMobile(false)} className="text-sidebar-foreground/60" data-testid="button-close-menu"><X size={19} /></button></div><div className="mt-10">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobile(false)} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/75 hover:bg-sidebar-accent" data-testid={`link-mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} />{label}</Link>)}</div><div className="mt-auto"><Link href="/profile" onClick={() => setMobile(false)} className="flex items-center gap-3 rounded-xl px-3 py-3" data-testid="link-mobile-profile"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials}</span><span className="text-sm font-bold">{user?.name || 'Your profile'}</span></Link></div></aside>}
  </div>;
}

function PageHeader({ eyebrow, title, body, action }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">{eyebrow}</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{title}</h1>{body && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{body}</p>}</div>{action}</div>;
}

function Dashboard() {
  const { data: summary, isLoading, isError, refetch } = useGetWorkspaceSummary();
  const { data: activity } = useGetActivity();
  const counts = summary || { lost: 0, found: 0, matches: 0, activeCases: 0, recovered: 0, unreadNotifications: 0 };
  return <><PageHeader eyebrow="Overview" title="A clear place to start." body="Keep the signal close, the details private, and the next step visible." action={<Link href="/reports/new?type=lost" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110" data-testid="link-new-report-dashboard"><Plus size={16} /> New report</Link>} />{isError ? <ErrorState retry={refetch} /> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['lost', 'Things you lost', Flag, '/reports'], ['found', 'Things you found', Search, '/reports'], ['matches', 'Potential matches', Sparkles, '/matches'], ['activeCases', 'Recovery in motion', HeartHandshake, '/recovery']].map(([key, label, Icon, href], i) => <Link href={href} key={key} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-summary-${key}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${i === 2 ? 'bg-accent/15 text-accent-foreground' : 'bg-secondary text-primary'}`}><Icon size={19} /></span><ChevronRight className="text-muted-foreground transition group-hover:translate-x-1" size={17} /></div><p className="mt-6 font-mono text-3xl font-medium">{isLoading ? '—' : counts[key]}</p><p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p></Link>)}</div><div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Your next move</p><h2 className="mt-2 font-serif text-2xl font-semibold">The recovery desk</h2></div><LifeBuoy className="text-accent" size={24} /></div>{counts.lost + counts.found === 0 ? <div className="mt-6 rounded-xl bg-secondary/60 p-5"><p className="font-semibold">Nothing here yet — and that is okay.</p><p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">Start with a report. You can add only what feels useful, then change or archive it anytime.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/reports/new?type=lost" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground" data-testid="link-report-lost"><FilePlus2 size={14} /> I lost something</Link><Link href="/reports/new?type=found" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-bold" data-testid="link-report-found"><HeartHandshake size={14} /> I found something</Link></div></div> : <div className="mt-6 flex items-center gap-4 rounded-xl bg-secondary/60 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Check size={19} /></span><div><p className="font-semibold">Your reports are being watched.</p><p className="text-sm text-muted-foreground">We will surface useful signals here as they arrive.</p></div></div>}</section><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Recent activity</p><h2 className="mt-2 font-serif text-2xl font-semibold">The thread</h2></div><Clock3 className="text-muted-foreground" size={20} /></div>{!activity?.length ? <p className="mt-8 text-sm leading-6 text-muted-foreground">Actions you take will appear here, in plain language.</p> : <div className="mt-5 space-y-4">{activity.slice(0, 4).map(item => <div className="flex gap-3" key={item.id} data-testid={`activity-${item.id}`}><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p></div></div>)}</div>}</section></div></>}</>;
}

function ReportCard({ report, onDelete }) {
  return <article className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-md" data-testid={`card-report-${report.id}`}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 font-mono text-[10px] font-medium uppercase ${report.type === 'lost' ? 'bg-accent/15 text-[#9a4a24] dark:text-accent' : 'bg-primary/10 text-primary'}`}>{report.type}</span><StatusPill status={report.status} /></div>{report.isMine && <button onClick={() => onDelete(report)} className="rounded-lg p-1.5 text-muted-foreground opacity-60 hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100" data-testid={`button-delete-report-${report.id}`} aria-label={`Delete ${report.title}`}><Trash2 size={15} /></button>}</div><h3 className="mt-5 font-serif text-xl font-semibold">{report.title}</h3><p className="mt-1 text-sm text-muted-foreground">{report.category}{report.color ? ` · ${report.color}` : ''}{report.brand ? ` · ${report.brand}` : ''}</p><div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin size={13} />{report.area}</span>{report.date && <span className="flex items-center gap-1"><CalendarDays size={13} />{report.date}</span>}</div><p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{report.description}</p></article>;
}

function Reports() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const params = useMemo(() => ({ search: search || undefined, type: type || undefined }), [search, type]);
  const { data: reports, isLoading, isError, refetch } = useListReports(params);
  const del = useDeleteReport();
  const remove = (report) => { if (window.confirm(`Remove “${report.title}” from your reports?`)) { del.mutate({ id: report.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey(params) }); queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() }); } }); } };
  return <><PageHeader eyebrow="Reports" title="The report room." body="Manage your own reports or search the public-safe network for a useful signal." action={<Link href="/reports/new?type=lost" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110" data-testid="link-new-report"><Plus size={16} /> New report</Link>} /><div className="mb-7 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="relative"><Search className="absolute left-3.5 top-3.5 text-muted-foreground" size={17} /><input value={search} onChange={e => setSearch(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Search by item, area, or category" data-testid="input-search-reports" /></label><SelectField label="" value={type} onChange={e => setType(e.target.value)} data-testid="select-report-type"><option value="">All report types</option><option value="lost">Lost items</option><option value="found">Found items</option></SelectField></div>{isError ? <ErrorState retry={refetch} /> : isLoading ? <LoadingRows count={4} /> : !reports?.length ? <EmptyState icon={Search} title="No reports in view" body={search ? 'Try a broader search or remove a filter.' : 'Public-safe reports will appear here. Start by telling the network what happened.'} action={<Link href="/reports/new?type=lost" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground" data-testid="link-empty-report"><Plus size={14} /> Create a report</Link>} /> : <div className="grid gap-4 md:grid-cols-2">{reports.map(report => <ReportCard key={report.id} report={report} onDelete={remove} />)}</div>}</>;
}

function NewReport() {
  const search = useSearch(); const [, setLocation] = useLocation();
  const typeFromUrl = new URLSearchParams(search).get('type') === 'found' ? 'found' : 'lost';
  const create = useCreateReport();
  const [form, setForm] = useState({ type: typeFromUrl, title: '', category: '', description: '', brand: '', color: '', area: '', date: '', time: '', privateDetails: '' });
  const [error, setError] = useState('');
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = e => { e.preventDefault(); setError(''); const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')); create.mutate({ data: payload }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() }); setLocation('/reports'); }, onError: () => setError('We could not save this report. Check the required details and try again.') }); };
  return <div className="mx-auto max-w-3xl"><Link href="/reports" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-reports"><ArrowLeft size={15} /> Back to reports</Link><PageHeader eyebrow="New report" title={form.type === 'lost' ? 'Tell us what went missing.' : 'Tell us what you found.'} body="Keep identifying details private. You can share them later if a conversation becomes useful." /><form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 sm:p-8"><div className="mb-8 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1.5"><button type="button" onClick={() => update('type', 'lost')} className={`rounded-lg py-2.5 text-sm font-bold ${form.type === 'lost' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} data-testid="button-type-lost">I lost something</button><button type="button" onClick={() => update('type', 'found')} className={`rounded-lg py-2.5 text-sm font-bold ${form.type === 'found' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`} data-testid="button-type-found">I found something</button></div>{error && <p className="mb-5 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="What should we call it?" placeholder="A short, recognizable title" value={form.title} onChange={e => update('title', e.target.value)} required minLength={2} data-testid="input-report-title" /></div><SelectField label="Category" value={form.category} onChange={e => update('category', e.target.value)} required data-testid="select-report-category"><option value="">Choose a category</option><option>Bag or wallet</option><option>Keys</option><option>Electronics</option><option>Clothing</option><option>Document</option><option>Other</option></SelectField><Field label="Color" placeholder="For example, navy" value={form.color} onChange={e => update('color', e.target.value)} data-testid="input-report-color" /><Field label="Brand" placeholder="If useful" value={form.brand} onChange={e => update('brand', e.target.value)} data-testid="input-report-brand" /><Field label="Where was it seen?" placeholder="Neighborhood, venue, or transit line" value={form.area} onChange={e => update('area', e.target.value)} required data-testid="input-report-area" /><Field label="Date" type="date" value={form.date} onChange={e => update('date', e.target.value)} data-testid="input-report-date" /><Field label="Approximate time" type="time" value={form.time} onChange={e => update('time', e.target.value)} data-testid="input-report-time" /><div className="sm:col-span-2"><TextField label="What is safe to share publicly?" placeholder="Describe visible, non-identifying details…" value={form.description} onChange={e => update('description', e.target.value)} required data-testid="textarea-report-description" /></div><div className="sm:col-span-2"><TextField label="Private details (optional)" hint="Only shown in authorized review. Consider a serial number, unique mark, or contents." placeholder="Keep this for verification later" value={form.privateDetails} onChange={e => update('privateDetails', e.target.value)} data-testid="textarea-report-private" /></div></div><div className="mt-8 flex flex-col-reverse justify-end gap-3 border-t border-border pt-6 sm:flex-row"><Link href="/reports" className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="link-cancel-report">Cancel</Link><Button type="submit" disabled={create.isPending} data-testid="button-submit-report">{create.isPending ? 'Saving…' : 'Publish private-safe report'} <ArrowRight size={16} /></Button></div></form></div>;
}

function Matches() {
  const { data: matches, isLoading, isError, refetch } = useListMatches();
  const respond = useRespondToMatch();
  const answer = (id, response) => respond.mutate({ id, data: { response } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() }) });
  return <><PageHeader eyebrow="Potential matches" title="Signals worth a look." body="These are suggestions, not claims. Review shared attributes and decide what feels right." />{isError ? <ErrorState retry={refetch} /> : isLoading ? <LoadingRows count={3} /> : !matches?.length ? <EmptyState icon={Sparkles} title="No signals yet" body="When the network finds a meaningful overlap, it will appear here. Keep your reports current and we will do the watching." action={<Link href="/reports/new?type=lost" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-bold" data-testid="link-empty-match">Review your reports <ArrowRight size={14} /></Link>} /> : <div className="space-y-4">{matches.map(match => <article key={match.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid={`card-match-${match.id}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-foreground"><Sparkles size={20} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-semibold">{match.report?.title || 'A possible match'}</h3><StatusPill status={match.status} /></div><p className="mt-1 text-sm text-muted-foreground">Shared with your report · {match.report?.area || 'area withheld'}</p></div></div><div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2"><span className="font-mono text-lg font-medium text-primary">{Math.round(match.score > 1 ? match.score : match.score * 100)}%</span><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">signal</span></div></div><div className="mt-5 flex flex-wrap gap-2">{(match.sharedAttributes || []).map(attribute => <span key={attribute} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold">{attribute}</span>)}</div>{match.status === 'pending' && <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5"><Button variant="primary" onClick={() => answer(match.id, 'interested')} disabled={respond.isPending} data-testid={`button-match-interested-${match.id}`}><Check size={15} /> Worth exploring</Button><Button variant="outline" onClick={() => answer(match.id, 'declined')} disabled={respond.isPending} data-testid={`button-match-decline-${match.id}`}><X size={15} /> Not this one</Button></div>}</article>)}</div>}</>;
}

function Messages() {
  const { data: conversations, isLoading, isError, refetch } = useListConversations();
  const { data: currentUser } = useGetCurrentUser();
  const [selected, setSelected] = useState(null);
  const { data: messages } = useListMessages(selected?.id || '', { query: { enabled: !!selected?.id, queryKey: getListMessagesQueryKey(selected?.id || '') } });
  const send = useSendMessage(); const [body, setBody] = useState('');
  const submit = e => { e.preventDefault(); if (!body.trim() || !selected) return; send.mutate({ id: selected.id, data: { body: body.trim() } }, { onSuccess: () => { setBody(''); queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selected.id) }); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); } }); };
  return <><PageHeader eyebrow="Secure conversations" title="Keep the thread human." body="No contact details are exposed. Share only what helps coordinate a safe handoff." />{isError ? <ErrorState retry={refetch} /> : isLoading ? <LoadingRows count={3} /> : !conversations?.length ? <EmptyState icon={MessageCircle} title="No conversations yet" body="When you and another person agree to explore a potential match, your secure conversation will appear here." /> : <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[280px_1fr]"><div className={`border-b border-border lg:border-b-0 lg:border-r ${selected ? 'hidden lg:block' : 'block'}`}><div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Inbox</p><p className="mt-1 text-sm font-semibold">{conversations.length} conversations</p></div>{conversations.map(conversation => <button key={conversation.id} onClick={() => setSelected(conversation)} className={`flex w-full gap-3 border-b border-border p-4 text-left transition hover:bg-muted ${selected?.id === conversation.id ? 'bg-secondary' : ''}`} data-testid={`button-conversation-${conversation.id}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{conversation.participantName?.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{conversation.subject}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{conversation.lastMessage}</span></span></button>)}</div><div className={`${selected ? 'block' : 'hidden lg:flex'} min-w-0 flex-col`}>{selected ? <><div className="flex items-center gap-3 border-b border-border p-4"><button className="lg:hidden" onClick={() => setSelected(null)} data-testid="button-back-inbox"><ArrowLeft size={18} /></button><span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{selected.participantName?.slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-bold">{selected.subject}</p><p className="text-xs text-muted-foreground">Private conversation with {selected.participantName}</p></div></div><div className="flex-1 space-y-3 overflow-y-auto bg-background/45 p-5">{!messages?.length ? <p className="py-16 text-center text-sm text-muted-foreground">Start with a kind, practical note.</p> : messages.map(message => { const mine = message.senderId === currentUser?.id || message.senderId === 'me'; return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary'}`} data-testid={`message-${message.id}`}>{message.body}</div></div>; })}</div><form onSubmit={submit} className="flex gap-2 border-t border-border p-4"><input value={body} onChange={e => setBody(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Write a thoughtful message…" data-testid="input-message" /><Button type="submit" disabled={!body.trim() || send.isPending} className="h-11 w-11 px-0" data-testid="button-send-message"><Send size={16} /></Button></form></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageCircle className="text-muted-foreground/50" size={30} /><p className="mt-4 font-serif text-xl font-semibold">Choose a conversation</p><p className="mt-2 text-sm text-muted-foreground">The details stay between the people involved.</p></div>}</div></div>}</>;
}

function Recovery() {
  const { data: cases, isLoading, isError, refetch } = useListRecoveryCases();
  const steps = ['potential', 'verification', 'scheduled', 'recovered'];
  return <><PageHeader eyebrow="Recovery cases" title="The way forward." body="A small timeline for the practical part: confirming, coordinating, and closing the loop." />{isError ? <ErrorState retry={refetch} /> : isLoading ? <LoadingRows count={3} /> : !cases?.length ? <EmptyState icon={HeartHandshake} title="No recovery cases yet" body="Cases begin when a potential match becomes a mutual decision to explore a return." action={<Link href="/matches" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground" data-testid="link-view-matches">View potential matches <ArrowRight size={14} /></Link>} /> : <div className="space-y-4">{cases.map(item => <article className="rounded-2xl border border-border bg-card p-5 sm:p-6" key={item.id} data-testid={`card-recovery-${item.id}`}><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">Case {item.id.slice(0, 7)}</p><h3 className="mt-2 font-serif text-2xl font-semibold">{item.title}</h3></div><StatusPill status={item.status} /></div><div className="mt-8 grid grid-cols-4 gap-1">{steps.map((step, i) => { const current = steps.indexOf(item.status); return <div key={step} className="relative"><div className={`h-1.5 rounded-full ${i <= current ? 'bg-primary' : 'bg-muted'}`} /><p className={`mt-2 text-[10px] font-bold capitalize ${i <= current ? 'text-primary' : 'text-muted-foreground'}`}>{step}</p></div>})}</div><p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={13} /> Updated {new Date(item.updatedAt).toLocaleDateString()}</p></article>)}</div>}</>;
}

function Notifications() {
  const { data: notifications, isLoading, isError, refetch } = useListNotifications();
  return <><PageHeader eyebrow="Notifications" title="Signals for you." body="Only activity connected to your reports and recovery cases appears here." />{isError ? <ErrorState retry={refetch} /> : isLoading ? <LoadingRows count={4} /> : !notifications?.length ? <EmptyState icon={Bell} title="You are all caught up" body="Useful updates about reports, matches, and recovery will land here." /> : <div className="max-w-2xl divide-y divide-border rounded-2xl border border-border bg-card">{notifications.map(item => <div key={item.id} className={`flex gap-4 p-5 ${!item.read ? 'bg-primary/[.035]' : ''}`} data-testid={`notification-${item.id}`}><span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.type === 'match' ? 'bg-accent/15 text-accent-foreground' : 'bg-secondary text-primary'}`}><Bell size={16} /></span><div className="min-w-0"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{item.title}</p>{!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p></div></div>)}</div>}</>;
}

function Profile() {
  const { data: user, isLoading } = useGetCurrentUser();
  const logout = useLogout(); const [, setLocation] = useLocation();
  const [name, setName] = useState(''); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);
  const save = async (event) => {
    event.preventDefault(); setSaved(false); setError('');
    try { await apiRequest('/api/profile', { method: 'PATCH', body: JSON.stringify({ name }) }); await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); setSaved(true); }
    catch (err) { setError(err.message); }
  };
  return <><PageHeader eyebrow="Account" title="Your profile." body="Keep the basics current. Your contact details are never part of public report search." /><div className="grid max-w-3xl gap-5"><section className="rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="flex items-center gap-4 border-b border-border pb-6"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 font-serif text-2xl font-semibold text-accent-foreground">{(user?.name || 'You').slice(0, 1).toUpperCase()}</span><div><h2 className="font-serif text-2xl font-semibold">{isLoading ? 'Loading…' : user?.name || 'Your name'}</h2><p className="mt-1 text-sm text-muted-foreground">{user?.role === 'organization' ? 'Organization account' : 'Personal account'}{user?.emailVerified ? ' · Email verified' : ' · Email verification pending'}</p></div></div><form onSubmit={save} className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Name" value={name} onChange={e => setName(e.target.value)} required minLength={2} data-testid="input-profile-name" /><Field label="Email address" value={user?.email || ''} readOnly data-testid="input-profile-email" /><div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-4"><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={14} /> Profile changes are protected by your account session.</p><Button type="submit" variant="outline" disabled={!name.trim() || name === user?.name} data-testid="button-edit-profile"><Pencil size={14} /> Save changes</Button></div>{saved && <p className="text-sm font-semibold text-primary">Your profile is up to date.</p>}{error && <p className="text-sm text-destructive">{error}</p>}</form></section><section className="rounded-2xl border border-border bg-card p-6 sm:p-8"><h2 className="font-serif text-2xl font-semibold">Account controls</h2><p className="mt-2 text-sm text-muted-foreground">Manage how you leave this workspace.</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/') })} data-testid="button-profile-logout"><LogOut size={15} /> Sign out</Button><Button variant="ghost" onClick={() => alert('Use the in-app message center for help.')} data-testid="button-contact-support"><CircleHelp size={15} /> Contact support</Button></div></section></div></>;
}

function AppRouter() {
  return <Switch><Route path="/" component={Landing} /><Route path="/login"><AuthPage mode="login" /></Route><Route path="/register"><AuthPage mode="register" /></Route><Route path="/reset-password" component={ResetPassword} /><Route path="/dashboard"><Shell><Dashboard /></Shell></Route><Route path="/reports/new"><Shell><NewReport /></Shell></Route><Route path="/reports"><Shell><Reports /></Shell></Route><Route path="/matches"><Shell><Matches /></Shell></Route><Route path="/messages"><Shell><Messages /></Shell></Route><Route path="/recovery"><Shell><Recovery /></Shell></Route><Route path="/notifications"><Shell><Notifications /></Shell></Route><Route path="/profile"><Shell><Profile /></Shell></Route><Route><Landing /></Route></Switch>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><AppRouter /></QueryClientProvider>;
}