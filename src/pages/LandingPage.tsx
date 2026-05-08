import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScroll, useTransform, useSpring, motion } from 'framer-motion';
import { StudentRegistration } from '../components/StudentRegistration';
import { Chatbot } from '../components/Chatbot';
import { PillarsSection, VisionMissionSection, CommunitySection, PromiseSection, SchoolLifeSection, TeamSection } from '../components/LandingSections';
import logo from '../assets/logo.jpg';
import classroomImg from '../assets/students_classroom.png';
import founderImg from '../assets/founder.jpg';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import {
  ArrowRight,
  LogIn,
  ArrowLeft,
  Send,
  Video,
  Camera,
  Music2,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  MapPin,
  Heart,
  Star,
  Zap,
  Globe,
  Quote,
  GraduationCap,
  Lock
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { schoolName, schoolMotto, registrationOpen } = useUser();

  const { publicPosts } = useStore();
  const [showAdmission, setShowAdmission] = useState(false);

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const rotateX = useTransform(scrollY, [0, 1000], [0, 45]);
  const rotateY = useTransform(scrollY, [0, 1000], [0, 25]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);
  
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothY1 = useSpring(y1, springConfig);
  const smoothY2 = useSpring(y2, springConfig);
  const smoothRotateX = useSpring(rotateX, springConfig);
  const smoothRotateY = useSpring(rotateY, springConfig);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const displaySchoolName = schoolName.english;

  if (showAdmission) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="School Logo" className="w-16 h-16 rounded-2xl shadow-lg object-cover" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admission Portal</h1>
                <p className="text-sm text-slate-500">{displaySchoolName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdmission(false)}
              className="text-slate-500 hover:text-school-primary font-bold transition-colors"
            >
              ← Back to Main
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-1 shadow-xl border border-slate-100 dark:border-slate-800">
             <StudentRegistration isAdminView={false} />
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Students', value: '2,500+', icon: Users, color: 'text-blue-500' },
    { label: 'Qualified Teachers', value: '120+', icon: Award, color: 'text-emerald-500' },
    { label: 'School Branches', value: '4', icon: MapPin, color: 'text-rose-500' },
    { label: 'Clubs & Activities', value: '15+', icon: Zap, color: 'text-amber-500' },
  ];



  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden">
      {/* Premium Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 ${scrolled ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Logo" className="w-14 h-14 rounded-2xl shadow-lg transition-transform group-hover:scale-110" />
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter block leading-none">ABDI ADAMA</span>
              <span className="text-xs font-black text-school-primary uppercase tracking-widest">School</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8">
              {['home', 'about', 'programs', 'school-life', 'branches'].map((item) => (
                <a key={item} href={`#${item}`} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-school-primary transition-colors">{item === 'school-life' ? 'School Life' : t(`nav.${item}`)}</a>
              ))}
            </div>
            <select
              value={i18n.language}
              onChange={(e) => {
                i18n.changeLanguage(e.target.value);
                localStorage.setItem('abdi_adama_language', e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-slate-500 dark:text-slate-400 outline-none cursor-pointer hover:text-school-primary transition-colors"
            >
              <option value="en">EN</option>
              <option value="am">AM</option>
              <option value="om">OM</option>
            </select>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {t('nav.signIn')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_50%)]" />
          <div className="absolute bottom-0 left-0 w-1/2 h-full bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.1),_transparent_50%)]" />
          
          {/* Floating 3D Elements */}
          <motion.div 
            style={{ y: smoothY1, rotateX: smoothRotateX, rotateY: smoothRotateY }}
            className="absolute top-[15%] left-[5%] w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-3xl rounded-[2rem] border border-white/20 shadow-2xl flex items-center justify-center preserve-3d"
          >
            <BookOpen size={40} className="text-blue-500/30" />
          </motion.div>

          <motion.div 
            style={{ y: smoothY2, rotateX: smoothRotateY, rotateY: smoothRotateX }}
            className="absolute top-[60%] right-[10%] w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 backdrop-blur-3xl rounded-full border border-white/20 shadow-2xl flex items-center justify-center preserve-3d"
          >
            <GraduationCap size={60} className="text-emerald-500/30" />
          </motion.div>

          <motion.div 
            style={{ y: smoothY1, rotateZ: smoothRotateX }}
            className="absolute top-[40%] left-[80%] w-24 h-24 bg-rose-500/10 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl flex items-center justify-center rotate-12 preserve-3d"
          >
            <Music2 size={30} className="text-rose-500/30" />
          </motion.div>

          <motion.div 
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 10, 0]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-[25%] right-[20%] w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center"
          >
            <Star size={24} className="text-amber-500/40" />
          </motion.div>

          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 fade-in-up">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-school-primary shadow-sm">
                  <Globe size={14} className="animate-spin-slow" />
                  {t('landing.heroSubtitle')}
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[0.9]">
                  {t('landing.heroTitle')} <br />
                  <span className="text-gradient">{t('landing.heroHighlight')}</span> {t('landing.heroEnd')}
                </h1>
                <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400 font-medium italic border-l-4 border-school-primary pl-4 py-2">
                  <p>{schoolMotto.oromic}</p>
                  <p>{schoolMotto.amharic}</p>
                  <p>{schoolMotto.english}</p>
                </div>
              </div>

              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                {t('landing.heroDesc')}
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => registrationOpen && setShowAdmission(true)}
                  disabled={!registrationOpen}
                  className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 group shine ${
                    registrationOpen 
                    ? 'bg-school-primary hover:bg-school-primary/90 text-white shadow-2xl shadow-school-primary/30' 
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-2 border-dashed border-slate-400'
                  }`}
                >
                  {registrationOpen ? t('landing.applyBtn') : 'Admission Closed'}
                  {registrationOpen && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  {!registrationOpen && <Lock size={16} />}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3"
                >
                  {t('landing.portalBtn')}
                  <LogIn size={18} />
                </button>
              </div>
            </div>

            <motion.div 
              style={{ rotateX: smoothRotateX, rotateY: smoothRotateY, scale }}
              className="relative hidden lg:block perspective-1000"
            >
              <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white dark:border-slate-900 aspect-[4/5] group preserve-3d">
                <img src={classroomImg} alt="Students" className="w-full h-full object-cover slow-zoom" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-10 left-10 right-10 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-lg font-bold leading-tight">"Abdi Adama School gave me the chance to discover my potential."</p>
                  <p className="text-xs font-black uppercase tracking-widest text-school-primary mt-2">— Firdos Musa, Top Scorer</p>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-school-secondary/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-school-primary/20 rounded-full blur-3xl animate-pulse delay-700" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 50, rotateX: -45 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                className="text-center space-y-2 group perspective-1000"
              >
                <div className={`mx-auto w-16 h-16 ${stat.color} bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-slate-100 dark:border-slate-800 preserve-3d`}>
                  <stat.icon size={28} />
                </div>
                <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-4">{stat.value}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's Message */}
      <section id="about" className="py-24 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -100, rotateY: 30 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="order-2 lg:order-1 perspective-1000"
            >
              <div className="section-header !text-left">
                <span className="section-subtitle">{t('landing.founder.subtitle')}</span>
                <h2 className="section-title">{t('landing.founder.title')}</h2>
              </div>
              
              <div className="space-y-8">
                <motion.div 
                  whileHover={{ rotateY: -5, rotateX: 5 }}
                  className="relative p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl preserve-3d transition-all duration-500"
                >
                  <Quote className="absolute top-6 right-6 text-slate-100 dark:text-slate-800" size={80} />
                  <div className="relative z-10 space-y-6">
                    <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                      {t('landing.founder.quote')}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-school-primary/20 rounded-full flex items-center justify-center text-school-primary font-black">GL</div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('landing.founder.name')}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('landing.founder.role')}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="p-8 bg-white/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                   <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                     {t('landing.founder.vision')}
                   </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="order-1 lg:order-2 grid grid-cols-2 gap-4 perspective-1000"
            >
              <div className="space-y-4 pt-12">
                <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-white dark:border-slate-800 group">
                  <img src={founderImg} alt="Ato Girma Lemi - Founder" className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="bg-school-primary p-8 rounded-3xl text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                  <h4 className="font-black text-4xl">20+</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2">{t('landing.yearsLeadership')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-school-secondary p-8 rounded-3xl text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                   <Heart className="mb-4 text-white/80" size={32} />
                   <p className="text-lg font-bold leading-tight">{t('landing.nurturingMinds')}</p>
                </div>
                <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-white dark:border-slate-800 group">
                   <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop" alt="Campus Life" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-header"
          >
            <span className="section-subtitle">{t('landing.programs.subtitle')}</span>
            <h2 className="section-title">{t('landing.programs.title')}</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 perspective-2000">
            {[
              { level: t('landing.programs.kindergartenLevel'), title: t('landing.programs.kindergarten'), desc: t('landing.programs.kindergartenDesc') },
              { level: t('landing.programs.elementaryLevel'), title: t('landing.programs.elementary'), desc: t('landing.programs.elementaryDesc') },
              { level: t('landing.programs.highSchoolLevel'), title: t('landing.programs.highSchool'), desc: t('landing.programs.highSchoolDesc') }
            ].map((prog, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, z: -100, rotateY: 45, y: 50 }}
                whileInView={{ opacity: 1, z: 0, rotateY: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.2, ease: "easeOut" }}
                whileHover={{ scale: 1.05, rotateY: 10, rotateX: -5 }}
                className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl transition-all duration-500 flex flex-col items-center text-center preserve-3d"
              >
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-school-primary mb-8 group-hover:bg-school-primary group-hover:text-white transition-all duration-500 shadow-xl preserve-3d">
                  <BookOpen size={40} />
                </div>
                <span className="text-[10px] font-black text-school-primary uppercase tracking-[0.2em] mb-4 px-4 py-1.5 bg-school-primary/10 rounded-full">{prog.level}</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{prog.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-8">{prog.desc}</p>
                <button 
                  onClick={() => registrationOpen && setShowAdmission(true)} 
                  disabled={!registrationOpen}
                  className={`mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors group/btn ${
                    registrationOpen ? 'text-slate-900 dark:text-white hover:text-school-primary' : 'text-slate-400'
                  }`}
                >
                  {registrationOpen ? t('landing.programs.explore') : 'Closed'}
                  {registrationOpen && <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />}
                </button>

              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NEW SECTIONS FROM SCHOOL OWNER ═══ */}
      <PillarsSection />
      <VisionMissionSection />
      <CommunitySection />
      <PromiseSection />
      <SchoolLifeSection id="school-life" />
      <TeamSection />

      {/* Updates / Posts Section */}
      {publicPosts.length > 0 && (
        <section id="updates" className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-6 mb-12">
            <div className="section-header !text-left !mb-0 flex items-center justify-between">
              <div>
                <span className="section-subtitle">{t('landing.stayInformed')}</span>
                <h2 className="section-title">{t('landing.updates.title')}</h2>
              </div>
              <div className="hidden sm:flex gap-2">
                <button onClick={() => { const el = document.querySelector('.updates-scroll'); if(el) el.scrollBy({left:-420,behavior:'smooth'}); }} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-school-primary hover:border-school-primary transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <button onClick={() => { const el = document.querySelector('.updates-scroll'); if(el) el.scrollBy({left:420,behavior:'smooth'}); }} className="w-10 h-10 rounded-full bg-school-primary text-white flex items-center justify-center shadow-lg hover:bg-school-primary/90 transition-colors">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="updates-scroll pl-6 md:pl-[calc(50vw-40rem+1.5rem)] pb-8 overflow-x-auto flex snap-x snap-mandatory hide-scrollbar gap-6 pr-6">
            {publicPosts.map((post) => (
              <div key={post.id} className="snap-start shrink-0 w-[85vw] sm:w-[400px] bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden group hover:-translate-y-2 transition-all duration-500 flex flex-col">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  {post.type === 'image' ? (
                    <img src={post.mediaUrl} alt="Update" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <iframe src={post.mediaUrl} className="w-full h-full pointer-events-none" />
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[10px] font-black uppercase tracking-widest rounded-full text-school-primary shadow-sm">
                      {new Date(post.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium line-clamp-3">
                    {post.description}
                  </p>
                  <div className="mt-auto pt-6 flex items-center gap-2 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest group-hover:text-school-primary transition-colors cursor-pointer w-fit">
                    {t('landing.readMore')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Media & Life Section */}
      <section id="media" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="section-header">
            <span className="section-subtitle">{t('landing.communitySubtitle')}</span>
            <h2 className="section-title">{t('landing.communityTitle')}</h2>
          </div>

          <div className="space-y-16">
            {/* Header Text */}
            <div className="max-w-3xl">
               <div className="inline-flex items-center gap-3 px-4 py-2 bg-school-primary/10 rounded-full text-school-primary mb-6">
                  <Video size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('landing.media.introVideo')}</span>
                </div>
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
                  {t('landing.media.introTitle')} meets <span className="text-gradient">{t('landing.media.introHighlight')}</span>
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {t('landing.media.introDesc1')}
                </p>
            </div>

            {/* Videos Grid */}
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Culture Day Video (YouTube) */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative rounded-[3rem] overflow-hidden bg-slate-900 aspect-video shadow-2xl border-8 border-white dark:border-slate-800 perspective-1000"
              >
                <iframe 
                  className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                  src="https://www.youtube.com/embed/DMtKs79RUmA" 
                  title="Abdi Adama Culture Day"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-40 pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-1">{t('landing.media.cultureDay')}</h4>
                    <p className="text-white/70 text-[10px] font-medium">{t('landing.media.cultureDesc')}</p>
                  </div>
                </div>
              </motion.div>

              {/* School Intro Video (Google Drive) */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="group relative rounded-[3rem] overflow-hidden bg-slate-900 aspect-video shadow-2xl border-8 border-white dark:border-slate-800 perspective-1000"
              >
                <iframe 
                  className="w-full h-full opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                  src="https://drive.google.com/file/d/1dGwyS7pClTRLflLSDkj8a332nTsS8lNw/preview" 
                  title="Abdi Adama Intro"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-40 pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-1">SCHOOL TOUR</h4>
                    <p className="text-white/70 text-[10px] font-medium">Take a look at our campus and facilities</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section id="branches" className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="section-header">
            <span className="section-subtitle">{t('landing.branches.subtitle')}</span>
            <h2 className="section-title">{t('landing.branches.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-2000">
            {[
              { name: t('landing.branches.kebele10'), location: t('landing.branches.adama'), desc: t('landing.branches.kebele10Desc') },
              { name: t('landing.branches.mogoro'), location: t('landing.branches.adama'), desc: t('landing.branches.mogoroDesc') },
              { name: t('landing.branches.village180'), location: t('landing.branches.adama'), desc: t('landing.branches.village180Desc') },
              { name: t('landing.branches.awash'), location: t('landing.branches.awash'), desc: t('landing.branches.awashDesc') }
            ].map((branch, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 50, rotateX: -30 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-500 preserve-3d"
              >
                <div className="w-12 h-12 bg-school-primary/10 rounded-2xl flex items-center justify-center text-school-primary mb-6 shadow-inner">
                  <MapPin size={24} />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{branch.name}</h4>
                <p className="text-[10px] font-black text-school-primary uppercase tracking-widest mb-4 px-3 py-1 bg-school-primary/5 rounded-full w-fit">{branch.location}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{branch.desc}</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(branch.name + ' ' + branch.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-school-primary uppercase tracking-widest hover:gap-3 transition-all">{t('landing.branches.viewMap')} <ArrowRight size={12} /></a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden perspective-1000">
        <motion.div 
          initial={{ opacity: 0, y: 100, rotateX: 45 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-6 text-center space-y-10 relative z-10 preserve-3d"
        >
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
            {t('landing.cta.title')} <br /> <span className="text-gradient">{t('landing.cta.highlight')}</span>
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('landing.cta.desc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <motion.button
               whileHover={registrationOpen ? { scale: 1.05, y: -5 } : {}}
               whileTap={registrationOpen ? { scale: 0.95 } : {}}
               onClick={() => registrationOpen && setShowAdmission(true)}
               disabled={!registrationOpen}
               className={`px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center gap-4 transition-all ${
                 registrationOpen 
                 ? 'bg-school-primary text-white shadow-2xl shadow-school-primary/40 hover:bg-school-primary/90 shine' 
                 : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed grayscale'
               }`}
             >
               {registrationOpen ? t('landing.cta.startAdmission') : 'Admission Closed'}
               {registrationOpen ? <CheckCircle2 size={24} /> : <Lock size={20} />}
             </motion.button>

             <motion.button
               whileHover={{ scale: 1.05, y: -5 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => navigate('/login')}
               className="px-12 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border-4 border-slate-900/5 dark:border-white/5"
             >
               {t('landing.cta.parentLogin')}
             </motion.button>
          </div>
        </motion.div>
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-school-primary/10 blur-[150px] -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-school-secondary/10 blur-[150px] -translate-y-1/2" />
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 pt-24 pb-12 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="w-12 h-12 rounded-xl shadow-md" />
                <div>
                  <span className="font-black text-slate-900 dark:text-white tracking-tighter block leading-none">ABDI ADAMA</span>
                  <span className="text-[10px] font-black text-school-primary uppercase tracking-widest">Smart School</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('landing.footer.founded')}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white mb-6">{t('landing.footer.quickLinks')}</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                {Object.entries(t('landing.footer.links', { returnObjects: true }) as any).map(([key, label]) => (
                  <li key={key}><a href="#" className="hover:text-school-primary transition-colors font-bold uppercase tracking-widest text-[10px]">{label as string}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white mb-6">{t('landing.footer.connect')}</h4>
              <div className="flex gap-4">
                {[
                  { icon: Send, url: 'https://t.me/abdiadamaschool', color: 'hover:text-blue-500', name: 'Telegram' },
                  { icon: Video, url: 'https://www.youtube.com/@AbdiadamaSchool-s1c', color: 'hover:text-rose-600', name: 'YouTube' },
                  { icon: Camera, url: 'https://www.instagram.com/abdi_adama_school/', color: 'hover:text-pink-500', name: 'Instagram' },
                  { icon: Music2, url: 'https://www.tiktok.com/@abdiadama1', color: 'hover:text-black dark:hover:text-white', name: 'TikTok' }
                ].map((social, i) => (
                  <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 ${social.color} transition-all shadow-sm group`}>
                    <social.icon size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white mb-6">{t('landing.footer.staffAccess')}</h4>
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-school-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-school-primary/20 transition-all w-full"
              >
                <LogIn size={16} />
                {t('landing.footer.staffPortal')}
              </button>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{t('landing.footer.rights')}</p>
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
};


