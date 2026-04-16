import { useState, useEffect, useMemo } from 'react';
import { profileApi } from '../../api';
import { Loading } from '../../components';
import type { StudentProfile, UpdateStudentByAdminRequest } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const studentColumnOptions: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'placementEmail', label: 'Email' },
  { key: 'marks10', label: '10th Marks' },
  { key: 'marks12', label: '12th Marks' },
  { key: 'diplomaMarks', label: 'Diploma Marks' },
  { key: 'btechCGPA', label: 'B.Tech CGPA' },
  { key: 'experience', label: 'Experience (months)' },
  { key: 'skills', label: 'Skills' },
  { key: 'isPlaced', label: 'Placed' },
  { key: 'placedCompany', label: 'Placed Company' },
];

const StudentInfo = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<{
    open: boolean;
    student: StudentProfile | null;
  }>({ open: false, student: null });
  const [editForm, setEditForm] = useState<UpdateStudentByAdminRequest>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name',
    'placementEmail',
    'marks10',
    'btechCGPA',
    'experience',
    'isPlaced',
  ]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await profileApi.getAllStudentsForAdmin();
      setProfiles(response.profiles || []);
    } catch {
      setError('Failed to load student profiles.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.trim().toLowerCase();
    return profiles.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.placementEmail.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const openEdit = (student: StudentProfile) => {
    setEditModal({ open: true, student });
    setEditForm({
      isPlaced: student.isPlaced ?? false,
      placedCompany: student.placedCompany ?? '',
      name: student.name,
      placementEmail: student.placementEmail,
      marks10: student.marks10,
      marks12: student.marks12 ?? undefined,
      diplomaMarks: student.diplomaMarks ?? undefined,
      btechCGPA: student.btechCGPA,
      experience: student.experience ?? 0,
      skills: student.skills?.length ? student.skills : undefined,
    });
  };

  const closeEdit = () => {
    setEditModal({ open: false, student: null });
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editModal.student) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileApi.updateStudentByAdmin(editModal.student.id, editForm);
      setSuccess('Student profile updated successfully.');
      setProfiles(prev =>
        prev.map(p =>
          p.id === editModal.student!.id
            ? { ...p, ...editForm, isPlaced: editForm.isPlaced ?? p.isPlaced }
            : p
        )
      );
      closeEdit();
    } catch {
      setError('Failed to update student profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const generatePdf = (list: StudentProfile[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Student Profiles Report', 14, 18);

    const head = [
      studentColumnOptions
        .filter(c => selectedColumns.includes(c.key))
        .map(c => c.label),
    ];

    const body = list.map(student =>
      studentColumnOptions
        .filter(c => selectedColumns.includes(c.key))
        .map(c => {
          switch (c.key) {
            case 'name':
              return student.name;
            case 'placementEmail':
              return student.placementEmail;
            case 'marks10':
              return String(student.marks10 ?? '');
            case 'marks12':
              return student.marks12 != null ? String(student.marks12) : '';
            case 'diplomaMarks':
              return student.diplomaMarks != null
                ? String(student.diplomaMarks)
                : '';
            case 'btechCGPA':
              return String(student.btechCGPA ?? '');
            case 'experience':
              return String(student.experience ?? '');
            case 'skills':
              return (student.skills || []).join(', ');
            case 'isPlaced':
              return student.isPlaced ? 'Yes' : 'No';
            case 'placedCompany':
              return student.placedCompany ?? '';
            default:
              return '';
          }
        })
    );

    autoTable(doc, {
      head,
      body,
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save('student_profiles.pdf');
  };

  const handleDownloadPdf = async () => {
    if (selectedColumns.length === 0) {
      setPdfError('Please select at least one column');
      return;
    }
    setIsDownloadingPdf(true);
    setPdfError('');
    try {
      const response = await profileApi.getAllStudentsForAdmin();
      if (!response.profiles || response.profiles.length === 0) {
        setPdfError('No student profiles found.');
        return;
      }
      generatePdf(response.profiles);
      setIsPdfModalOpen(false);
    } catch {
      setPdfError('Failed to download student profiles. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) return <Loading fullScreen text="Loading students..." />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Student Info
            </h1>
            <p className="text-gray-600">
              Search students and update their details (e.g. placed status)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12"
              />
            </svg>
            Download Student Profiles PDF
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="search" className="sr-only">
            Search students
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    10th
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    12th / Diploma
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    CGPA
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Placed
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Company
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(p => (
                    <tr
                      key={p.id}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.placementEmail}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {p.marks10}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {p.marks12 != null
                          ? `${p.marks12}%`
                          : p.diplomaMarks != null
                            ? `${p.diplomaMarks}%`
                            : '–'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {p.btechCGPA}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isPlaced ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.placedCompany || '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.open && editModal.student && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Update student: {editModal.student.name}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-isPlaced"
                  checked={editForm.isPlaced ?? false}
                  onChange={e =>
                    setEditForm(f => ({ ...f, isPlaced: e.target.checked }))
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="edit-isPlaced"
                  className="text-sm font-medium text-gray-700"
                >
                  Placed
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placed Company
                </label>
                <input
                  type="text"
                  value={editForm.placedCompany ?? ''}
                  onChange={e =>
                    setEditForm(f => ({
                      ...f,
                      placedCompany: e.target.value,
                    }))
                  }
                  disabled={!editForm.isPlaced}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name ?? ''}
                  onChange={e =>
                    setEditForm(f => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placement Email
                </label>
                <input
                  type="email"
                  value={editForm.placementEmail ?? ''}
                  onChange={e =>
                    setEditForm(f => ({
                      ...f,
                      placementEmail: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    10th Marks
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.marks10 ?? ''}
                    onChange={e =>
                      setEditForm(f => ({
                        ...f,
                        marks10: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    B.Tech CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.btechCGPA ?? ''}
                    onChange={e =>
                      setEditForm(f => ({
                        ...f,
                        btechCGPA: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience (months)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editForm.experience ?? ''}
                  onChange={e =>
                    setEditForm(f => ({
                      ...f,
                      experience: e.target.value ? Number(e.target.value) : 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Column Selection Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Download Student Profiles
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Select the columns you want to include in the PDF report.
            </p>
            {pdfError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-sm text-red-700">{pdfError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {studentColumnOptions.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setPdfError('');
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center"
              >
                {isDownloadingPdf ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12"
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInfo;
