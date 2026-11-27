// FixForFlex's FLEX page scripts and styles. They are registered from background.js only while
// FixForFlex is switched on in the popup, so switching it off leaves FLEX untouched.
const FFX_CONTENT_SCRIPTS = [
  {
    "id": "ffx-01",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "js": [
      "content/theme.js"
    ],
    "css": [
      "content/theme.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-02",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "css": [
      "content/topbar.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-03",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "css": [
      "content/loader.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-04",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "js": [
      "content/sidebar.js"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-05",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/StudentMarks*"
    ],
    "js": [
      "content/marks.js"
    ],
    "css": [
      "content/marks.css"
    ],
    "runAt": "document_idle"
  },
  {
    "id": "ffx-06",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/StudentAttendance*"
    ],
    "js": [
      "content/attendance.js"
    ],
    "css": [
      "content/attendance.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-07",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/Transcript*"
    ],
    "js": [
      "content/transcript.js"
    ],
    "css": [
      "content/transcript.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-08",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "js": [
      "content/login.js"
    ],
    "css": [
      "content/login.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-09",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "js": [
      "content/home.js"
    ],
    "css": [
      "content/home.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-10",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/PrintAdmitCard*"
    ],
    "js": [
      "content/admitcard.js"
    ],
    "css": [
      "content/admitcard.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-11",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/_AdmitCardByRollNoP*"
    ],
    "js": [
      "content/admitcard-print.js"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-12",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/Challan*",
      "https://flexstudent.nu.edu.pk/ConsolidatedFeeReport/*"
    ],
    "js": [
      "content/fee.js"
    ],
    "css": [
      "content/fee.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-13",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/PrintStdChallanForm*",
      "https://flexstudent.nu.edu.pk/Student/ChallanForm*"
    ],
    "js": [
      "content/fee-print.js"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-14",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/CourseRegistration*"
    ],
    "css": [
      "content/registration.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-15",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/CourseRegistration*"
    ],
    "js": [
      "content/registration.js"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-16",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/TentativeStudyPlan*"
    ],
    "css": [
      "content/studyplan.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-17",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/GradeReport*"
    ],
    "css": [
      "content/gradereport.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-18",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/GradeReport*"
    ],
    "js": [
      "content/gradereport.js"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-19",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/FeedBackQuestions*",
      "https://flexstudent.nu.edu.pk/Student/FeedbackQuestions*"
    ],
    "js": [
      "content/feedback.js"
    ],
    "css": [
      "content/feedback.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-20",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/TentativeStudyPlan*"
    ],
    "js": [
      "content/studyplan-fee.js"
    ],
    "css": [
      "content/studyplan-fee.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-21",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/CourseFeedback*",
      "https://flexstudent.nu.edu.pk/Student/RetakeRequest*",
      "https://flexstudent.nu.edu.pk/Student/CourseWithdraw*",
      "https://flexstudent.nu.edu.pk/Student/GradeChangeRequest*"
    ],
    "js": [
      "content/requests.js"
    ],
    "css": [
      "content/requests.css"
    ],
    "runAt": "document_end"
  },
  {
    "id": "ffx-22",
    "matches": [
      "https://flexstudent.nu.edu.pk/",
      "https://flexstudent.nu.edu.pk/Login*",
      "https://flexstudent.nu.edu.pk/login*"
    ],
    "js": [
      "content/signin-fast.js"
    ],
    "css": [
      "content/signin-fast.css"
    ],
    "runAt": "document_start"
  },
  {
    "id": "ffx-23",
    "matches": [
      "https://flexstudent.nu.edu.pk/*"
    ],
    "js": [
      "content/autologin.js"
    ],
    "runAt": "document_end",
    "allFrames": true
  },
  {
    "id": "ffx-24",
    "matches": [
      "https://flexstudent.nu.edu.pk/Student/StudentMarks*"
    ],
    "js": [
      "content/semesters.js"
    ],
    "runAt": "document_end"
  }
];
