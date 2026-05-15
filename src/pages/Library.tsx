
import { Book, Search, Plus, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { toast } from '../components/Toast';
import { apiFetch } from '../utils/apiClient';


interface BookType {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  shelf: string;
  total: number;
  available: number;
  book_code?: string;
}

interface LoanType {
  id: string;
  book_id: string;
  student_id: string;
  book_title: string;
  student_name: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  days_overdue: number;
  fine_amount: number;
  book_code?: string;
  loan_date?: string;
}

export const Library = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<BookType[]>([]);
  const [loans, setLoans] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [issueData, setIssueData] = useState({ book_id: '', student_id: '', due_date: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookData, setNewBookData] = useState({
    title: '',
    author: '',
    isbn: '',
    shelf_location: '',
    stock: 1
  });
  const [stats, setStats] = useState({
    totalCollection: 0,
    activeLoans: 0,
    availableNow: 0
  });

  // const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, loansRes, statsRes] = await Promise.all([
        apiFetch('/api/library/books'),
        apiFetch('/api/library/loans'),
        apiFetch('/api/library/stats'),
      ]);

      if (booksRes.ok) {
        const booksJson = await booksRes.json();
        setBooks(booksJson.data || []);
      } else {
        toast.error('Failed to load books from server.');
      }

      if (loansRes.ok) {
        const loansJson = await loansRes.json();
        setLoans(loansJson.data || []);
      } else {
        toast.error('Failed to load loans from server.');
      }

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setStats(statsJson);
      }
    } catch {
      toast.error('Network error — could not reach the library server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/library/add-book', {
        method: 'POST',
        body: JSON.stringify(newBookData)
      });
      if (res.ok) {
        toast.success('Book added to collection successfully.');
        setShowAddModal(false);
        setNewBookData({ title: '', author: '', isbn: '', shelf_location: '', stock: 1 });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add book.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/library/issue', {
        method: 'POST',
        body: JSON.stringify(issueData)
      });
      if (res.ok) {
        setShowIssueModal(false);
        setIssueData({ book_id: '', student_id: '', due_date: '' });
        toast.success('Book issued successfully.');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to issue book');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    setReturningId(loanId);
    try {
      const res = await apiFetch(`/api/library/return/${loanId}`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success('Book return recorded successfully.');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to return book');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setReturningId(null);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn?.includes(searchQuery)
  );

  const overdueLoans = loans.filter(l => !l.returned_at && new Date(l.due_date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Library Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize school books, track loans, and manage resources.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
          >
            <Plus size={18} />
            <span>Add Book</span>
          </button>
          <button 
            onClick={() => setShowIssueModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
          >
            <Plus size={18} />
            <span>Issue Book</span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'catalog'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Book Catalog
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'loans'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Loans
          {overdueLoans.length > 0 && (
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px]">
              {overdueLoans.length} Overdue
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Total Collection</p>
          <h3 className="text-3xl font-bold mt-1">{stats.totalCollection} Books</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
            <Book size={14} />
            <span>Inventory across all branches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Currently Borrowed</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.activeLoans}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-600">
            <Clock size={14} />
            <span>{overdueLoans.length} Overdue returns</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Available Now</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.availableNow}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <CheckCircle size={14} />
            <span>Ready for checkout</span>
          </div>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Book Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ISBN / Shelf</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{book.title}</p>
                      <p className="text-xs text-slate-500 font-medium">Author: {book.author}</p>
                      <p className="text-xs text-blue-600 font-bold mt-1">Book ID: {book.book_code || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono text-slate-500">{book.isbn || 'N/A'}</p>
                      <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">Rack: {book.shelf || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{book.available} / {book.total}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        book.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {book.available > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setIssueData({...issueData, book_id: book.id});
                          setShowIssueModal(true);
                        }}
                        disabled={book.available <= 0}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 text-xs font-bold"
                      >
                        Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Book Info</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((loan) => (
                  <tr key={loan.id} className={!loan.returned_at && new Date(loan.due_date) < new Date() ? 'bg-rose-50/30' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">{loan.book_title}</div>
                      <div className="text-xs text-slate-500 font-bold">Book ID: {loan.book_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">{loan.student_name}</div>
                      <div className="text-xs text-slate-500 font-bold">Student ID: {(loan as any).student_school_id || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">Issued: {new Date(loan.loan_date || (loan as any).borrowed_at).toLocaleDateString()}</div>
                      {loan.returned_at && (
                        <div className="text-sm text-emerald-600 font-bold">Returned: {new Date(loan.returned_at).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {loan.returned_at ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800">
                          Returned
                        </span>
                      ) : (
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${new Date(loan.due_date) < new Date() ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {new Date(loan.due_date) < new Date() ? 'Overdue' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!loan.returned_at && (
                        <button 
                          onClick={() => handleReturnBook(loan.id)}
                          disabled={returningId === loan.id}
                          className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1"
                        >
                          {returningId === loan.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Mark Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Book</h3>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Book Title</label>
                  <input 
                    type="text" 
                    value={newBookData.title}
                    onChange={(e) => setNewBookData({...newBookData, title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                    placeholder="Enter title..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Author</label>
                  <input 
                    type="text" 
                    value={newBookData.author}
                    onChange={(e) => setNewBookData({...newBookData, author: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                    placeholder="Enter author..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ISBN</label>
                    <input 
                      type="text" 
                      value={newBookData.isbn}
                      onChange={(e) => setNewBookData({...newBookData, isbn: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                      placeholder="Optional ISBN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shelf Location</label>
                    <input 
                      type="text" 
                      value={newBookData.shelf_location}
                      onChange={(e) => setNewBookData({...newBookData, shelf_location: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                      placeholder="e.g. A-12"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Stock</label>
                  <input 
                    type="number" 
                    value={newBookData.stock}
                    onChange={(e) => setNewBookData({...newBookData, stock: parseInt(e.target.value || '1')})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSaving ? 'Saving...' : 'Add to Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Issue Book</h3>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Book ID</label>
                <select 
                  value={issueData.book_id}
                  onChange={(e) => setIssueData({...issueData, book_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  required
                >
                  <option value="">Select a book...</option>
                  {books.filter(b => b.available > 0).map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.available} left)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student School ID</label>
                <input 
                  type="text" 
                  value={issueData.student_id}
                  onChange={(e) => setIssueData({...issueData, student_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  placeholder="e.g. STU-1111"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={issueData.due_date}
                  onChange={(e) => setIssueData({...issueData, due_date: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSaving ? 'Issuing...' : 'Confirm Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
