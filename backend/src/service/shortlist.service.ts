import ExcelJS from "exceljs";
import Logger from "../logger.js";
import prisma from "../config/prismaconfig.js";
import { uploadBuffer } from "../utils/uploadtocloud.js";

// Helper function to convert CGPA to percentage if needed
const toPercentage = (value: number): number => {
    // If value is <= 10, assume it's CGPA and convert to approximate percentage
    // CGPA * 9.5 gives approximate percentage
    if (value <= 10) {
        return value * 9.5;
    }
    return value;
};

export const generateshortlistexcel=async(jobid:string)=>{
    try{
        Logger.info("Generating shortlist excel",{jobid});
        const job=await prisma.jobPosts.findUnique({
            where:{id:jobid}
        });
        
        if(!job){
            Logger.warn("Job post not found",{jobid});
            return null;
        }

        // Clear existing matchings for this job
        await prisma.jobMatching.deleteMany({
            where:{jobId:jobid}
        });

        const students=await prisma.studentProfile.findMany();
        
        Logger.info("Shortlist generation - Data fetched", {
            jobid,
            jobRole: job.jobrole,
            jobSkills: job.skills,
            minMarks10: job.minMarks10,
            minMarks12: job.minMarks12,
            minCGPA: job.minCGPA,
            minExperience: job.minExperience,
            totalStudents: students.length
        });
        
        if (students.length === 0) {
            Logger.warn("No students found in database", { jobid });
            await prisma.jobPosts.update({
                where: { id: jobid },
                data: { shortlistReady: true, excelUrl: null },
            });
            return null;
        }
        
        const workbook=new ExcelJS.Workbook();
        const sheet=workbook.addWorksheet("Shortlisted Students");

        // Define columns as per user requirements
        sheet.columns=[
            { header: "Student Name", key: "name", width: 30 },
            { header: "Email", key: "email", width: 35 },
            { header: "10th Marks", key: "marks10", width: 15 },
            { header: "12th Marks / Diploma", key: "marks12Diploma", width: 20 },
            { header: "B.Tech CGPA", key: "btechCGPA", width: 15 },
            { header: "Experience (Months)", key: "experience", width: 20 },
            { header: "Matched Skills", key: "matchedSkills", width: 50 },
        ];

        // Style the header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4472C4' }
        };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

        const jobMatchings = [];
        
        for(const student of students){
            Logger.info("Checking student", {
                studentName: student.name,
                studentSkills: student.skills,
                marks10: student.marks10,
                marks12: student.marks12,
                diplomaMarks: student.diplomaMarks,
                btechCGPA: student.btechCGPA,
                experience: student.experience
            });
            
            // Find matching skills (case-insensitive comparison)
            const matchedskills = student.skills.filter(studentSkill =>
                job.skills.some(jobSkill => 
                    jobSkill.toLowerCase().trim() === studentSkill.toLowerCase().trim()
                )
            );
            
            Logger.info("Skills comparison", {
                studentName: student.name,
                matchedSkillsCount: matchedskills.length,
                matchedSkills: matchedskills
            });
            
            // Skip if no matching skills
            if(matchedskills.length === 0) {
                Logger.info("Student skipped - no matching skills", { studentName: student.name });
                continue;
            }

            // Check minimum requirements
            // Convert marks10 to percentage if it's CGPA (<=10)
            const studentMarks10Percent = toPercentage(student.marks10);
            if (studentMarks10Percent < job.minMarks10) {
                Logger.info("Student skipped - marks10 below minimum", { 
                    studentName: student.name, 
                    studentMarks10: student.marks10,
                    convertedPercent: studentMarks10Percent,
                    required: job.minMarks10 
                });
                continue;
            }
            
            // Check 12th marks or diploma marks
            if (job.minMarks12) {
                const rawMarks12 = student.marks12 || student.diplomaMarks || 0;
                const studentMarks12Percent = toPercentage(rawMarks12);
                if (studentMarks12Percent < job.minMarks12) {
                    Logger.info("Student skipped - marks12/diploma below minimum", { 
                        studentName: student.name, 
                        rawMarks12,
                        convertedPercent: studentMarks12Percent,
                        required: job.minMarks12 
                    });
                    continue;
                }
            }
            
            // CGPA comparison (both should be in CGPA format)
            if (student.btechCGPA < job.minCGPA) {
                Logger.info("Student skipped - CGPA below minimum", { 
                    studentName: student.name, 
                    studentCGPA: student.btechCGPA, 
                    required: job.minCGPA 
                });
                continue;
            }
            
            // Experience comparison (both in months now)
            if (student.experience < job.minExperience) {
                Logger.info("Student skipped - experience below minimum", { 
                    studentName: student.name, 
                    studentExpMonths: student.experience, 
                    requiredMonths: job.minExperience
                });
                continue;
            }
            
            Logger.info("Student ELIGIBLE for shortlist", { studentName: student.name });
            
            // Calculate match score
            const score =
                matchedskills.length * 10 +
                Math.floor(student.btechCGPA * 5) +
                Math.floor(student.experience * 2);

            // Prepare job matching record
            jobMatchings.push({
                jobId: jobid,
                studentId: student.id,
                matchedSkills: matchedskills,
                score,
            });

            // Get 12th or Diploma marks (whichever exists)
            const marks12Diploma = student.marks12 
                ? `${student.marks12}% (12th)` 
                : student.diplomaMarks 
                    ? `${student.diplomaMarks}% (Diploma)` 
                    : "N/A";

            // Add row to Excel
            sheet.addRow({
                name: student.name,
                email: student.placementEmail,
                marks10: student.marks10,
                marks12Diploma: marks12Diploma,
                btechCGPA: student.btechCGPA,
                experience: student.experience,
                matchedSkills: matchedskills.join(", "),
            });
        }
        
        if (jobMatchings.length === 0) {
            Logger.warn("No eligible students found for shortlist", { jobid, jobRole: job.jobrole });
            
            // Still update job to mark shortlist as ready (with no results)
            await prisma.jobPosts.update({
                where: { id: jobid },
                data: { shortlistReady: true, excelUrl: null },
            });
            
            return null;
        }
      
        // Save job matchings to database
        await prisma.jobMatching.createMany({
            data: jobMatchings,
        });

        // Generate Excel buffer
        Logger.info("Generating Excel buffer", { jobid, rowCount: jobMatchings.length });
        const buffer = await workbook.xlsx.writeBuffer();
        Logger.info("Excel buffer generated", { jobid, bufferSize: buffer.byteLength });
        
        // Upload to Cloudinary with raw type for Excel files
        Logger.info("Uploading Excel to Cloudinary", { jobid });
        const excelUrl = await uploadBuffer(Buffer.from(buffer), "shortlists", "raw");
        Logger.info("Excel uploaded to Cloudinary", { jobid, excelUrl });
        
        // Update job post with excel URL and mark as ready
        await prisma.jobPosts.update({
            where: { id: jobid },
            data: { excelUrl, shortlistReady: true },
        });

        Logger.info("Shortlist excel generated successfully", { 
            jobid, 
            jobRole: job.jobrole,
            eligibleCount: jobMatchings.length,
            excelUrl 
        });
        
        return excelUrl;
    }
    catch(error){
        Logger.error("Error generating shortlist excel",{error});
        return null;
    }
}