// User and Auth Types
export type RoleType = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: RoleType;
}

export interface LoginResponse {
  message: string;
  token: string;
  role: RoleType;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

// Job Types
export interface Job {
  id: string;
  companyname: string;
  jobrole: string;
  minMarks10: number;
  minMarks12: number | null;
  minCGPA: number;
  minExperience: number;
  skills: string[];
  salary: number;
  description: string | null;
  shortlistReady: boolean;
  excelUrl: string | null;
  shortlistCount: number;
  /** Student only: true when student is in auto-application shortlist for this job */
  isShortlisted?: boolean;
  interviewScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  companyname: string;
  jobrole: string;
  minMarks10: number;
  minMarks12?: number;
  minCGPA: number;
  minExperience: number;
  skills: string[];
  salary: number;
  description?: string;
}

export interface JobsResponse {
  message: string;
  count: number;
  jobs: Job[];
}

export interface JobResponse {
  message: string;
  job: Job;
}

export interface CreateJobResponse {
  message: string;
  jobpost: Job;
}

export interface CompanyRoleStat {
  role: string;
  openings: number;
}

export interface CompanyReviewSummary {
  interviewsAnalyzed: number;
  feedbackCount: number;
  averageFinalScore: number | null;
  averageAiScore: number | null;
  commonOutcome: string;
  recentReviews: string[];
}

export interface CompanyTopicStat {
  topic: string;
  frequency: number;
}

export interface CompanyAnalysisItem {
  companyname: string;
  totalOpenings: number;
  totalRoles: CompanyRoleStat[];
  topHiringRoles: CompanyRoleStat[];
  placementSummary: {
    placedStudents: number;
  };
  reviewSummary: CompanyReviewSummary;
  preparationTopics: CompanyTopicStat[];
}

export interface CompanyAnalysisResponse {
  message: string;
  since: string;
  totalCompanies: number;
  companies: CompanyAnalysisItem[];
}

// Profile Types
export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  placementEmail: string;
  profilePic: string;
  marks10: number;
  marks12: number | null;
  diplomaMarks: number | null;
  btechCGPA: number;
  resumeUrl: string | null;
  skills: string[];
  experience: number;
  isPlaced?: boolean;
  placedCompany?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin-only: update student profile (e.g. isPlaced) */
export interface UpdateStudentByAdminRequest {
  isPlaced?: boolean;
  placedCompany?: string | null;
  name?: string;
  placementEmail?: string;
  experience?: number;
  skills?: string[];
  marks10?: number;
  marks12?: number | null;
  diplomaMarks?: number | null;
  btechCGPA?: number;
}

export interface ProfileResponse {
  message: string;
  profile: StudentProfile;
}

export interface UpdateProfileRequest {
  name: string;
  placementEmail: string;
  experience?: number;
  skills?: string[];
  marks10: number;
  marks12?: number;
  diplomaMarks?: number;
  btechCGPA: number;
}

export interface UploadResumeResponse {
  message: string;
  updatedProfile: StudentProfile;
  parsedData: {
    name: string;
    placementEmail: string;
    experience: number;
    skills: string[];
    marks10: number;
    marks12: number | null;
    diplomaMarks: number | null;
    btechCGPA: number;
  };
}

export interface UploadProfilePicResponse {
  message: string;
  profilepicurl: string;
  profile: StudentProfile;
}

// Admin Profile Types
export interface AdminProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  designation: string;
  collegeName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfileResponse {
  message: string;
  profile: AdminProfile | null;
  user?: { name: string; email: string };
}

export interface UpdateAdminProfileRequest {
  designation: string;
  collegeName: string;
}

// Event Types
export interface Event {
  id: string;
  jobId?: string | null;
  venue: string;
  companyName: string;
  startTime: string;
  processOfDay: string;
  driveCompletedAt?: string | null;
  feedbackRequestsSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingFeedbackEventsResponse {
  message: string;
  count: number;
  events: Event[];
}

export interface SubmitEventFeedbackRequest {
  rating: number;
  interviewReview?: string;
  preparationTopics?: string;
}

export interface CreateEventRequest {
  jobId?: string;
  venue: string;
  companyName: string;
  startTime: string; // ISO string format
  processOfDay: string;
}

export interface UpdateEventRequest {
  jobId?: string;
  venue?: string;
  companyName?: string;
  startTime?: string; // ISO string format
  processOfDay?: string;
}

export interface EventsResponse {
  message: string;
  count: number;
  events: Event[];
}

export interface EventResponse {
  message: string;
  event: Event;
}

export interface CreateEventResponse {
  message: string;
  event: Event;
}

// All student profiles (admin report)
export interface AllStudentsResponse {
  message: string;
  count: number;
  profiles: StudentProfile[];
}

// Matching Types
export interface JobMatch {
  id: string;
  jobId: string;
  studentId: string;
  matchedSkills: string[];
  score: number;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    jobrole: string;
    companyname: string;
    skills: string[];
  };
}

export interface MyMatchesResponse {
  message: string;
  count: number;
  matches: JobMatch[];
}

export interface SkillDemand {
  skill: string;
  count: number;
}

export interface DashboardStats {
  totalMatches: number;
  averageMatchScore: number;
  shortlistedCount: number;
  skillDemands: SkillDemand[];
  recommendedSkills: string[];
}

// Interview Types
export type InterviewStatus = 'NOT_SCHEDULED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'TERMINATED';

export interface InterviewAnswer {
  id: string;
  interviewId: string;
  question: string;
  transcript: string;
  score: number;
  feedback: string | null;
  createdAt: string;
}

export interface InterviewDetails {
  id: string;
  jobMatchingId: string;
  studentId: string;
  jobId: string;
  status: InterviewStatus;
  isShortlisted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  aiScore: number | null;
  finalScore: number | null;
  verdict: string | null;
  violationCount: number;
  createdAt: string;
  updatedAt: string;
  JobPosts?: { jobrole: string; companyname: string; skills?: string[] };
  StudentProfile?: { name: string; placementEmail: string; btechCGPA?: number };
  InterviewAnswer?: InterviewAnswer[];
}

export interface InterviewScheduleRequest {
  studentId: string;
  jobId: string;
  jobMatchingId: string;
}

export interface BulkScheduleInterviewRequest {
  jobId: string;
  studentIds: string[];
}

export interface ScheduleInterviewResponse {
  message: string;
  interview: InterviewDetails;
}

export interface BulkScheduleInterviewResponse {
  message: string;
  scheduled: number;
  failed: number;
  interviews: InterviewDetails[];
}

export interface InterviewResponseType {
  message: string;
  interview: InterviewDetails;
}

export interface NextQuestionResponse {
  done: boolean;
  questionNumber: number;
  totalQuestions: number;
  question?: string;
}

export interface SubmitAnswerResponse {
  message: string;
  score: number;
  feedback: string;
  answerId: string;
  answeredCount: number;
  totalQuestions: number;
}

export interface CompleteInterviewResponse {
  message: string;
  aiScore: number;
  verdict: string;
  isShortlisted: boolean;
  interview: InterviewDetails;
}

// API Error Response
export interface ApiError {
  message: string;
}
