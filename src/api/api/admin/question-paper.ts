import { apiSlice } from "../apiSlice";

export interface QuestionPaper {
  id: number;
  name: string;
}

export interface QuestionPaperUploadPayload {
  ExamTitle?: string;     // optional
  ExamTittle?: string;    // optional fallback
  Subject: string;
  Class: string;
  ExamDate: string;       // "YYYY-MM-DD" or ISO datetime
  Duration: number;       // minutes
  GradeLevel: string;
  Description?: string;   // optional description
  uuid?: string;          // single string (changed from array)
}

export interface AnswerSheetResultRow {
  rollNo?: string;
  roll_number?: string;
  rollNumber?: string;
  name?: string;
  studentName?: string;
  totalMark?: number;
  total?: number;
  maxMarks?: number;
  marksObtained?: number;
  obtained?: number;
  score?: number;
}

export const adminQuestionPaperApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuestionPaper: builder.query<QuestionPaper | QuestionPaper[], { graderType?: string } | void>({
      query: (args) => {
        if (!args || !args.graderType) return { url: `/question-papers` };
        return {
          url: `/question-papers`,
          params: { graderType: args.graderType },
        };
      },
    }),

    getAnswerSheetById: builder.query<QuestionPaper, { id: number }>({
      query: ({ id }) => `/question-papers/${id}`,
    }),

    // accept FormData directly (mirrors syllabus upload pattern)
    uploadQuestionPaper: builder.mutation<QuestionPaper, FormData>({
      query: (formData) => ({
        url: `/question-papers/upload`,
        method: "POST",
        body: formData,
      }),
    }),

    // separate endpoint for uploading multiple answer sheets (PDFs)
    uploadAnswerSheets: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: `/question-papers/answer-sheets/upload`,
        method: "POST",
        body: formData,
      }),
    }),

    getSingleQuestionPaper: builder.query<QuestionPaper, { id: number }>({
      query: ({ id }) => `/question-papers/question-paper/${id}`,
    }),

    // Fetch processed answer sheet results for a question paper
    getAnswerSheetResultsByQuestionId: builder.query<
      AnswerSheetResultRow[],
      { questionId: number; refresh?: number }
    >({
      query: ({ questionId }) => `/question-papers/answer-sheets/results/${questionId}`,
    }),

    getAnswerSheetResultsByStudentIdAndQuestionId: builder.query<
      any[],
      { studentId: number; questionId: number; refresh?: number }
    >({
      query: ({ studentId, questionId }) => `/question-papers/${questionId}/students/${studentId}/answers`,
    }),

    // Edit a single question/answer key
    editQuestion: builder.mutation<
      { success: boolean },
      {
        questionId: number
        question_number: number
        max_marks: number
        question: string
        expected_answer: string
        key_points: string[]
        marking_scheme: string
        option_a?: string | null
        option_b?: string | null
        option_c?: string | null
        option_d?: string | null
      }
    >({
      query: ({ questionId, ...rest }) => ({
        url: `/question-papers/${questionId}`,
        method: "PATCH",
        body: { questionId, ...rest },
      }),
    }),
  }),
});

export const {
  useGetQuestionPaperQuery,
  useGetAnswerSheetByIdQuery,
  useUploadQuestionPaperMutation,
  useUploadAnswerSheetsMutation,
  useGetSingleQuestionPaperQuery,
  useGetAnswerSheetResultsByQuestionIdQuery,
  useGetAnswerSheetResultsByStudentIdAndQuestionIdQuery,
  useEditQuestionMutation,
} = adminQuestionPaperApi;
