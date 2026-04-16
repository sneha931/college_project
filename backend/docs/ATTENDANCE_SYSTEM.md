# Attendance Session Management System - Implementation Guide

## Overview

The Attendance Session Management System adds comprehensive attendance tracking capabilities to your event management platform. Teachers can create attendance sessions with QR codes, students can mark attendance by scanning, and teachers can view live attendance updates and historical records.

## Backend Implementation

### 1. Database Schema (Prisma)

Three new models have been added to your Prisma schema:

#### AttendanceSession Model

- `id`: Unique identifier (UUID)
- `sessionId`: Unique session identifier (UUID)
- `eventId`: Foreign key to Event
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- Relationships:
  - `event`: Links to Event model
  - `attendance`: One-to-many relationship with Attendance records

#### Attendance Model

- `id`: Unique identifier (UUID)
- `studentId`: Foreign key to StudentProfile
- `sessionId`: Foreign key to AttendanceSession
- `timestamp`: When attendance was marked
- Relationships:
  - `student`: Links to StudentProfile
  - `attendanceSession`: Links to AttendanceSession

The Student model now has an `attendance` relationship to track all attendance records.

### 2. Backend APIs

#### POST `/attendance/create-session`

Creates a new attendance session for an event.

**Request:**

```json
{
  "eventId": "event-uuid-here"
}
```

**Response:**

```json
{
  "success": true,
  "sessionId": "unique-session-uuid",
  "message": "Attendance session created successfully"
}
```

**Authentication:** Admin only

#### POST `/attendance/mark-attendance`

Records attendance for a student in a session.

**Request:**

```json
{
  "studentId": "student-uuid",
  "sessionId": "session-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "attendance": {
    "studentId": "student-uuid",
    "studentName": "John Doe",
    "sessionId": "session-uuid",
    "timestamp": "2026-03-16T10:30:00Z"
  }
}
```

**Authentication:** Any authenticated user (students scan and post their own attendance)

#### GET `/attendance/session-attendance/:sessionId`

Retrieves all attendance records for a specific session.

**Response:**

```json
{
  "success": true,
  "sessionInfo": {
    "sessionId": "session-uuid",
    "eventName": "Google Recruitment Drive",
    "venue": "Auditorium A",
    "createdAt": "2026-03-16T10:00:00Z"
  },
  "attendanceCount": 45,
  "students": [
    {
      "studentId": "student-uuid",
      "studentName": "John Doe",
      "email": "john@college.edu",
      "cgpa": 8.5,
      "attendanceTime": "2026-03-16T10:05:00Z"
    }
  ]
}
```

**Authentication:** Admin only

#### GET `/attendance/event-sessions/:eventId`

Retrieves all attendance sessions for an event.

**Response:**

```json
{
  "success": true,
  "eventInfo": {
    "eventId": "event-uuid",
    "companyName": "Google",
    "venue": "Auditorium A"
  },
  "sessions": [
    {
      "sessionId": "session-uuid",
      "createdAt": "2026-03-16T10:00:00Z",
      "attendanceCount": 45
    }
  ]
}
```

**Authentication:** Admin only

## Frontend Implementation

### 1. Dependencies

Added to `package.json`:

- `qrcode.react`: ^1.0.1 (QR code generation)

Install with:

```bash
npm install
```

### 2. API Service

File: `src/api/attendance.ts`

Provides TypeScript-typed API methods:

- `createSession(eventId, token)` - Create new session
- `markAttendance(studentId, sessionId, token)` - Mark attendance
- `getSessionAttendance(sessionId, token)` - Get session records
- `getEventSessions(eventId, token)` - Get all sessions for event

### 3. Components

#### AttendanceSession Component

**File:** `src/components/AttendanceSession.tsx`

Modal component for managing active attendance sessions.

**Features:**

- Start Session button - Creates new session and generates QR code
- QR Code Display - Shows session QR code for scanning
- Download QR Button - Download QR code as PNG image
- Live Attendance List - Real-time updates (polls every 3 seconds)
- Student Details - Name, email, CGPA, attendance time
- Session Info - Event name, venue, session creation time
- Stop Session button - Ends the polling

**Props:**

```typescript
interface AttendanceSessionProps {
  eventId: string; // Event ID
  eventName: string; // Event/Company name
  token: string; // Auth token
  onClose: () => void; // Callback to close modal
}
```

**Usage:**

```tsx
import { AttendanceSession } from '../components';

// In your component
const [showAttendance, setShowAttendance] = useState(false);

<AttendanceSession
  eventId={eventId}
  eventName="Google Recruitment"
  token={authToken}
  onClose={() => setShowAttendance(false)}
/>;
```

#### AttendanceHistory Component

**File:** `src/components/AttendanceHistory.tsx`

Modal component for viewing historical attendance records.

**Features:**

- Sessions List - All previous sessions for the event
- Session Details - View details of selected session
- Attendance Table - List of all students with attendance times
- Download CSV - Export attendance records
- Summary Stats - Total present, average CGPA, session ID

**Props:**

```typescript
interface AttendanceHistoryProps {
  eventId: string; // Event ID
  eventName: string; // Event/Company name
  token: string; // Auth token
  onClose: () => void; // Callback to close modal
}
```

**Usage:**

```tsx
import { AttendanceHistory } from '../components';

// In your component
const [showHistory, setShowHistory] = useState(false);

<AttendanceHistory
  eventId={eventId}
  eventName="Google Recruitment"
  token={authToken}
  onClose={() => setShowHistory(false)}
/>;
```

## Integration Steps

### Step 1: Update Database

Run Prisma migrations to create new tables:

```bash
cd backend
npx prisma migrate dev --name add_attendance_models
npx prisma generate
```

### Step 2: Restart Backend

```bash
npm run dev
```

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 4: Add Components to Event Management Page

Example integration in your event management page (e.g., `Events.tsx` or `admin/EventManagement.tsx`):

```tsx
import React, { useState } from 'react';
import { AttendanceSession, AttendanceHistory } from '../components';

const EventManagementPage = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const token = localStorage.getItem('token');

  return (
    <div>
      {/* Your existing event list */}
      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <h3>{event.companyName}</h3>
            <p>{event.venue}</p>

            {/* Action buttons */}
            <div className="event-actions">
              <button
                onClick={() => {
                  setSelectedEvent(event);
                  setShowAttendance(true);
                }}
                className="btn btn-primary"
              >
                Start Attendance
              </button>

              <button
                onClick={() => {
                  setSelectedEvent(event);
                  setShowHistory(true);
                }}
                className="btn btn-secondary"
              >
                View History
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAttendance && selectedEvent && (
        <AttendanceSession
          eventId={selectedEvent.id}
          eventName={selectedEvent.companyName}
          token={token}
          onClose={() => setShowAttendance(false)}
        />
      )}

      {showHistory && selectedEvent && (
        <AttendanceHistory
          eventId={selectedEvent.id}
          eventName={selectedEvent.companyName}
          token={token}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default EventManagementPage;
```

## System Flow

### Teacher/Admin Flow:

1. Navigate to event management section
2. Click "Start Attendance" for an event
3. Backend generates unique `sessionId`
4. QR code displays on screen with `sessionId` encoded
5. Teacher can optionally download QR code
6. Monitor live attendance list in real-time
7. Stop session when done

### Student Flow (Mobile/Web):

1. Receive QR code (via display, email, or app)
2. Scan QR code with mobile device
3. Mobile app extracts `sessionId`
4. Mobile app sends POST request to `/attendance/mark-attendance`
5. Backend confirms attendance recorded
6. Student sees success message
7. Teacher dashboard updates in real-time

### History Review Flow:

1. Click "View History" for an event
2. View all previous attendance sessions
3. Click on a session to see detailed records
4. View student attendance with times
5. Download records as CSV for further analysis

## Testing

### Test Create Session

```bash
curl -X POST http://localhost:3000/attendance/create-session \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId": "event-uuid-here"}'
```

### Test Mark Attendance

```bash
curl -X POST http://localhost:3000/attendance/mark-attendance \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-uuid", "sessionId": "session-uuid"}'
```

### Test Get Session Attendance

```bash
curl -X GET http://localhost:3000/attendance/session-attendance/session-uuid \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Get Event Sessions

```bash
curl -X GET http://localhost:3000/attendance/event-sessions/event-uuid \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Features Breakdown

### QR Code Generation

- Uses `qrcode.react` to generate QR codes
- Encodes the unique `sessionId`
- Can be downloaded as PNG image
- High error correction level (Q) for reliability

### Live Attendance Tracking

- Polls backend every 3 seconds for updates
- Displays real-time list of attending students
- Shows student name, email, CGPA, and attendance time
- Visual indicator showing number of attendees

### Attendance History

- Lists all previous sessions for an event
- Click to view detailed attendance records
- Table view with sortable data
- Statistics: total present, average CGPA
- CSV export for external analysis

### Security Features

- Admin-only endpoints for creating sessions and viewing records
- Students can only mark their own attendance
- Authentication required for all API calls
- Unique session IDs prevent unauthorized access

## Troubleshooting

### QRCode Not Displaying

- Ensure `qrcode.react` is properly installed: `npm install qrcode.react`
- Check browser console for errors
- Verify Tailwind CSS is properly configured

### API Errors

- Check backend logs: `npm run dev` in backend directory
- Verify authentication token is valid
- Ensure `eventId` and `sessionId` are correct UUIDs

### Attendance Not Updating Live

- Check network tab in browser devtools
- Verify polling interval (3 seconds) in component
- Check backend database for records

### Database Migration Issues

- Ensure Prisma is properly configured
- Check `.env` file has correct `DATABASE_URL`
- Run: `npx prisma db push` if migrate doesn't work

## Future Enhancements

1. **QR Code Validation**: Add expiration time to QR codes
2. **Geolocation**: Track location of attendance markings
3. **Mobile App Integration**: Native mobile app for scanning
4. **Analytics**: Detailed attendance analytics and reports
5. **Notifications**: Real-time notifications for attendance events
6. **Late Attendance**: Track how late students mark attendance
7. **Biometric Integration**: Fingerprint/face recognition
8. **Multi-device Support**: Track attendance from web and mobile

## API Documentation

All APIs are automatically documented in Swagger at: `http://localhost:3000/api-docs`

Add the following to your Swagger config to document attendance endpoints:

```typescript
/**
 * @swagger
 * /attendance/create-session:
 *   post:
 *     summary: Create attendance session
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session created
 */
```

## Support & Maintenance

- Monitor server logs for errors
- Regularly backup attendance data
- Update `qrcode.react` and other dependencies
- Test QR code scanning on different devices
- Monitor API performance during large events
