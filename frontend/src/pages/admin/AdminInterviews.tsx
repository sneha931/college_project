import { useState, useEffect } from 'react';
import { interviewApi } from '../../api/interview';
import type { InterviewDetails } from '../../types';

type Filter = 'all' | 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';

export default function AdminInterviews() {
  const [interviews, setInterviews] = useState<InterviewDetails[]>([]);
  const [filtered, setFiltered] = useState<InterviewDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InterviewDetails | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    let list = interviews;
    if (filter !== 'all') list = list.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.StudentProfile?.name.toLowerCase().includes(q) ||
          i.JobPosts?.companyname.toLowerCase().includes(q) ||
          i.JobPosts?.jobrole.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [interviews, filter, search]);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const data = await interviewApi.getAllInterviews();
      setInterviews(data.interviews);
    } catch {
      setError('Failed to load interviews.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      SCHEDULED: 'bg-blue-100 text-blue-700',
      NOT_SCHEDULED: 'bg-gray-100 text-gray-600',
      TERMINATED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  const verdictBadge = (verdict: string | null | undefined, shortlisted: boolean) => {
    if (!verdict) return null;
    return shortlisted
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 font-medium">{error}</div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
          <p className="text-gray-500 text-sm mt-1">{interviews.length} total interviews</p>
        </div>
        <button onClick={fetchAll} className="text-sm text-blue-600 hover:underline">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by student, company, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['all', 'COMPLETED', 'IN_PROGRESS', 'SCHEDULED'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: interviews.length, color: 'blue' },
          { label: 'Completed', value: interviews.filter((i) => i.status === 'COMPLETED').length, color: 'green' },
          { label: 'In Progress', value: interviews.filter((i) => i.status === 'IN_PROGRESS').length, color: 'yellow' },
          { label: 'Shortlisted', value: interviews.filter((i) => i.isShortlisted).length, color: 'purple' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No interviews match your filter.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Company / Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">AI Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Verdict</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((interview) => (
                  <tr key={interview.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{interview.StudentProfile?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{interview.StudentProfile?.placementEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{interview.JobPosts?.companyname ?? '—'}</p>
                      <p className="text-xs text-gray-400">{interview.JobPosts?.jobrole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(interview.status)}`}>
                        {interview.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {interview.aiScore != null ? `${interview.aiScore}/100` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {interview.verdict ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${verdictBadge(interview.verdict, interview.isShortlisted)}`}>
                          {interview.isShortlisted ? 'Cleared 1st Round' : 'Not Cleared'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(interview)}
                        className="text-blue-600 text-xs font-medium hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selected.StudentProfile?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selected.JobPosts?.companyname} — {selected.JobPosts?.jobrole}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6">
              {/* Score summary */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">AI Score</p>
                  <p className="text-3xl font-bold text-gray-900">{selected.aiScore ?? '—'}</p>
                  {selected.aiScore != null && <p className="text-xs text-gray-400">out of 100</p>}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Verdict</p>
                  <p className={`text-lg font-bold ${selected.isShortlisted ? 'text-green-600' : 'text-red-600'}`}>
                    {selected.verdict ? (selected.isShortlisted ? 'Cleared 1st Round' : 'Not Cleared') : '—'}
                  </p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">CGPA</p>
                  <p className="text-3xl font-bold text-gray-900">{selected.StudentProfile?.btechCGPA ?? '—'}</p>
                </div>
              </div>

              {/* Answers */}
              {selected.InterviewAnswer && selected.InterviewAnswer.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Question & Answer Breakdown</h3>
                  <div className="space-y-4">
                    {selected.InterviewAnswer.map((ans, idx) => (
                      <div key={ans.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-gray-800 flex-1 pr-2">
                            Q{idx + 1}: {ans.question}
                          </p>
                          <span className={`text-sm font-bold flex-shrink-0 ${
                            ans.score >= 8 ? 'text-green-600' : ans.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {ans.score}/10
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <p className="text-xs text-gray-500 font-medium mb-1">Student Answer</p>
                          <p className="text-sm text-gray-700">{ans.transcript}</p>
                        </div>
                        <p className="text-xs text-gray-500 italic">💬 {ans.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No answers recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
