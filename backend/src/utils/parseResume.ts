import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

export const parseResume = async (resumeText: string) => {
    const prompt = `
You are an expert resume parser specializing in Indian education systems. Extract the following details from the resume accurately.

IMPORTANT INSTRUCTIONS:

1. "name": Extract the full name of the person (usually at the top of the resume)

2. "placementEmail": Extract the email address from the resume. Look for patterns like:
   - "email@domain.com"
   - "Email: abc@xyz.com"
   - Usually found near phone number or in contact section

3. "marks10": Extract 10th standard marks. Look for: SSC, SSLC, Class X, 10th, High School, Matric, Secondary
   - If CGPA out of 10 (e.g., "9.9/10" or "GPA: 9.9"), return: "9.9"
   - If percentage (e.g., "92%"), return: "92"
   
4. "marks12": Extract 12th standard marks. Look for: HSC, Intermediate, MPC, BiPC, BIEAP, Class XII, 12th, Junior College, +2, Pre-University
   - If CGPA out of 10, return as-is
   - If percentage (e.g., "95.9%"), return: "95.9"
   - Leave empty "" if student did diploma instead
   
5. "diplomaMarks": Extract Diploma marks if present. Look for: Diploma, Polytechnic
   - Leave empty "" if student did 12th instead

6. "btechCGPA": Extract B.Tech/B.E./Bachelor's degree CGPA. Look for: B.Tech, B.E., Bachelor, Engineering, GPA in education section
   - If CGPA out of 10 (e.g., "8.9/10.00" or "GPA: 8.9"), return: "8.9"
   - If percentage, return as-is

7. "experience": Calculate TOTAL months of experience from ALL jobs and internships listed
   - Look at date ranges like "Feb 2025 - May 2025" (4 months), "May 2024 - July 2024" (3 months)
   - Add up all months and return as a number
   - Example: 4 months + 3 months = "7"
   - If no experience section, return "0"

8. "skills": Extract ALL technical skills including:
   - Programming languages (Python, Java, C++, JavaScript, etc.)
   - Frameworks (React, Django, Express, Spring Boot, etc.)
   - Databases (MySQL, MongoDB, PostgreSQL, etc.)
   - Tools (Git, Docker, etc.)
   - Technologies mentioned in projects

Return **VALID JSON ONLY** (no markdown, no extra text, no explanations).
IMPORTANT: Extract ACTUAL values from the resume above. Do NOT use placeholder or example values.

{
  "name": "<extract from resume>",
  "placementEmail": "<extract email from resume>",
  "skills": ["<extract all skills from resume>"],
  "education": "<brief education summary from resume>",
  "experience": "<total months calculated from resume>",
  "marks10": "<extract 10th marks from resume or empty if not found>",
  "marks12": "<extract 12th marks from resume or empty if not found>",
  "diplomaMarks": "<extract diploma marks from resume or empty if not found>",
  "btechCGPA": "<extract B.Tech CGPA from resume or empty if not found>"
}

Resume Content:
${resumeText}
`;
    const res = await client.chat.completions.create({
        model: process.env.OPENROUTER_MODEL_ID || "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
    });
    
    let content = res.choices[0]?.message?.content || "{}";
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    return JSON.parse(content) as {
        name: string;
        placementEmail: string;
        skills: string[];
        education: string;
        experience: string;
        marks10: string;
        marks12: string;
        diplomaMarks: string;
        btechCGPA: string;
    };
};