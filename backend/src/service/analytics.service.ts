import prisma from '../config/prismaconfig.js';
import Logger from '../logger.js';

interface YearAnalytics {
  year: number;
  totalStudents: number;
  placedStudents: number;
  unplacedStudents: number;
  placementPercentage: number;
  companyWisePlacement: { companyName: string; count: number }[];
  skillDemand: { skill: string; count: number }[];
  eventSuccessRate: number;
  averagePackage: number;
  topCompanies: { name: string; package: number; students: number }[];
}

interface DashboardStats extends YearAnalytics {
  placementDistribution: { placed: number; unplaced: number };
  yearTrend: { year: number; placementPercentage: number }[];
}

// Demo data generator for previous years
const generateDemoData = (year: number): YearAnalytics => {
  const baseStudents = 450 + Math.floor(Math.random() * 100);
  const placedPercentage = 65 + Math.random() * 20; // 65-85%
  const placed = Math.floor(baseStudents * (placedPercentage / 100));

  const companies = [
    'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant',
    'Tech Mahindra', 'HCL', 'IBM', 'Capgemini', 'Microsoft',
    'Amazon', 'Google', 'Flipkart', 'PayTM', 'Oracle'
  ];

  const skills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js',
    'SQL', 'MongoDB', 'AWS', 'Docker', 'Machine Learning',
    'Data Structures', 'System Design', 'Spring Boot', 'Angular', 'Flutter'
  ];

  // Generate company-wise placement
  const numCompanies = 8 + Math.floor(Math.random() * 5);
  const selectedCompanies = companies
    .sort(() => Math.random() - 0.5)
    .slice(0, numCompanies);

  const companyWisePlacement = selectedCompanies.map(company => ({
    companyName: company,
    count: Math.floor(Math.random() * 30) + 5
  })).sort((a, b) => b.count - a.count);

  // Generate skill demand
  const numSkills = 10;
  const selectedSkills = skills
    .sort(() => Math.random() - 0.5)
    .slice(0, numSkills);

  const skillDemand = selectedSkills.map(skill => ({
    skill,
    count: Math.floor(Math.random() * 50) + 10
  })).sort((a, b) => b.count - a.count);

  // Generate top companies with packages
  const topCompanies = selectedCompanies.slice(0, 5).map(name => ({
    name,
    package: Math.floor(Math.random() * 20) + 5, // 5-25 LPA
    students: Math.floor(Math.random() * 25) + 5
  })).sort((a, b) => b.package - a.package);

  return {
    year,
    totalStudents: baseStudents,
    placedStudents: placed,
    unplacedStudents: baseStudents - placed,
    placementPercentage: Math.round(placedPercentage * 10) / 10,
    companyWisePlacement,
    skillDemand,
    eventSuccessRate: Math.round((70 + Math.random() * 20) * 10) / 10,
    averagePackage: Math.round((6 + Math.random() * 4) * 10) / 10,
    topCompanies
  };
};

export const getYearAnalytics = async (year: number): Promise<DashboardStats> => {
  try {
    const currentYear = new Date().getFullYear();

    // If requesting previous years, return demo data
    if (year < currentYear) {
      const demoData = generateDemoData(year);
      const yearTrend = Array.from({ length: 5 }, (_, i) => {
        const trendYear = year - 4 + i;
        return {
          year: trendYear,
          placementPercentage: 65 + Math.random() * 20
        };
      });

      return {
        ...demoData,
        placementDistribution: {
          placed: demoData.placedStudents,
          unplaced: demoData.unplacedStudents
        },
        yearTrend
      };
    }

    // Real data for current year
    const students = await prisma.studentProfile.findMany({
      include: {
        user: true
      }
    });

    const jobs = await prisma.jobPosts.findMany({});

    const events = await prisma.event.findMany();

    // Calculate KPIs
    const totalStudents = students.length;
    const placedStudents = students.filter(s => s.isPlaced).length;
    const unplacedStudents = totalStudents - placedStudents;
    const placementPercentage = totalStudents > 0
      ? Math.round((placedStudents / totalStudents) * 1000) / 10
      : 0;

    // Company-wise placement
    const companyMap: Record<string, number> = {};
    students.forEach(student => {
      if (student.isPlaced && student.placedCompany) {
        companyMap[student.placedCompany] = (companyMap[student.placedCompany] || 0) + 1;
      }
    });

    const companyWisePlacement = Object.entries(companyMap)
      .map(([companyName, count]) => ({ companyName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Skill demand analysis
    const skillMap: Record<string, number> = {};
    jobs.forEach((job: any) => {
      (job.skills || []).forEach((skill: string) => {
        skillMap[skill] = (skillMap[skill] || 0) + 1;
      });
    });

    const skillDemand = Object.entries(skillMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Event success rate (based on driveCompletedAt)
    const completedEvents = events.filter((e: any) => e.driveCompletedAt).length;
    const eventSuccessRate = events.length > 0
      ? Math.round((completedEvents / events.length) * 1000) / 10
      : 0;

    // Average package - using job CTC as proxy since StudentProfile doesn't have placedPackage
    const placedCompanySet = new Set(
      students.filter(s => s.isPlaced && s.placedCompany).map(s => s.placedCompany)
    );
    
const companyJobs = jobs.filter((j: any) =>
      j.companyname && placedCompanySet.has(j.companyname)
    );
    
    const averagePackage = companyJobs.length > 0
      ? Math.round((companyJobs.reduce((sum: number, j: any) => sum + (j.salary || 0), 0) / companyJobs.length) * 10) / 10
      : 0;

    // Top companies by package (using job salary)
    const companyPackages: Record<string, { total: number; count: number; max: number }> = {};
    jobs.forEach((job: any) => {
      if (job.companyname && job.salary) {
        if (!companyPackages[job.companyname]) {
          companyPackages[job.companyname] = { total: 0, count: 0, max: 0 };
        }
        companyPackages[job.companyname]!.total += job.salary;
        companyPackages[job.companyname]!.count += 1;
        companyPackages[job.companyname]!.max = Math.max(
          companyPackages[job.companyname]!.max,
          job.salary
        );
      }
    });

    // Get student count per company
    const companyStudentCount: Record<string, number> = {};
    students.forEach(s => {
      if (s.isPlaced && s.placedCompany) {
        companyStudentCount[s.placedCompany] = (companyStudentCount[s.placedCompany] || 0) + 1;
      }
    });

    const topCompanies = Object.entries(companyPackages)
      .map(([name, data]) => ({
        name,
        package: Math.round((data.max) * 10) / 10, // Use max package offered
        students: companyStudentCount[name] || 0
      }))
      .sort((a, b) => b.package - a.package)
      .slice(0, 10);

    // Year trend (current + 4 previous years with demo data)
    const yearTrend = [
      { year: currentYear - 4, placementPercentage: 68.5 },
      { year: currentYear - 3, placementPercentage: 72.3 },
      { year: currentYear - 2, placementPercentage: 75.8 },
      { year: currentYear - 1, placementPercentage: 78.2 },
      { year: currentYear, placementPercentage }
    ];

    return {
      year: currentYear,
      totalStudents,
      placedStudents,
      unplacedStudents,
      placementPercentage,
      companyWisePlacement,
      skillDemand,
      eventSuccessRate,
      averagePackage,
      topCompanies,
      placementDistribution: {
        placed: placedStudents,
        unplaced: unplacedStudents
      },
      yearTrend
    };
  } catch (error) {
    Logger.error('Error fetching analytics:', error);
    throw new Error('Failed to fetch analytics data');
  }
};

export const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  // Return current year + 4 previous years
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
};
