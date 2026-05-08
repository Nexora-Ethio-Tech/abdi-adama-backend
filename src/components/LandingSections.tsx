import { motion } from 'framer-motion';
import {
  ShieldCheck, Users, Zap, Globe, BookOpen, Heart, Target, Eye,
  GraduationCap, Bus, Shirt, TreePine, Trophy, Circle,
  Lightbulb, Handshake, Star, CheckCircle2
} from 'lucide-react';

import type { Easing } from 'framer-motion';

const ease: Easing = 'easeOut';
const fadeUp = { initial: { opacity: 0, y: 60 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.7, ease } };
const stagger = (i: number) => ({ ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.12 } });

/* ═══════════════════════════════════════════════════════════════
   1. WHAT SETS US APART — 4 Pillars
   ═══════════════════════════════════════════════════════════════ */
const pillars = [
  { icon: ShieldCheck, title: 'Integrity', color: 'from-blue-500 to-indigo-600', desc: 'Doing what is right, always. We foster honesty and accountability in every interaction. Character is defined by what you do when no one is watching.' },
  { icon: Users, title: 'Leadership', color: 'from-emerald-500 to-teal-600', desc: 'Cultivating the potential within. We empower students to take initiative, find their voice, build confidence, and inspire others.' },
  { icon: Target, title: 'Success', color: 'from-amber-500 to-orange-600', desc: 'A holistic mindset. We define success by resilience and the pursuit of one\'s full potential — not just a GPA.' },
  { icon: Lightbulb, title: 'Lifelong Learning', color: 'from-purple-500 to-pink-600', desc: 'Staying curious. Our inquiry-based curriculum moves beyond rote memorization to encourage creative thinking and innovation.' },
];

export const PillarsSection = () => (
  <section className="py-32 bg-white dark:bg-slate-950 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-purple-500" />
    <div className="max-w-7xl mx-auto px-6">
      <motion.div {...fadeUp} className="section-header">
        <span className="section-subtitle">What Sets Us Apart</span>
        <h2 className="section-title">The Four Pillars of Our Excellence</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">At Abdi Adama School, we don't just teach; we transform. Our distinct educational philosophy is built upon four core pillars.</p>
      </motion.div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {pillars.map((p, i) => (
          <motion.div key={i} {...stagger(i)} whileHover={{ y: -12, scale: 1.02 }} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${p.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
              <p.icon size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{p.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   2. VISION & MISSION
   ═══════════════════════════════════════════════════════════════ */
export const VisionMissionSection = () => (
  <section className="py-32 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-12">
        <motion.div {...fadeUp} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><Eye size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Our Vision</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">To empower our community through a premier 21st-century learning experience that balances academic rigor with ethical purpose. We strive to cultivate Ethiopia's future entrepreneurs, inventors, and scholars — equipping them to lead with innovation, creativity, and integrity.</p>
          </div>
        </motion.div>
        <motion.div {...stagger(1)} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600"><Target size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Our Mission</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">To stand as a beacon of educational excellence in Ethiopia. Abdi Adama School is a dedicated, learning-centered institution providing world-class education that exceeds national standards while remaining deeply rooted in the rich culture, values, and traditions of Ethiopia.</p>
          </div>
        </motion.div>
      </div>
      <motion.div {...stagger(2)} className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: GraduationCap, label: 'Academic Excellence', desc: 'Delivering a curriculum that meets global benchmarks' },
          { icon: Globe, label: 'Cultural Identity', desc: 'Celebrating Ethiopian heritage as a foundation for growth' },
          { icon: Zap, label: 'Future-Ready Skills', desc: 'Training the next generation of scientists and leaders' },
          { icon: ShieldCheck, label: 'Ethical Leadership', desc: 'Ensuring success is always guided by strong moral values' },
        ].map((f, i) => (
          <motion.div key={i} {...stagger(i + 2)} className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-school-primary/10 rounded-xl flex items-center justify-center text-school-primary shrink-0"><f.icon size={20} /></div>
            <div><h4 className="text-sm font-black text-slate-900 dark:text-white">{f.label}</h4><p className="text-xs text-slate-500 mt-1">{f.desc}</p></div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   3. COMMUNITY VALUES — Students / Parents / Teachers
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';

const communityData = {
  students: { emoji: '🌟', title: 'Our Students', subtitle: 'Inspired to Learn, Prepared to Lead', traits: ['Passionate Learners driven by curiosity', 'Ethical & Reflective with strong moral character', 'Resilient — turning challenges into opportunities', 'Confident Communicators who lead with purpose', 'Collaborative team players who celebrate diversity', 'Boldly Innovative — striving for excellence daily'] },
  parents: { emoji: '🤝', title: 'Our Parents', subtitle: 'Partners in the Educational Journey', traits: ['Valued & Heard — your insights are our cornerstone', 'Informed through transparent, regular updates', 'Confident your child is in a world-class environment', 'Welcomed as active participants in school life', 'True Partners in your child\'s academic evolution'] },
  teachers: { emoji: '🎓', title: 'Our Teachers', subtitle: 'Mentors, Role Models, and Visionaries', traits: ['Values-Driven with deep empathy and integrity', 'Dynamic & Enthusiastic — making learning infectious', 'Progressive & Innovative with 21st-century methods', 'Deeply Caring — building trusting relationships', 'Ambitious — never settling for less than excellence'] },
};

export const CommunitySection = () => {
  const [tab, setTab] = useState<'students' | 'parents' | 'teachers'>('students');
  const d = communityData[tab];
  return (
    <section className="py-32 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle">The Abdi Adama Community</span>
          <h2 className="section-title">Our Values</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">Our strength is our people — a vibrant, purpose-driven ecosystem where students, parents, and educators unite.</p>
        </motion.div>
        <div className="flex justify-center gap-3 mb-12">
          {(Object.keys(communityData) as Array<keyof typeof communityData>).map(k => (
            <button key={k} onClick={() => setTab(k)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === k ? 'bg-school-primary text-white shadow-lg shadow-school-primary/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700'}`}>
              {communityData[k].emoji} {k}
            </button>
          ))}
        </div>
        <motion.div key={tab} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl p-10">
          <div className="text-center mb-8">
            <span className="text-5xl">{d.emoji}</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-4">{d.title}</h3>
            <p className="text-sm text-slate-500 mt-1 italic">{d.subtitle}</p>
          </div>
          <div className="space-y-4">
            {d.traits.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <CheckCircle2 size={18} className="text-school-primary shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.p {...stagger(3)} className="text-center mt-10 text-sm font-bold text-slate-500 dark:text-slate-400 italic max-w-xl mx-auto">
          "Together — as students, parents, and teachers — we don't just build a school; we build the future of Ethiopia."
        </motion.p>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. PROMISE TO PARENTS
   ═══════════════════════════════════════════════════════════════ */
const promises = [
  { icon: ShieldCheck, title: 'Trust & Safety', desc: 'A safe, supportive sanctuary where every child is seen, heard, and valued.' },
  { icon: BookOpen, title: '21st-Century Learning', desc: 'Critical Thinking, Creativity, Collaboration, and Communication — the 4Cs.' },
  { icon: Heart, title: 'Celebrating the Individual', desc: 'Tailored approaches honoring each student\'s unique strengths and learning style.' },
  { icon: Handshake, title: 'Open Communication', desc: 'Transparent, regular updates keeping you informed every step of the way.' },
  { icon: Star, title: 'Holistic Growth', desc: 'Social, emotional, and physical well-being alongside academic triumphs.' },
  { icon: Trophy, title: 'Extracurricular Excellence', desc: 'Sports, arts, leadership, and community service cultivating well-rounded individuals.' },
];

export const PromiseSection = () => (
  <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" style={{ opacity: 0.08 }} />
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <motion.div {...fadeUp} className="section-header">
        <span className="section-subtitle !text-school-accent">Our Promise</span>
        <h2 className="section-title !text-white">To Every Parent</h2>
        <p className="text-slate-400 max-w-2xl mx-auto mt-4">By entrusting us with your child, you place your greatest treasure in our care. We accept this responsibility with profound respect.</p>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {promises.map((p, i) => (
          <motion.div key={i} {...stagger(i)} whileHover={{ y: -8 }} className="p-8 bg-white/5 backdrop-blur-sm rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all duration-500">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-school-accent mb-5"><p.icon size={26} /></div>
            <h3 className="text-lg font-black mb-2">{p.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   5. UNIFORM, TRANSPORT, FACILITIES
   ═══════════════════════════════════════════════════════════════ */
export const SchoolLifeSection = ({ id }: { id?: string }) => (
  <section id={id} className="py-32 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      <motion.div {...fadeUp} className="section-header">
        <span className="section-subtitle">School Life</span>
        <h2 className="section-title">Beyond the Classroom</h2>
      </motion.div>
      <div className="space-y-16">
        {/* Uniform */}
        <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 aspect-[4/3]">
            <img src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop" alt="School Uniform" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-3"><Shirt size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">School Uniform</h3></div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Our uniform is more than a dress code — it reflects our collective identity, high standards, and commitment to inclusion. When students dress with purpose, they learn with purpose.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🤝', label: 'Unity & Equality', desc: 'Moving past social pressures, focusing on shared values' },
                { icon: '🎯', label: 'Focus', desc: 'Minimizing distractions, maximizing academic achievement' },
                { icon: '💼', label: 'Professionalism', desc: 'Instilling pride and discipline for the world ahead' },
                { icon: '🌍', label: 'Badge of Pride', desc: 'Ambassadors of integrity and excellence' },
              ].map((u, i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xl">{u.icon}</span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white mt-2">{u.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Transport */}
        <motion.div {...stagger(1)} className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="flex items-center gap-3"><Bus size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">School Transport</h3></div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">A successful school day begins before the first bell. Our premier transport service prioritizes safety, comfort, and punctuality of every student.</p>
            <div className="space-y-3">
              {[
                { icon: '🛡', text: 'Modern fleet with advanced safety features and trained staff' },
                { icon: '🕒', text: 'Reliable schedules ensuring students arrive refreshed and on time' },
                { icon: '📍', text: 'Strategic routes serving a wide variety of locations' },
                { icon: '🌱', text: 'Building independence, punctuality, and social etiquette' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 aspect-[4/3]">
            <img src="https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=800&auto=format&fit=crop" alt="School Transport" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
          </div>
        </motion.div>

        {/* Facilities */}
        <motion.div {...stagger(2)}>
          <div className="flex items-center gap-3 mb-8"><TreePine size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Our Facilities</h3></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&auto=format&fit=crop', icon: Circle, title: 'Football Pitch', desc: 'Professionally maintained pitch for PE, training, and tournaments' },
              { img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop', icon: Trophy, title: 'Basketball Courts', desc: 'Year-round courts for skill-building and inter-house competitions' },
              { img: 'https://images.unsplash.com/photo-1416169607655-0c2b3ce2e1cc?w=600&auto=format&fit=crop', icon: TreePine, title: 'Green Spaces', desc: 'Expansive lawns and gardens for outdoor learning and community events' },
            ].map((f, i) => (
              <motion.div key={i} {...stagger(i)} whileHover={{ y: -8 }} className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
                <div className="aspect-[4/3] overflow-hidden"><img src={f.img} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /></div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2"><f.icon size={18} className="text-school-primary" /><h4 className="font-black text-slate-900 dark:text-white">{f.title}</h4></div>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   6. OUR TEAM — Leadership Placeholders
   ═══════════════════════════════════════════════════════════════ */
const team = [
  { name: 'Ato Girma Lemi', role: 'Founder & Owner', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop' },
  { name: 'W/ro Tigist Abera', role: 'Director — Kebele 10', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop' },
  { name: 'Ato Dawit Mengistu', role: 'Director — Mogoro', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop' },
  { name: 'W/ro Hana Solomon', role: 'Vice Director — 180 Village', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop' },
  { name: 'Ato Yonas Bekele', role: 'Director — Awash', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop' },
];

export const TeamSection = () => (
  <section className="py-32 bg-white dark:bg-slate-950 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6">
      <motion.div {...fadeUp} className="section-header">
        <span className="section-subtitle">Leadership</span>
        <h2 className="section-title">Our Team</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-4">The dedicated leaders behind the Abdi Adama School network.</p>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {team.map((t, i) => (
          <motion.div key={i} {...stagger(i)} whileHover={{ y: -10 }} className="text-center group">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 group-hover:border-school-primary transition-colors duration-500 mb-4">
              <img src={t.img} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm">{t.name}</h4>
            <p className="text-[10px] font-black text-school-primary uppercase tracking-widest mt-1">{t.role}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
