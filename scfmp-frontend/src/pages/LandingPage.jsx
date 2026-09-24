import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  AtSign,
  BarChart3,
  ChevronRight,
  CircleCheck,
  Code2,
  Cpu,
  FileText,
  Github,
  GitBranch,
  Instagram,
  LayoutDashboard,
  Lightbulb,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Network,
  Phone,
  ShieldCheck,
  Sprout,
  UsersRound,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { listPublicTeamMembers, publicMediaUrl } from '../api/publicTeam';
import {
  agribridgeFeatures,
  landingCompany,
  landingNav,
  landingServices,
  platformBenefits,
  supportedOrganizationTypes,
} from '../config/landingContent';
import { COMPANY_LOGO_PATH } from '../config/company';

const serviceIcons = {
  'layout-dashboard': LayoutDashboard,
  'code-2': Code2,
  'git-branch': GitBranch,
  cpu: Cpu,
  sprout: Sprout,
};

const BrandMark = ({ compact = false }) => {
  const [logoAvailable, setLogoAvailable] = useState(true);
  const markSize = compact ? 'h-9 w-9' : 'h-11 w-11';

  return (
    <span className="inline-flex items-center gap-2.5">
      {logoAvailable ? (
        <span className={`grid place-items-center overflow-hidden rounded-xl bg-white/10 p-1 shadow-lg shadow-slate-950/25 ${markSize}`}>
          <img src={COMPANY_LOGO_PATH} alt="SmartBridge Technologies Ltd" onError={() => setLogoAvailable(false)} className="h-full w-full object-contain" />
        </span>
      ) : (
        <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-[#A5C3D7] to-[#1687D4] font-bold text-white shadow-lg shadow-slate-950/30 ${markSize}`} aria-hidden="true">S</span>
      )}
      <span className="leading-none">
        <span className={`block font-semibold tracking-[-0.04em] text-white ${compact ? 'text-sm' : 'text-base'}`}>SMARTBRIDGE</span>
        <span className="mt-1 block text-[9px] font-semibold tracking-[0.2em] text-sky-200">TECHNOLOGIES LTD</span>
      </span>
    </span>
  );
};

const SectionIntro = ({ eyebrow, title, children, centered = false }) => (
  <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1687D4]">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">{title}</h2>
    {children && <div className="mt-4 text-base leading-7 text-slate-600">{children}</div>}
  </div>
);

const Cta = ({ to, children, light = false, className = '' }) => (
  <Link
    to={to}
    className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${light ? 'bg-white text-[#102C4C] shadow-lg shadow-slate-950/20 hover:bg-sky-50' : 'bg-[#1687D4] text-white shadow-lg shadow-slate-950/15 hover:bg-[#0D6FAE]'} ${className}`}
  >
    {children}<ArrowRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);

const PublicProfileImage = ({ member, priority = false }) => {
  const [failed, setFailed] = useState(false);
  const source = publicMediaUrl(member.photo_url);

  if (!source || failed) {
    return (
      <div className="grid min-h-72 place-items-center bg-paper text-forest">
        <UsersRound className="h-12 w-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={`Portrait of ${member.full_name}`}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className="min-h-72 w-full bg-paper p-2 object-contain"
    />
  );
};

const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [team, setTeam] = useState([]);
  const [teamState, setTeamState] = useState('loading');
  const [selectedMember, setSelectedMember] = useState(null);

  const platformDestination = isAuthenticated ? '/dashboard' : '/login';
  const platformLabel = isAuthenticated ? t('landing.openPlatform') : t('landing.accessPlatform');
  const shortNav = useMemo(() => landingNav.slice(0, 6), []);
  const navLabel = (item) => t(`landing.nav.${item.key}`);

  useEffect(() => {
    document.title = 'SmartBridge Technologies Ltd | Digital Solutions for Smarter Organizations';
    const loadTeam = async () => {
      try {
        const members = await listPublicTeamMembers();
        const sortedMembers = [...(Array.isArray(members) ? members : [])].sort((left, right) => {
          const rank = (position) => {
            if (/^Co-Founder/i.test(position || '')) return 0;
            if (/^Founder/i.test(position || '')) return 1;
            if (/^Volunteer/i.test(position || '')) return 2;
            return 3;
          };
          return rank(left.position) - rank(right.position)
            || String(left.full_name).localeCompare(String(right.full_name));
        });
        setTeam(sortedMembers);
        setTeamState('ready');
      } catch {
        setTeamState('unavailable');
      }
    };
    loadTeam();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-900">
      <a href="#main-content" className="focus-ring sr-only fixed left-4 top-4 z-[70] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 focus:not-sr-only">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#102C4C]/95 text-white backdrop-blur-lg">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#home" className="focus-ring rounded-lg" aria-label="SmartBridge Technologies home"><BrandMark compact /></a>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
            {shortNav.map((item) => <a key={item.href} href={item.href} className="focus-ring rounded-md text-sm text-slate-200 transition hover:text-white">{navLabel(item)}</a>)}
            <a href="#contact" className="focus-ring rounded-md text-sm text-slate-200 transition hover:text-white">{t('landing.nav.contact')}</a>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="landing-language text-slate-200"><LanguageSwitcher compact /></span>
            <Cta to={platformDestination} light>{platformLabel}</Cta>
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="focus-ring rounded-lg p-2 lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#102C4C] px-5 py-5 lg:hidden">
            <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
              {landingNav.map((item) => <a key={item.href} href={item.href} onClick={closeMenu} className="focus-ring rounded-lg px-3 py-3 text-sm font-medium text-slate-100 hover:bg-white/10">{navLabel(item)}</a>)}
              <div className="mt-3 flex flex-wrap items-center gap-3 px-3">
                <span className="landing-language text-slate-200"><LanguageSwitcher compact /></span>
                <Cta to={platformDestination} light className="flex-1" >{platformLabel}</Cta>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
        <section id="home" className="landing-grid relative isolate overflow-hidden bg-[#102C4C] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(165,195,215,.38),transparent_24rem),radial-gradient(circle_at_13%_85%,rgba(22,135,212,.30),transparent_27rem)]" aria-hidden="true" />
          <div className="absolute -right-32 top-10 h-[38rem] w-[38rem] rounded-full border border-sky-300/15" aria-hidden="true" />
          <div className="landing-orbit absolute -right-20 top-20 h-[28rem] w-[28rem] rounded-full border border-dashed border-sky-300/30" aria-hidden="true"><span className="absolute -left-2 top-1/2 h-4 w-4 rounded-full bg-sky-300 shadow-[0_0_30px_8px_rgba(125,211,252,.35)]" /></div>
          <div className="relative mx-auto grid min-h-[660px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div className="landing-reveal max-w-2xl">
              <BrandMark />
              <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Practical technology for real-world work</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">Build digital solutions <span className="text-sky-300">for smarter organizations.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">We develop practical technology and digital management solutions that help organizations improve operations, make better decisions, embrace digital transformation, and grow sustainably.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#agribridge" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10">Explore AgriBridge <ArrowDownRight className="h-4 w-4" /></a></div>
              <p className="mt-8 text-sm text-slate-300"><span className="font-semibold text-white">AgriBridge</span> is a digital platform of SmartBridge Technologies Ltd.</p>
            </div>
            <div className="landing-float relative mx-auto w-full max-w-[530px]" aria-label="Illustrative AgriBridge interface preview">
              <div className="absolute -inset-7 rounded-[2rem] bg-sky-400/10 blur-3xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-slate-950/70 p-3 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-2 h-5 flex-1 rounded-md bg-white/5" /></div>
                <div className="grid gap-3 p-2 sm:grid-cols-[.74fr_1.26fr]">
                  <aside className="rounded-xl bg-white/[.055] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-white"><span className="grid h-6 w-6 place-items-center rounded-md bg-blue-500"><Sprout className="h-3.5 w-3.5" /></span>AgriBridge</div><div className="mt-7 space-y-2">{['Overview', 'Organizations', 'Farmers', 'Production', 'Reports'].map((label, index) => <div key={label} className={`h-6 rounded-md px-2 py-1 text-[9px] ${index === 0 ? 'bg-blue-500/70 text-white' : 'text-slate-400'}`}>{label}</div>)}</div></aside>
                  <div className="space-y-3"><div className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-4"><p className="text-[10px] text-blue-100">Organization workspace</p><p className="mt-1 text-base font-semibold text-white">Welcome back</p><div className="mt-4 h-1.5 w-3/4 rounded bg-white/35" /></div><div className="grid grid-cols-2 gap-3">{['Records', 'Production', 'Inventory', 'Reports'].map((label, index) => <div key={label} className="rounded-xl bg-white/[.07] p-3"><div className={`h-5 w-5 rounded-md ${['bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-300'][index]}`} /><p className="mt-3 text-[10px] font-medium text-slate-200">{label}</p><p className="mt-1 text-[9px] text-slate-500">Organized workflow</p></div>)}</div><div className="rounded-xl bg-white/[.07] p-3"><div className="flex items-end gap-2">{[35, 52, 42, 65, 53, 74, 69].map((height, index) => <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-sky-300" style={{ height: `${height / 2}px` }} />)}</div></div></div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-5 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-sky-100 shadow-lg backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300" />Connected operations</div>
            </div>
          </div>
        </section>

        <section id="about" className="bg-paper py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <SectionIntro eyebrow="About SmartBridge" title="Technology that meets organizations where they are.">
              <p>SmartBridge Technologies Ltd delivers practical technology and digital management solutions that help organizations improve operations, improve decision-making, and drive sustainable growth.</p>
              <p className="mt-4">We see technology as a bridge: between people and useful information, between daily work and better systems, and between local needs and new possibilities.</p>
            </SectionIntro>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Practical by design', 'Solutions shaped around useful, everyday organizational work.'],
                ['Built to connect', 'Relevant people, processes, and information can work together.'],
                ['Made for growth', 'A clear foundation for teams improving how they operate over time.'],
                ['Grounded in purpose', 'Technology in service of stronger organizations and communities.'],
              ].map(([title, description], index) => <article key={title} className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${index === 0 ? 'sm:translate-y-7' : ''}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Lightbulb className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="services" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8"><SectionIntro eyebrow="What we do" title="Digital solutions with a practical point of view."><p>SmartBridge brings together the services below to help organizations make meaningful progress with technology.</p></SectionIntro><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">{landingServices.map((service) => { const Icon = serviceIcons[service.icon]; return <article key={service.id} className={`group relative overflow-hidden rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${service.featured ? 'border-blue-200 bg-blue-600 text-white shadow-lg shadow-blue-200/60' : 'border-slate-200 bg-white text-slate-950'}`}><Icon className={`h-6 w-6 ${service.featured ? 'text-sky-200' : 'text-blue-600'}`} /><h3 className="mt-12 text-lg font-semibold tracking-[-0.025em]">{service.title}</h3><p className={`mt-3 text-sm leading-6 ${service.featured ? 'text-blue-100' : 'text-slate-600'}`}>{service.description}</p>{service.featured && <p className="mt-5 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-white">SmartBridge platform</p>}</article>; })}</div></div>
        </section>

        <section id="agribridge" className="bg-[#102C4C] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">A SmartBridge Technologies platform</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Meet AgriBridge.</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-200">AgriBridge is a digital management platform developed by SmartBridge Technologies Ltd to help agricultural organizations manage operations, people, production, records, reporting, and organizational activities through one connected system.</p></div><div className="grid gap-3 sm:grid-cols-2">{agribridgeFeatures.map((feature, index) => <article key={feature.title} className={`rounded-2xl border border-white/10 p-5 ${index === 0 ? 'bg-white/12' : 'bg-white/[.055]'}`}><CircleCheck className="h-5 w-5 text-sky-300" /><h3 className="mt-5 text-base font-semibold text-white">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p></article>)}</div></div></div>
        </section>

        <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8"><SectionIntro centered eyebrow="Why AgriBridge" title="A clearer way to manage connected work."><p>The platform is designed around the real information and workflows organizations need to manage securely.</p></SectionIntro><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{platformBenefits.map((benefit, index) => <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-lg"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">{index === 5 ? <ShieldCheck className="h-5 w-5" /> : index === 3 ? <BarChart3 className="h-5 w-5" /> : index === 2 ? <FileText className="h-5 w-5" /> : <Network className="h-5 w-5" />}</span><h3 className="mt-5 text-lg font-semibold text-slate-950">{benefit.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p></article>)}</div></div></section>

        <section className="bg-slate-50 py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center"><div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-7 shadow-xl sm:p-10"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-white/10" /><p className="relative text-xs font-bold uppercase tracking-[.2em] text-sky-100">Platform preview</p><h2 className="relative mt-3 max-w-md text-3xl font-semibold tracking-[-.045em] text-white">One platform. Thoughtful workflows.</h2><div className="relative mt-10 grid grid-cols-2 gap-3"><div className="col-span-2 rounded-xl bg-white/15 p-4 backdrop-blur"><p className="text-[11px] text-sky-100">AgriBridge dashboard</p><div className="mt-3 grid grid-cols-3 gap-2">{['Organizations', 'Farmers', 'Reports'].map((item) => <div key={item} className="rounded-lg bg-white/10 p-3 text-xs font-medium text-white">{item}<div className="mt-4 h-1.5 rounded-full bg-white/30" /></div>)}</div></div><div className="rounded-xl bg-slate-950/25 p-4"><Sprout className="h-5 w-5 text-sky-100" /><p className="mt-5 text-xs font-semibold text-white">Production</p></div><div className="rounded-xl bg-slate-950/25 p-4"><FileText className="h-5 w-5 text-sky-100" /><p className="mt-5 text-xs font-semibold text-white">Digital records</p></div></div></div><div><SectionIntro eyebrow="Designed for useful visibility" title="See the work without exposing real data."><p>This preview is an illustrative interface, built from the kinds of modules available in AgriBridge. It contains no customer, farmer, financial, or production data.</p></SectionIntro><a href="#contact" className="focus-ring mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-500">Talk with SmartBridge <ChevronRight className="h-4 w-4" /></a></div></div></section>

        <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-12 lg:grid-cols-2"><SectionIntro eyebrow="Our story" title="Technology as a bridge to better opportunities."><p>SmartBridge Technologies Ltd was founded to use technology as a bridge between people, organizations, businesses, and better opportunities.</p><p className="mt-4">The company develops practical digital solutions that improve operations, communication, information management, and service delivery while responding to real-world needs.</p></SectionIntro><div className="relative border-l border-blue-200 pl-8"><div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-600" /><p className="text-sm font-semibold text-blue-700">Purpose</p><p className="mt-2 text-lg font-semibold text-slate-950">Connect people, organizations, and useful technology.</p><div className="mt-10 absolute -left-1.5 h-3 w-3 rounded-full bg-sky-400" /><p className="text-sm font-semibold text-blue-700">Approach</p><p className="mt-2 text-lg font-semibold text-slate-950">Build practical solutions around real needs and real work.</p><div className="mt-10 absolute -left-1.5 h-3 w-3 rounded-full bg-slate-300" /><p className="text-sm font-semibold text-blue-700">Direction</p><p className="mt-2 text-lg font-semibold text-slate-950">Help organizations work with clarity, confidence, and room to grow.</p></div></div><div className="mt-16 grid gap-5 md:grid-cols-2"><article className="rounded-2xl bg-blue-50 p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Our vision</p><p className="mt-4 text-xl font-semibold leading-8 tracking-[-.035em] text-slate-950">To become a trusted African technology company recognized for developing innovative digital solutions that empower organizations, businesses, and communities to grow, improve efficiency, and succeed in an increasingly connected future.</p></article><article className="rounded-2xl bg-slate-950 p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-300">Our mission</p><p className="mt-4 text-xl font-semibold leading-8 tracking-[-.035em] text-white">To develop reliable and accessible technology solutions that help organizations and businesses improve their operations, embrace digital transformation, solve practical challenges, and achieve sustainable growth through technology.</p></article></div></div></section>

        <section id="team" className="bg-paper py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8"><SectionIntro eyebrow="Meet our team" title="The people behind SmartBridge and AgriBridge."><p>Profiles are arranged by official role, with the Co-Founder & IT Lead first. Platform permissions, account details, and internal access information remain private.</p></SectionIntro>{teamState === 'loading' ? <div className="mt-10 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-white"><div className="min-h-72 bg-sand" /><div className="space-y-3 p-6"><div className="h-4 w-2/3 rounded bg-sand" /><div className="h-3 w-1/2 rounded bg-paper" /></div></div>)}</div> : team.length > 0 ? <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{team.map((member, index) => <article key={`${member.full_name}-${member.position}`} className="group overflow-hidden rounded-2xl border border-sand bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl"><PublicProfileImage member={member} priority={index < 2} /><div className="p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#1687D4]">{member.position}</p><h3 className="mt-2 text-xl font-semibold text-ink">{member.full_name}</h3>{member.biography && <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">{member.biography}</p>}<button onClick={() => setSelectedMember(member)} className="focus-ring mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1687D4] hover:text-[#0D6FAE]">View profile <ArrowRight className="h-4 w-4" /></button></div></article>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-sand bg-white p-8 text-center"><UsersRound className="mx-auto h-9 w-9 text-[#1687D4]" /><h3 className="mt-4 text-lg font-semibold text-ink">Approved team profiles will appear here.</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">SmartBridge can publish profiles from the existing Team module when members approve their public visibility.</p></div>}{teamState === 'unavailable' && <p className="mt-5 text-sm text-ink-soft">Team profiles are temporarily unavailable. Please check back soon.</p>}</div></section>

        <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8"><SectionIntro centered eyebrow="Built for organizations" title="Support for the organization types already served by the platform."><p>These categories reflect the organization types available in AgriBridge; they do not represent endorsements or partner logos.</p></SectionIntro><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{supportedOrganizationTypes.map((organization) => <article key={organization.title} className="rounded-2xl border border-slate-200 p-6 transition hover:border-blue-200 hover:bg-blue-50/40"><UsersRound className="h-6 w-6 text-blue-600" /><h3 className="mt-7 text-lg font-semibold text-slate-950">{organization.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{organization.description}</p></article>)}</div></div></section>

        <section id="testimonials" className="bg-blue-50 py-20 sm:py-28"><div className="mx-auto max-w-3xl px-5 text-center sm:px-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Testimonials</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-slate-950 sm:text-4xl">Customer stories will be shared here.</h2><p className="mt-5 text-base leading-7 text-slate-600">SmartBridge will add customer stories and testimonials when organizations choose to share their experience with AgriBridge. No testimonials are presented until they are verified and approved.</p></div></section>

        <section id="contact" className="bg-[#102C4C] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_.9fr]">
              <div><BrandMark /><h2 className="mt-9 max-w-xl text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Let’s build a smarter way forward.</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-200">Talk with SmartBridge Technologies Ltd about practical digital solutions for your organization.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><Phone className="h-5 w-5 text-sky-300" /><h3 className="mt-5 text-sm font-semibold">Phone</h3>{landingCompany.phones.map((phone) => <a key={phone.phone} href={phone.phoneUrl} className="focus-ring mt-2 block rounded text-sm text-slate-200 hover:text-white">{phone.phone}</a>)}</article>
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><Mail className="h-5 w-5 text-sky-300" /><h3 className="mt-5 text-sm font-semibold">Email</h3><a href={`mailto:${landingCompany.email}`} className="focus-ring mt-2 block break-words rounded text-sm text-slate-200 hover:text-white">{landingCompany.email}</a></article>
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><MapPin className="h-5 w-5 text-sky-300" /><h3 className="mt-5 text-sm font-semibold">Location</h3><p className="mt-2 text-sm leading-6 text-slate-200">{landingCompany.location}</p></article>
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><AtSign className="h-5 w-5 text-sky-300" /><h3 className="mt-5 text-sm font-semibold">Follow</h3><div className="mt-3 flex gap-3"><a href={landingCompany.socialLinks.x.href} target="_blank" rel="noopener noreferrer" className="focus-ring rounded text-slate-200 hover:text-white" aria-label={`X ${landingCompany.socialLinks.x.handle}`}><AtSign className="h-5 w-5" /></a><a href={landingCompany.socialLinks.instagram.href} target="_blank" rel="noopener noreferrer" className="focus-ring rounded text-slate-200 hover:text-white" aria-label={`Instagram ${landingCompany.socialLinks.instagram.handle}`}><Instagram className="h-5 w-5" /></a></div><p className="mt-3 text-xs text-slate-300">{landingCompany.socialLinks.x.handle}<br />{landingCompany.socialLinks.instagram.handle}</p></article>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#041225] text-slate-300"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8"><div className="grid gap-10 md:grid-cols-[1.2fr_.8fr_.8fr]"><div><BrandMark /><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">{landingCompany.tagline}</p><p className="mt-4 text-xs text-slate-500">AgriBridge is a platform and solution of SmartBridge Technologies Ltd.</p></div><div><h2 className="text-sm font-semibold text-white">Quick links</h2><nav className="mt-4 grid gap-2" aria-label="Footer navigation">{landingNav.map((item) => <a key={item.href} href={item.href} className="focus-ring rounded text-sm text-slate-400 hover:text-white">{navLabel(item)}</a>)}</nav></div><div><h2 className="text-sm font-semibold text-white">Platform</h2><p className="mt-4 text-sm text-slate-400">AgriBridge</p><Cta to={platformDestination} className="mt-4">{platformLabel}</Cta></div></div><div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">© {new Date().getFullYear()} SmartBridge Technologies Ltd. All rights reserved.</div></div></footer>

      <Modal title={selectedMember?.full_name || 'Team profile'} isOpen={Boolean(selectedMember)} onClose={() => setSelectedMember(null)} maxWidth="max-w-2xl">
        {selectedMember && <div className="grid gap-6 sm:grid-cols-[.85fr_1.15fr]"><div className="overflow-hidden rounded-xl"><PublicProfileImage member={selectedMember} /></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">{selectedMember.position}</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedMember.full_name}</h3>{selectedMember.biography && <p className="mt-5 text-sm leading-7 text-slate-600">{selectedMember.biography}</p>}<div className="mt-6 flex gap-3">{selectedMember.linkedin_url && <a className="focus-ring rounded-lg border border-slate-200 p-2 text-slate-700 hover:border-blue-300 hover:text-blue-700" href={selectedMember.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${selectedMember.full_name} on LinkedIn`}><Linkedin className="h-5 w-5" /></a>}{selectedMember.github_url && <a className="focus-ring rounded-lg border border-slate-200 p-2 text-slate-700 hover:border-blue-300 hover:text-blue-700" href={selectedMember.github_url} target="_blank" rel="noopener noreferrer" aria-label={`${selectedMember.full_name} on GitHub`}><Github className="h-5 w-5" /></a>}</div></div></div>}
      </Modal>
    </div>
  );
};

export default LandingPage;
