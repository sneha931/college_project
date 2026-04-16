# Resume Parsing Service - API Documentation

## Overview
AI-powered resume parsing service that extracts structured data from PDF and image resumes using LLM (OpenAI/OpenRouter).

## Workflow
```
1. Student uploads resume (PDF/Image) → 
2. Upload to Cloudinary → 
3. Extract text (PDF.js for PDF, OpenAI Vision for images) → 
4. Send to LLM for parsing → 
5. Extract structured data → 
6. Save to StudentProfile
```

## Endpoint

### Upload Resume
**POST** `/profile/uploadresume`

**Authentication:** Required (JWT Bearer token)

**Content-Type:** `multipart/form-data`

**Request:**
```bash
curl -X POST http://localhost:3000/profile/uploadresume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@/path/to/resume.pdf"
```

**Form Data:**
- `resume` (file): PDF or image file (JPG, PNG)
- Max size: 10MB

**Response (200 OK):**
```json
{
  "message": "Resume uploaded and parsed successfully",
  "updatedProfile": {
    "id": "uuid",
    "userId": "uuid",
    "name": "John Doe",
    "placementEmail": "john@college.edu",
    "profilePic": "",
    "marks10": 92.5,
    "marks12": 89.0,
    "diplomaMarks": null,
    "btechCGPA": 8.7,
    "resumeUrl": "https://res.cloudinary.com/.../resumes/resume.pdf",
    "skills": ["Python", "React", "Node.js", "MongoDB", "Docker"],
    "experience": 6,
    "isPlaced": false,
    "placedCompany": null,
    "createdAt": "2026-02-27T10:30:00.000Z",
    "updatedAt": "2026-02-27T10:30:00.000Z"
  },
  "parsedData": {
    "name": "John Doe",
    "placementEmail": "john@college.edu",
    "skills": ["Python", "React", "Node.js", "MongoDB", "Docker"],
    "education": "B.Tech CSE from ABC University",
    "experience": 6,
    "marks10": 92.5,
    "marks12": 89.0,
    "diplomaMarks": null,
    "btechCGPA": 8.7
  }
}
```

**Error Responses:**

```json
// 400 - No file uploaded
{
  "message": "No file uploaded"
}

// 400 - Unsupported file type
{
  "message": "Unsupported file type. Please upload an image or PDF file."
}

// 400 - PDF text extraction failed
{
  "message": "Could not extract text from PDF. The PDF might be image-based."
}

// 409 - Email conflict
{
  "message": "Email already exists. Please use a different email."
}

// 500 - Upload failed
{
  "message": "Failed to upload resume to cloud storage"
}

// 500 - Parsing failed
{
  "message": "Failed to upload resume: [error details]"
}
```

## Data Extraction

The LLM extracts the following structured data:

### Student Information
- **name**: Full name from resume
- **placementEmail**: Contact email

### Academic Records
- **marks10**: 10th standard marks (SSC/SSLC/Class X)
- **marks12**: 12th standard marks (HSC/Intermediate/+2) - nullable
- **diplomaMarks**: Diploma marks if applicable - nullable
- **btechCGPA**: Bachelor's degree CGPA (out of 10)

### Professional Data
- **skills**: Array of technical skills (languages, frameworks, tools)
- **experience**: Total months of work experience (calculated from all jobs/internships)

### Placement Status
- **isPlaced**: Placement status (default: false)
- **placedCompany**: Company name if placed (default: null)

## Technical Stack

### File Processing
- **PDF**: `pdfjs-dist` for text extraction
- **Images**: OpenAI Vision API for OCR

### LLM Integration
- **Provider**: OpenAI/OpenRouter
- **Model**: Configurable via `OPENROUTER_MODEL_ID` env variable
- **Default**: `openai/gpt-3.5-turbo`
- **Temperature**: 0.2 (deterministic output)

### Cloud Storage
- **Provider**: Cloudinary
- **Upload folder**: `resumes/`
- **Resource type**: 
  - PDF → `raw` (downloadable)
  - Images → `image`

### Database
- **ORM**: Prisma
- **Operation**: `upsert` (creates or updates existing profile)
- **Cascade**: User deletion cascades to StudentProfile

## Service Architecture

```
Controller (studentprofile.controllers.ts)
    ↓
Resume Parser Service (resumeParser.service.ts)
    ├── processAndParseResume()
    │   ├── uploadBuffer() → Cloudinary
    │   ├── extractTextFromPDF() → PDF.js
    │   ├── extractTextFromImage() → OpenAI Vision
    │   └── llmParseResume() → LLM extraction
    └── saveResumeToProfile() → Prisma
```

## Environment Variables

Required configuration in `.env`:

```env
# LLM API
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL_ID=openai/gpt-3.5-turbo

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret
```

## Example Usage (Frontend)

```typescript
const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch('http://localhost:3000/profile/uploadresume', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('Resume uploaded:', result.parsedData);
    console.log('Profile updated:', result.updatedProfile);
  } else {
    console.error('Upload failed:', result.message);
  }
};
```

## Error Handling

The service implements comprehensive error handling:

1. **Validation errors**: File type, size, presence
2. **Upload errors**: Cloudinary connectivity, quota limits
3. **Parsing errors**: PDF corruption, OCR failures, LLM timeout
4. **Database errors**: Unique constraint violations, connection issues
5. **Logging**: Winston logger tracks all operations and errors

## Performance Considerations

- **Async processing**: All I/O operations are asynchronous
- **Buffer handling**: Multer memory storage for efficient processing
- **Timeout**: LLM calls may take 5-15 seconds for complex resumes
- **File size**: 10MB limit set in upload middleware
- **Retry logic**: Not implemented (add as needed for production)

## Future Enhancements

- [ ] Background job queue for async processing
- [ ] Webhook notifications on completion
- [ ] Resume version history
- [ ] Support for DOCX format
- [ ] Confidence scores for extracted data
- [ ] Admin approval workflow
- [ ] Bulk resume upload
