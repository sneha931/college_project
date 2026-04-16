import { useState, useEffect } from 'react';
import { analyticsApi } from '../../api';
import type { DashboardAnalytics } from '../../api/analytics';
import { Loading } from '../../components';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchAnalytics(selectedYear);
    }
  }, [selectedYear]);

  const fetchAvailableYears = async () => {
    try {
      const response = await analyticsApi.getAvailableYears();
      setAvailableYears(response.years);
    } catch (err) {
      console.error('Failed to fetch years:', err);
    }
  };

  const fetchAnalytics = async (year: number) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await analyticsApi.getDashboardAnalytics(year);
      setAnalytics(response.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!analytics) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Placement Analytics Report', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Academic Year: ${selectedYear}`, pageWidth / 2, 23, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

    // KPI Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Students', analytics.totalStudents.toString()],
        ['Placed Students', analytics.placedStudents.toString()],
        ['Unplaced Students', analytics.unplacedStudents.toString()],
        ['Placement Percentage', `${analytics.placementPercentage}%`],
        ['Average Package', `${analytics.averagePackage} LPA`],
        ['Event Success Rate', `${analytics.eventSuccessRate}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Company-wise Placement
    doc.addPage();
    doc.text('Company-wise Placement', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Company Name', 'Students Placed']],
      body: analytics.companyWisePlacement.map(c => [c.companyName, c.count.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Top Companies
    doc.addPage();
    doc.text('Top Companies by Package', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Company', 'Package (LPA)', 'Students']],
      body: analytics.topCompanies.map(c => [c.name, c.package.toString(), c.students.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Skill Demand
    doc.addPage();
    doc.text('Top Skills in Demand', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Skill', 'Demand Count']],
      body: analytics.skillDemand.slice(0, 15).map(s => [s.skill, s.count.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Year Trend
    doc.addPage();
    doc.text('Year-wise Placement Trend', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Year', 'Placement %']],
      body: analytics.yearTrend.map(y => [y.year.toString(), `${y.placementPercentage}%`]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Placement_Analytics_${selectedYear}.pdf`);
  };

  const exportToExcel = () => {
    if (!analytics) return;

    const workbook = XLSX.utils.book_new();

    // KPI Summary Sheet
    const kpiData = [
      ['Metric', 'Value'],
      ['Academic Year', selectedYear],
      ['Total Students', analytics.totalStudents],
      ['Placed Students', analytics.placedStudents],
      ['Unplaced Students', analytics.unplacedStudents],
      ['Placement Percentage', `${analytics.placementPercentage}%`],
      ['Average Package', `${analytics.averagePackage} LPA`],
      ['Event Success Rate', `${analytics.eventSuccessRate}%`],
    ];
    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

    // Company-wise Placement Sheet
    const companyData = [
      ['Company Name', 'Students Placed'],
      ...analytics.companyWisePlacement.map(c => [c.companyName, c.count])
    ];
    const companySheet = XLSX.utils.aoa_to_sheet(companyData);
    XLSX.utils.book_append_sheet(workbook, companySheet, 'Company Placements');

    // Top Companies Sheet
    const topCompaniesData = [
      ['Company', 'Package (LPA)', 'Students'],
      ...analytics.topCompanies.map(c => [c.name, c.package, c.students])
    ];
    const topCompaniesSheet = XLSX.utils.aoa_to_sheet(topCompaniesData);
    XLSX.utils.book_append_sheet(workbook, topCompaniesSheet, 'Top Companies');

    // Skill Demand Sheet
    const skillData = [
      ['Skill', 'Demand Count'],
      ...analytics.skillDemand.map(s => [s.skill, s.count])
    ];
    const skillSheet = XLSX.utils.aoa_to_sheet(skillData);
    XLSX.utils.book_append_sheet(workbook, skillSheet, 'Skill Demand');

    // Year Trend Sheet
    const trendData = [
      ['Year', 'Placement %'],
      ...analytics.yearTrend.map(y => [y.year, y.placementPercentage])
    ];
    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Year Trend');

    XLSX.writeFile(workbook, `Placement_Analytics_${selectedYear}.xlsx`);
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading analytics..." />;
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold">{error || 'Failed to load analytics'}</p>
          </div>
          <button onClick={() => fetchAnalytics(selectedYear)} className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const placementPieData = [
    { name: 'Placed', value: analytics.placementDistribution.placed },
    { name: 'Unplaced', value: analytics.placementDistribution.unplaced },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive placement analytics and insights</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year} {year === new Date().getFullYear() ? '(Current)' : '(Demo)'}
                  </option>
                ))}
              </select>

              {/* Export Buttons */}
              <button
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Total Students</h3>
            <p className="text-4xl font-bold">{analytics.totalStudents}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Placed</h3>
            <p className="text-4xl font-bold">{analytics.placedStudents}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Unplaced</h3>
            <p className="text-4xl font-bold">{analytics.unplacedStudents}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Placement %</h3>
            <p className="text-4xl font-bold">{analytics.placementPercentage}%</p>
          </div>
        </div>

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-4 rounded-lg">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-600 text-sm font-semibold mb-1">Average Package</h3>
                <p className="text-3xl font-bold text-gray-900">{analytics.averagePackage} LPA</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-4 rounded-lg">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-600 text-sm font-semibold mb-1">Event Success Rate</h3>
                <p className="text-3xl font-bold text-gray-900">{analytics.eventSuccessRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Company-wise Placement Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Company-wise Placement</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.companyWisePlacement.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="companyName" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {analytics.companyWisePlacement.slice(0, 10).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Placement Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Placement Distribution</h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={placementPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Year Trend Line Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Placement Trend (5 Years)</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analytics.yearTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="placementPercentage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="Placement %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Skill Demand Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Top Skills in Demand</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.skillDemand.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="skill" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Companies by Package</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package (LPA)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topCompanies.map((company, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">{company.package} LPA</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{company.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
