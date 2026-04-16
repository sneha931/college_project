# Job-Student Matching Engine

## Overview
AI-powered matching engine that automatically matches students with jobs based on skill compatibility and sends notifications when match score >= 70%.

## Matching Algorithm

### Formula
```
Match Score = (matchedSkills / totalRequiredSkills) × 100
```

### Example
- **Job Required Skills**: `["Python", "React", "Node.js", "Docker", "AWS"]` (5 skills)
- **Student Skills**: `["Python", "React", "JavaScript", "Docker"]`
- **Matched Skills**: `["Python", "React", "Docker"]` (3 skills)
- **Match Score**: `(3 / 5) × 100 = 60%`

## Auto-Apply Logic

When a job is created or updated:
1. **Run Matching Engine** for all students
2. **Calculate Match Score** for each student
3. **If Score >= 70%**:
   - Save match to `JobMatching` table
   - Mark `autoShortlisted: true`
   - Send notification to student
   - Log auto-match event

## Workflow

```
Admin Creates Job
      ↓
Trigger Matching Engine (async)
      ↓
Fetch All Students
      ↓
For Each Student:
  - Calculate Match Score
  - Save to JobMatching table
  - If Score >= 70%:
      → Send Notification
      → Mark as Auto-Shortlisted
```

## API Endpoints

### 1. Trigger Matching Engine (Admin)
**POST** `/matching/run/:jobId`

Manually trigger matching for a specific job.

**Auth**: Admin only

**Response**:
```json
{
  "message": "Matching engine completed successfully",
  "result": {
    "jobId": "uuid",
    "totalStudents": 150,
    "matchedStudents": 45,
    "autoAppliedCount": 12,
    "matches": [
      {
        "studentId": "uuid",
        "studentName": "John Doe",
        "matchedSkills": ["Python", "React", "Docker"],
        "matchScore": 75,
        "autoApplied": true
      }
    ]
  }
}
```

### 2. Get Job Matches (Admin)
**GET** `/matching/job/:jobId`

Get all student matches for a specific job.

**Auth**: Admin only

**Response**:
```json
{
  "message": "Job matches retrieved successfully",
  "count": 45,
  "matches": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "studentId": "uuid",
      "matchedSkills": ["Python", "React", "Docker"],
      "score": 75,
      "createdAt": "2026-02-27T10:00:00Z",
      "student": {
        "id": "uuid",
        "name": "John Doe",
        "placementEmail": "john@college.edu",
        "skills": ["Python", "React", "JavaScript", "Docker"]
      }
    }
  ]
}
```

### 3. Get My Matches (Student)
**GET** `/matching/my-matches`

Get all job matches for the authenticated student.

**Auth**: Student only

**Response**:
```json
{
  "message": "Your job matches retrieved successfully",
  "count": 8,
  "matches": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "studentId": "uuid",
      "matchedSkills": ["Python", "React", "Node.js"],
      "score": 85,
      "createdAt": "2026-02-27T10:00:00Z",
      "job": {
        "id": "uuid",
        "jobrole": "Full Stack Developer",
        "companyname": "TechCorp",
        "skills": ["Python", "React", "Node.js", "MongoDB"]
      }
    }
  ]
}
```

### 4. Get Job Match Details (Student)
**GET** `/matching/job/:jobId/me`

Get match details for a specific job.

**Auth**: Student only

**Response**:
```json
{
  "message": "Match details retrieved successfully",
  "match": {
    "id": "uuid",
    "jobId": "uuid",
    "studentId": "uuid",
    "matchedSkills": ["Python", "React", "Docker"],
    "score": 75,
    "createdAt": "2026-02-27T10:00:00Z",
    "job": {
      "jobrole": "Backend Developer",
      "companyname": "Startup Inc",
      "skills": ["Python", "Docker", "PostgreSQL", "AWS"]
    },
    "student": {
      "name": "John Doe",
      "skills": ["Python", "React", "Docker", "JavaScript"]
    }
  }
}
```

## Database Schema

### JobMatching Table
```prisma
model JobMatching {
  id              String         @id @default(uuid())
  jobId           String
  studentId       String
  matchScore      Int            // 0-100 percentage
  matchedSkills   String[]       // Array of matched skills
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  job             JobPosts       @relation(...)
  student         StudentProfile @relation(...)

  @@unique([jobId, studentId])
  @@index([jobId])
  @@index([studentId])
}
```

## Notification Logic

When a student is auto-matched (score >= 70%):

**Title**: `"Job Match Found"`

**Message**: `"You have been automatically matched (75%) with TechCorp - Full Stack Developer. Check the job board!"`

**Delivery**: Real-time notification stored in Notification table

## Automatic Triggers

### Job Creation
When admin creates a new job:
```typescript
POST /jobs/create
  ↓
Create JobPosts record
  ↓
Trigger runMatchingEngine(jobId) [async]
  ↓
Match all students
  ↓
Send notifications for Score >= 70%
```

### Job Update
When admin updates job requirements:
```typescript
PUT /jobs/update/:id
  ↓
Update JobPosts record
  ↓
Clear old matchings
  ↓
Trigger runMatchingEngine(jobId) [async]
  ↓
Recalculate matches
  ↓
Send new notifications
```

## Service Functions

### Core Functions

#### `runMatchingEngine(jobId: string)`
Main matching engine that processes all students for a job.

**Returns**: `MatchingEngineResult`
```typescript
{
  jobId: string;
  totalStudents: number;
  matchedStudents: number;
  autoAppliedCount: number;
  matches: MatchResult[];
}
```

#### `calculateMatchScore(studentSkills, requiredSkills)`
Calculates match percentage and identifies matched skills.

**Returns**: `{ matchedSkills: string[], score: number }`

#### `getJobMatches(jobId: string)`
Retrieves all matches for a specific job (admin view).

#### `getStudentMatches(studentId: string)`
Retrieves all matches for a specific student (student view).

#### `getStudentJobMatch(studentId: string, jobId: string)`
Retrieves match details for a specific student-job pair.

## Configuration

### Auto-Apply Threshold
```typescript
const AUTO_APPLY_THRESHOLD = 70; // Percentage
```

Change this value to adjust when students are auto-notified.

## Example Usage (Frontend)

### Student: View My Matches
```typescript
const fetchMyMatches = async () => {
  const response = await fetch('/matching/my-matches', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.matches; // Array of job matches
};
```

### Admin: Trigger Matching
```typescript
const runMatching = async (jobId: string) => {
  const response = await fetch(`/matching/run/${jobId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  console.log(`Matched: ${data.result.matchedStudents} students`);
  console.log(`Auto-applied: ${data.result.autoAppliedCount} students`);
};
```

## Performance Considerations

- **Async Processing**: Matching runs asynchronously after job creation/update
- **Batch Operations**: Uses `createMany` for efficient bulk inserts
- **Indexing**: JobMatching table indexed on `jobId` and `studentId`
- **Caching**: Consider caching student skills for large datasets
- **Queue**: For production, use job queue (Bull/BullMQ) for matching tasks

## Logging

All matching operations are logged with Winston:
- Match engine start/completion
- Individual student matches
- Auto-apply events
- Notification deliveries
- Errors and failures

## Error Handling

- Job not found → 404 error
- Student profile missing → Skip gracefully
- Notification failure → Log error, continue matching
- Database errors → Rollback and log

## Future Enhancements

- [ ] Weighted skill matching (senior vs junior skills)
- [ ] CGPA and experience factor in match score
- [ ] Batch notifications (daily digest)
- [ ] Match history tracking
- [ ] A/B testing for threshold values
- [ ] Machine learning-based scoring
