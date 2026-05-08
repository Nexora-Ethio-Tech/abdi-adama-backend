import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Layers,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('abdi_adama_token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  section_name: string;
  capacity: number;
  current_count: number;
  available: number;
  room_teacher_name?: string;
}

interface Grade {
  grade_id: string;
  grade_level: string;
  sections: Section[] | null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { type: 'success' | 'error'; text: string }

// ─── Main Component ────────────────────────────────────────────────────────────
export const AcademicManagement = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  // ─── Modals ────────────────────────────────────────────────────
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);

  const [showBulkSection, setShowBulkSection] = useState<string | null>(null); // grade_id
  const [bulkCount, setBulkCount] = useState(4);
  const [bulkCapacity, setBulkCapacity] = useState(40);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ sectionId: string; name: string } | null>(null);

  // ─── Toast Helper ──────────────────────────────────────────────
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Fetch Grades ──────────────────────────────────────────────
  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/academic/grades/with-sections`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Grade[] = await res.json();
      setGrades(data);
    } catch {
      showToast('error', 'Could not load grades. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // ─── Create Grade ──────────────────────────────────────────────
  const handleCreateGrade = async () => {
    if (!newGradeLevel.trim()) return;
    setGradeLoading(true);
    try {
      const res = await fetch(`${API}/api/academic/grades`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ grade_level: newGradeLevel.trim() }),
      });
      if (!res.ok) throw new Error();
      showToast('success', `Grade ${newGradeLevel} created!`);
      setNewGradeLevel('');
      setShowAddGrade(false);
      fetchGrades();
    } catch {
      showToast('error', 'Failed to create grade.');
    } finally {
      setGradeLoading(false);
    }
  };

  // ─── Bulk Create Sections ──────────────────────────────────────
  const handleBulkCreate = async (gradeId: string) => {
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/api/academic/sections/bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ grade_id: gradeId, section_count: bulkCount, capacity: bulkCapacity }),
      });
      if (!res.ok) throw new Error();
      showToast('success', `${bulkCount} sections created!`);
      setShowBulkSection(null);
      fetchGrades();
    } catch {
      showToast('error', 'Failed to create sections.');
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── Delete Section ────────────────────────────────────────────
  const handleDeleteSection = async (sectionId: string) => {
    try {
      const res = await fetch(`${API}/api/academic/sections/${sectionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast('success', 'Section removed.');
      setDeleteConfirm(null);
      fetchGrades();
    } catch {
      showToast('error', 'Failed to delete section.');
    }
  };

  // ─── Section letter → colour mapping ─────────────────────────
  const sectionColors: Record<string, string> = {
    A: 'from-violet-500 to-purple-600',
    B: 'from-blue-500 to-cyan-600',
    C: 'from-emerald-500 to-teal-600',
    D: 'from-amber-500 to-orange-600',
    E: 'from-rose-500 to-pink-600',
    F: 'from-indigo-500 to-blue-600',
    G: 'from-green-500 to-emerald-600',
    H: 'from-sky-500 to-blue-500',
  };
  const getSectionColor = (name: string) =>
    sectionColors[name.toUpperCase()] || 'from-slate-500 to-slate-600';

  // ─── Derived stats ─────────────────────────────────────────────
  const totalSections = grades.reduce((a, g) => a + (g.sections?.length ?? 0), 0);
  const totalCapacity = grades.reduce(
    (a, g) => a + (g.sections?.reduce((b, s) => b + s.capacity, 0) ?? 0), 0
  );
  const totalStudents = grades.reduce(
    (a, g) => a + (g.sections?.reduce((b, s) => b + s.current_count, 0) ?? 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-semibold transition-all animate-in slide-in-from-right-4 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.text}
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-violet-500/20">
              <GraduationCap size={24} className="text-violet-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Academic Structure</h1>
          </div>
          <p className="text-slate-400 text-sm pl-1">Manage grades, sections, and class capacities</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchGrades}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddGrade(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition-all hover:scale-105"
          >
            <Plus size={16} />
            Add Grade
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Grades', value: grades.length, icon: GraduationCap, color: 'violet' },
          { label: 'Total Sections', value: totalSections, icon: Layers, color: 'blue' },
          { label: 'Enrolled Students', value: `${totalStudents} / ${totalCapacity}`, icon: Users, color: 'emerald' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-4 backdrop-blur">
            <div className={`p-3 rounded-xl bg-${s.color}-500/20`}>
              <s.icon size={22} className={`text-${s.color}-400`} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-white text-2xl font-black">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grades List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-24">
          <GraduationCap size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-semibold">No grades yet</p>
          <p className="text-slate-600 text-sm mt-1">Click "Add Grade" to create your first grade level.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grades.map((grade) => {
            const isExpanded = expandedGrade === grade.grade_id;
            const sections = grade.sections ?? [];
            const gradeStudents = sections.reduce((a, s) => a + s.current_count, 0);
            const gradeCapacity = sections.reduce((a, s) => a + s.capacity, 0);
            const fillPct = gradeCapacity > 0 ? Math.round((gradeStudents / gradeCapacity) * 100) : 0;

            return (
              <div key={grade.grade_id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur transition-all">
                {/* Grade Header */}
                <button
                  onClick={() => setExpandedGrade(isExpanded ? null : grade.grade_id)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <span className="text-white font-black text-sm">{grade.grade_level}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-bold text-lg">Grade {grade.grade_level}</h3>
                      <p className="text-slate-400 text-sm">{sections.length} sections · {gradeStudents}/{gradeCapacity} students · {fillPct}% full</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowBulkSection(grade.grade_id); setBulkCount(4); setBulkCapacity(40); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-bold transition-all"
                    >
                      <Plus size={14} /> Add Sections
                    </button>
                    {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                  </div>
                </button>

                {/* Fill bar */}
                <div className="px-6 pb-2">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${fillPct > 90 ? 'bg-rose-500' : fillPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {/* Sections Grid */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-4">
                    {sections.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                        <Layers size={32} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No sections yet.</p>
                        <button
                          onClick={() => { setShowBulkSection(grade.grade_id); setBulkCount(4); setBulkCapacity(40); }}
                          className="mt-3 text-violet-400 hover:text-violet-300 text-sm font-bold"
                        >
                          + Create sections
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {sections.map((section) => {
                          const pct = section.capacity > 0 ? Math.round((section.current_count / section.capacity) * 100) : 0;
                          return (
                            <div key={section.id} className="relative group bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-violet-500/50 transition-all">
                              {/* Delete btn */}
                              <button
                                onClick={() => setDeleteConfirm({ sectionId: section.id, name: `Grade ${grade.grade_level}-${section.section_name}` })}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getSectionColor(section.section_name)} flex items-center justify-center mb-3 shadow-lg`}>
                                <span className="text-white font-black text-sm">{section.section_name}</span>
                              </div>
                              <p className="text-white font-bold text-sm">Section {section.section_name}</p>
                              <p className="text-slate-400 text-xs mt-0.5">{section.current_count}/{section.capacity} students</p>
                              {section.room_teacher_name && (
                                <p className="text-slate-500 text-xs mt-1 truncate">📌 {section.room_teacher_name}</p>
                              )}
                              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className={`text-xs mt-1 font-semibold ${pct > 90 ? 'text-rose-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {section.capacity - section.current_count} spots left
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Grade Modal ── */}
      {showAddGrade && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-xl">Add New Grade</h2>
              <button onClick={() => setShowAddGrade(false)} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400"><X size={18} /></button>
            </div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">Grade Level</label>
            <input
              type="text"
              value={newGradeLevel}
              onChange={(e) => setNewGradeLevel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGrade()}
              placeholder="e.g. 1, 2, KG, Nursery..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              autoFocus
            />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddGrade(false)} className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition-colors">Cancel</button>
              <button
                onClick={handleCreateGrade}
                disabled={gradeLoading || !newGradeLevel.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
              >
                {gradeLoading ? 'Creating...' : 'Create Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Add Sections Modal ── */}
      {showBulkSection && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-black text-xl">Bulk Create Sections</h2>
              <button onClick={() => setShowBulkSection(null)} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400"><X size={18} /></button>
            </div>
            <p className="text-slate-400 text-sm mb-5">Creates sections A, B, C... automatically for this grade.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">Number of Sections</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBulkCount(Math.max(1, bulkCount - 1))} className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors">−</button>
                  <span className="flex-1 text-center text-white text-2xl font-black">{bulkCount}</span>
                  <button onClick={() => setBulkCount(Math.min(26, bulkCount + 1))} className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors">+</button>
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  Will create: {Array.from({ length: bulkCount }, (_, i) => String.fromCharCode(65 + i)).join(', ')}
                </p>
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">Capacity per Section</label>
                <input
                  type="number"
                  value={bulkCapacity}
                  onChange={(e) => setBulkCapacity(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBulkSection(null)} className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition-colors">Cancel</button>
              <button
                onClick={() => handleBulkCreate(showBulkSection)}
                disabled={bulkLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold transition-colors"
              >
                {bulkLoading ? 'Creating...' : `Create ${bulkCount} Sections`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-rose-400" />
            </div>
            <h2 className="text-white font-black text-lg mb-2">Delete Section?</h2>
            <p className="text-slate-400 text-sm mb-6">
              <strong className="text-white">{deleteConfirm.name}</strong> will be deactivated. Students already enrolled will not be removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition-colors">Cancel</button>
              <button
                onClick={() => handleDeleteSection(deleteConfirm.sectionId)}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
