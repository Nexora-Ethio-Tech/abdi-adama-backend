
import { Book, Search, Plus, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BookType {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  shelf: string;
  total: number;
  available: number;
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
}

export const Library = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<BookType[]>([]);
  const [loans, setLoans] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({ book_id: '', student_id: '', due_date: '' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('abdi_adama_token');
    try {
      const [booksRes, loansRes] = await Promise.all([
        fetch(`${API_URL}/api/library/books`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/library/loans`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (booksRes.ok) setBooks(await booksRes.json());
      if (loansRes.ok) setLoans(await loansRes.json());
    } catch (err) {
      console.error('Failed to fetch library data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('abdi_adama_token');
    try {
      const res = await fetch(`${API_URL}/api/library/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
      });
      if (res.ok) {
        setShowIssueModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to issue book');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    const token = localStorage.getItem('abdi_adama_token');
    try {
      const res = await fetch(`${API_URL}/api/library/return/${loanId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to return book');
      }
    } catch (err) {
      console.error(err);
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
          <h3 className="text-3xl font-bold mt-1">{books.length} Books</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
            <Book size={14} />
            <span>Inventory across all branches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Currently Borrowed</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{loans.filter(l => !l.returned_at).length}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-600">
            <Clock size={14} />
            <span>{overdueLoans.length} Overdue returns</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Available Now</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{books.reduce((acc, b) => acc + (b.available || 0), 0)}</h3>
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
                      <p className="text-xs text-slate-500">{book.author}</p>
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
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Student / Book</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Dates</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Fine</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((loan) => (
                  <tr key={loan.id} className={!loan.returned_at && new Date(loan.due_date) < new Date() ? 'bg-rose-50/30' : ''}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold dark:text-slate-100">{loan.student_name}</p>
                      <p className="text-xs text-slate-500">{loan.book_title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Due: {new Date(loan.due_date).toLocaleDateString()}</p>
                      {loan.returned_at && <p className="text-[10px] text-emerald-600 uppercase font-bold mt-1">Returned: {new Date(loan.returned_at).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        loan.returned_at ? 'bg-emerald-100 text-emerald-700' : 
                        new Date(loan.due_date) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {loan.returned_at ? 'Returned' : new Date(loan.due_date) < new Date() ? 'Overdue' : 'Borrowed'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {loan.fine_amount > 0 ? (
                        <span className="text-xs font-bold text-rose-600">{loan.fine_amount} ETB</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!loan.returned_at && (
                        <button 
                          onClick={() => handleReturnBook(loan.id)}
                          className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-700"
                        >
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

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Issue Book</h3>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Book ID</label>
                <input 
                  type="text" 
                  value={issueData.book_id}
                  onChange={(e) => setIssueData({...issueData, book_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  placeholder="Paste UUID here..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student ID (Internal)</label>
                <input 
                  type="text" 
                  value={issueData.student_id}
                  onChange={(e) => setIssueData({...issueData, student_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  placeholder="Paste student UUID here..."
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
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
