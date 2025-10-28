"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MainDialog } from "@/components/Common/MainDialog";
import { type ControllerRenderProps, useForm } from "react-hook-form";
import { examSchema, type ExamSchema } from "./ExamSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SelectDropdown from "@/components/Common/SelectDropdown";
import MultiSelectDropdown from "@/components/Common/MultiSelectDropdown";
import type { GenericType } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useGetProgramsQuery } from "@/api/api/program-management-api";
// removed program-outcomes course query; courses will come from question filter data
// import { skipToken } from "@reduxjs/toolkit/query"; // no longer needed
import { useGetQuestionFilterDataQuery } from "@/api/api/question-bank-api";
import {
  useCreateAdminExamMutation,
  useLazyGetAvailableQuestionsQuery,
  useUpdateAdminExamMutation,
  useGetTargetedStudentsQuery,
  useLazyGetTargetedStudentsQuery,
} from "@/api/api/admin/exams";
import { useToast } from "@/hooks/use-toast";
import CustomEditor from "./CKEditor";
import { Calendar } from "lucide-react";

type BloomLevelId = "1" | "2" | "3" | "4" | "5" | "6";
type DifficultyId = "1" | "2" | "3";

type BloomDistribution = Record<BloomLevelId, number>;
type DifficultyDistribution = Record<DifficultyId, number>;

export interface ExamInitialData {
  id: number;
  exam_name: string;
  chapters: number[];
  c_id: number;
  p_id: number;
  org_id: number;
  faculty_id: number;
  sem_id: number;
  is_published: 0 | 1;
  bloom_distribution: BloomDistribution;
  difficulty_distribution: DifficultyDistribution;
  start_date: string;
  duration: string;
  end_date: string;
  offline_instructions: string;
  online_instructions: string;
  question_count: number;
  topics: number[];
  test_mode: number;
  year_id: number;
  created_at: string;
  updated_at: string;
  is_deleted: 0 | 1;
  status: number;
  section: string; // e.g. "A"
  shift_id: number;
}

interface ExamModalProps {
  open: boolean;
  onClose: () => void;
  examType: "create" | "edit";
  initialData?: any;
}

export enum LEXICAL_EDITOR {
  DEFAULT_VALUE = '<p class="editor-paragraph"><br></p>',
  CONTENT_EMPTY = "Content is Empty",
}

// years and semesters will be derived from question filter data dynamically

const bloomLevels = [
  { key: "Remembering", label: "Remembering - K1" },
  { key: "Understanding", label: "Understanding - K2" },
  { key: "Applying", label: "Applying - K3" },
  { key: "Analyzing", label: "Analyzing - K4" },
  { key: "Evaluating", label: "Evaluating - K5" },
  { key: "Creating", label: "Creating - K6" },
] as const;

const difficultyTiers = ["Easy", "Medium", "Hard"] as const;

const testModes = [
  { id: 1, name: "Online" },
  { id: 2, name: "Offline" },
  { id: 3, name: "Both" },
];

const adminShiftOptions: GenericType[] = [
  { id: 1, name: "Shift 1" },
  { id: 2, name: "Shift 2" },
];

const adminSectionOptions: GenericType[] = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
];

function toSectionOptions(sectionCSV: string | null | undefined): GenericType[] {
  if (!sectionCSV) return [];
  return sectionCSV
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, idx) => ({
      id: idx + 1,
      name,
    }));
}

// --- ID maps for payload parity with server ---
const BLOOM_KEY_TO_ID: Record<string, number> = Object.fromEntries(
  bloomLevels.map((lvl, idx) => [lvl.key, idx + 1])
) as Record<string, number>;

const DIFF_KEY_TO_ID: Record<"Easy" | "Medium" | "Hard", "1" | "2" | "3"> = {
  Easy: "1",
  Medium: "2",
  Hard: "3",
};

const ExamModal = ({ open, onClose, examType, initialData }: ExamModalProps) => {
  const { toast } = useToast();
  const subjectIdsString =
    typeof window !== "undefined" ? localStorage.getItem("subjectIds") : null;
  const userDetails =
    typeof window !== "undefined" ? JSON.parse(localStorage.getItem("userDetails") || "{}") : {};
  const isAdmin = userDetails.role === "admin";

  const programIdsString = useMemo(() => userDetails?.programIds || "", [userDetails?.programIds]);

  const [loading, setLoading] = useState(false);
  const [programData, setProgramData] = useState<GenericType[]>([]);
  const [courseData, setCourseData] = useState<GenericType[]>([]);
  const [chapterData, setChapterData] = useState<GenericType[]>([]);
  const [topicsData, setTopicsData] = useState<GenericType[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<GenericType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentInstructionType, setCurrentInstructionType] = useState<"online" | "offline">(
    "online"
  );
  const [editorState, setEditorState] = useState<string>(LEXICAL_EDITOR.DEFAULT_VALUE);
  const [adminShift, setAdminShift] = useState<GenericType | null>(null);
  const isLaptop = useMediaQuery("(max-width: 1080px)");

  // ---- Students select state ----
  type LabeledOption = { label: string; value: string };
  const [studentOptions, setStudentOptions] = useState<LabeledOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const usersDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetedSigRef = useRef<string>("");
  const preselectHydratedRef = useRef<boolean>(false);

  const [createAdminExam] = useCreateAdminExamMutation();
  const [updateAdminExam] = useUpdateAdminExamMutation();
  const [triggerAvailability, { data: availabilityData, isFetching: isChecking }] =
    useLazyGetAvailableQuestionsQuery();

  const { data: questionFilter } = useGetQuestionFilterDataQuery();
  const { data: programsList } = useGetProgramsQuery(
    subjectIdsString || programIdsString
      ? { subjectIds: subjectIdsString || undefined, programIds: programIdsString || undefined }
      : undefined
  );

  

  // --- Build program option list
  useEffect(() => {
    if (programsList && Array.isArray(programsList)) {
      const filtered = programsList.map((program: any) => ({
        id: program.id,
        name: program.name,
      }));
      setProgramData(filtered);
    }
  }, [programsList]);

  // Placeholder: course options will be populated after watchers are declared

  const userId = userDetails?.id;
  const shiftId = userDetails?.shiftId ?? null;
  const sectionCSV = userDetails?.section ?? null;

  const sectionOptions = useMemo(
    () => (isAdmin ? adminSectionOptions : toSectionOptions(sectionCSV)),
    [isAdmin, sectionCSV]
  );

  const buttonName = initialData ? "Update Exam" : "Create Exam";

  // --- Default values (section will be normalized to an ID later in a useEffect)
  const defaultValues = initialData
    ? {
        name: initialData.exam_name,
        year: initialData.year_id,
        semester: initialData.sem_id,
        programme: initialData.p_id,
        course: initialData.c_id,
        chapters: initialData.chapters,
        topics: initialData.topics,
        question_count: String(initialData.question_count ?? ""),
        duration: initialData.duration,
        start_date: initialData.start_date,
        end_date: initialData.end_date,
        test_mode: initialData.test_mode,
        section: "", // we'll map "A"/"B" -> ID after options are ready
        shiftId: initialData.shift_id, // used only to seed adminShift
        studentsIds: (initialData.student_ids ?? initialData.students_ids ?? []) as number[],
        online_instructions: initialData.online_instructions,
        offline_instructions: initialData.offline_instructions,
        // map 1..6 -> labels
        bloomDistribution: {
          Remembering: initialData.bloom_distribution["1"],
          Understanding: initialData.bloom_distribution["2"],
          Applying: initialData.bloom_distribution["3"],
          Analyzing: initialData.bloom_distribution["4"],
          Evaluating: initialData.bloom_distribution["5"],
          Creating: initialData.bloom_distribution["6"],
        },
        difficultyDistribution: {
          Easy: initialData.difficulty_distribution["1"],
          Medium: initialData.difficulty_distribution["2"],
          Hard: initialData.difficulty_distribution["3"],
        },
      }
    : {
        name: "",
        year: 0,
        semester: 0,
        programme: 0,
        course: 0,
        chapters: [] as number[],
        topics: [] as number[],
        question_count: "",
        duration: "",
        start_date: "",
        end_date: "",
        test_mode: 0,
        section: "",
        shiftId: undefined,
        studentsIds: [] as number[],
        online_instructions: "",
        offline_instructions: "",
        bloomDistribution: Object.fromEntries(bloomLevels.map((lvl) => [lvl.key, 0])) as Record<
          string,
          number
        >,
        difficultyDistribution: { Easy: 50, Medium: 50, Hard: 0 } as Record<
          (typeof difficultyTiers)[number],
          number
        >,
      };

  const form = useForm<ExamSchema>({
    resolver: zodResolver(examSchema(isAdmin)),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const {
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // Reset form and dependent state when switching between exams or modes
  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues as any);
    // clear dependent UI state so re-hydration effects run with fresh data
    setSelectedProgram(null);
    setChapterData([]);
    setTopicsData([]);
    preselectHydratedRef.current = false;
    prevQCountRef.current = null;
    lastSigRef.current = "";
    // reset admin shift explicitly when changing context
    if (isAdmin) {
      const nextShift = initialData?.shift_id
        ? adminShiftOptions.find((opt) => opt.id === initialData.shift_id) || null
        : null;
      setAdminShift(nextShift);
    }
  }, [open, initialData, examType]);

  // --- watch the fields we care about for availability ---
  const year = watch("year");
  const semester = watch("semester");
  const programme = watch("programme");
  const courseVal = watch("course");
  const chapters = watch("chapters");
  const question_count = watch("question_count");
  const duration = watch("duration");
  const start_date = watch("start_date");
  const end_date = watch("end_date");
  const test_mode = watch("test_mode");
  const sectionVal = watch("section");
  const bloomDist = watch("bloomDistribution");
  const diffDist = watch("difficultyDistribution");
  const questionCount = watch("question_count");

  // Derived dropdown data from filter API
  const yearsOptions: GenericType[] = useMemo(() => {
    return (questionFilter?.years || []).map((y: any) => ({ id: y.id, name: y.name }));
  }, [questionFilter?.years]);

  const yearVal = useMemo(() => Number(year || 0), [year]);
  const semestersOptions: GenericType[] = useMemo(() => {
    const all = questionFilter?.semesters || [];
    const filtered = yearVal > 0 ? all.filter((s: any) => Number(s.yearNumber) === Number(yearVal)) : [];
    return filtered.map((s: any) => ({ id: s.id, name: s.name }));
  }, [questionFilter?.semesters, yearVal]);

  // Selected semester's academicYearId for targeted students API
  const selectedAcademicYearId = useMemo(() => {
    const semId = Number(semester || 0);
    if (!semId) return undefined;
    const match = (questionFilter?.semesters || []).find((s: any) => Number(s.id) === semId);
    return match?.academicYearId !== undefined ? Number(match.academicYearId) : undefined;
  }, [questionFilter?.semesters, semester]);

  // --- change handlers ---
  const yearChangeHandler = (item: GenericType, field: ControllerRenderProps<ExamSchema, "year">) => {
    field.onChange(item.id);
    // cascading clears
    setValue("semester", 0, { shouldValidate: true, shouldDirty: true });
    setValue("course", 0, { shouldValidate: true, shouldDirty: true });
    setChapterData([]);
    setTopicsData([]);
    setValue("chapters", []);
    setValue("topics", []);
    setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
    preselectHydratedRef.current = true;
  };

  const semesterChangeHandler = (
    item: GenericType,
    field: ControllerRenderProps<ExamSchema, "semester">
  ) => {
    field.onChange(item.id);
    // cascading clears
    setValue("course", 0, { shouldValidate: true, shouldDirty: true });
    setChapterData([]);
    setTopicsData([]);
    setValue("chapters", []);
    setValue("topics", []);
    setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
    preselectHydratedRef.current = true;
  };

  const programChangeHandler = (
    item: GenericType,
    field: ControllerRenderProps<ExamSchema, "programme">
  ) => {
    field.onChange(item.id);
    setSelectedProgram(item);
    // clear cascades
    setChapterData([]);
    setTopicsData([]);
    setValue("chapters", []);
    setValue("topics", []);
    setValue("course", 0);
    setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
    preselectHydratedRef.current = true;
  };

  const courseChangeHandler = (
    item: GenericType,
    field: ControllerRenderProps<ExamSchema, "course">
  ) => {
    field.onChange(item.id);
    const allCourses: any[] = questionFilter?.courses || [];
    const rawCourse = allCourses.find((c: any) => Number(c.id) === Number(item.id));
    const filterId = rawCourse?.subjects?.id; // 's_id' that chapters use
    const chapters =
      questionFilter?.chapters
        ?.filter((chapter: any) => {
          const bySubject = chapter.s_id === filterId;
          const byProgram = selectedProgram?.id ? chapter.p_id === (selectedProgram?.id ?? 0) : true;
          return bySubject && byProgram;
        })
        ?.map((chapter: any) => ({ id: chapter.id, name: chapter.c_name })) ?? [];
    setChapterData(chapters);
    setTopicsData([]);
    setValue("chapters", []);
    setValue("topics", []);
  };

  const chapterChangeHandler = (
    items: GenericType[],
    field: ControllerRenderProps<ExamSchema, "chapters">
  ) => {
    const selectedChapterIds = items.map((ch) => ch.id);
    field.onChange(selectedChapterIds);
    const filteredTopics =
      questionFilter?.topics
        ?.filter((topic: any) => selectedChapterIds.includes(topic.c_id))
        ?.map((topic: any) => ({ id: topic.id, name: topic.t_name })) ?? [];
    setTopicsData(filteredTopics);
    setValue("topics", []);
  };

  const topicChangeHandler = (
    items: GenericType[],
    field: ControllerRenderProps<ExamSchema, "topics">
  ) => field.onChange(items.map((t) => t.id));

  const testModeChangeHandler = (
    item: GenericType,
    field: ControllerRenderProps<ExamSchema, "test_mode">
  ) => field.onChange(item.id);

  const sectionChangeHandler = (
    item: GenericType,
    field: ControllerRenderProps<ExamSchema, "section">
  ) => {
    field.onChange(String(item.id)); // store SECTION AS ID (string)
    setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
    preselectHydratedRef.current = true;
  };

  // Populate courseData when semester/programme change
  useEffect(() => {
    const allCourses: any[] = questionFilter?.courses || [];
    const semId = Number(semester || 0);
    const progId = Number(programme || 0);

    const filtered = allCourses.filter((c: any) => {
      const bySem = semId > 0 ? Number(c.semester_id) === semId : true;
      const byProg = progId > 0 ? Number(c.program_id) === progId : true;
      return bySem && byProg;
    });

    const next: GenericType[] = filtered.map((c: any) => ({
      id: c.id, // keep course id for payload
      name: c?.subjects?.s_name || c.name || `Course ${c.id}`,
    }));

    setCourseData((prev) => {
      if (
        prev.length === next.length &&
        prev.every((p, i) => p.id === next[i]?.id && p.name === next[i]?.name)
      ) {
        return prev; // prevent unnecessary loops
      }
      return next;
    });
  }, [questionFilter?.courses, programme, semester]);

  // --- PRESELECTS / HYDRATION FIXES ---

  // 1) When program list is ready in edit mode, set selectedProgram so courses query fires
  useEffect(() => {
    if (!initialData || !programData.length) return;
    const pro = programData.find((p) => p.id === initialData.p_id) || null;
    if (pro) setSelectedProgram(pro);
  }, [initialData, programData]);

  // 2) When admin + initialData, seed adminShift from shift_id
  useEffect(() => {
    if (!isAdmin || !initialData?.shift_id) return;
    const s = adminShiftOptions.find((opt) => opt.id === initialData.shift_id) || null;
    setAdminShift(s);
  }, [isAdmin, initialData]);

  // Keep form shiftId synchronized from admin selection or faculty profile
  useEffect(() => {
    const effective = isAdmin ? adminShift?.id : shiftId;
    const current = getValues("shiftId");
    if (effective && Number(current) !== Number(effective)) {
      setValue("shiftId", Number(effective), { shouldValidate: true, shouldDirty: false });
    }
  }, [isAdmin, adminShift?.id, shiftId]);

  // 3) Map section name ("A"/"B"/etc.) -> section ID in form once options ready
  useEffect(() => {
    if (!initialData?.section || !sectionOptions.length) return;
    // Choose correct option list by role
    const opts = isAdmin ? adminSectionOptions : sectionOptions;
    const match = opts.find((sec) => sec.name === initialData.section);
    if (match) {
      setValue("section", String(match.id), { shouldDirty: false, shouldValidate: true });
    }
  }, [initialData?.section, sectionOptions, isAdmin, setValue]);

  // 4) When filter data is ready in edit mode, hydrate chapters and topics options
  useEffect(() => {
    if (!initialData || !questionFilter) return;

    const allCourses: any[] = questionFilter?.courses || [];
    const rawCourse =
      allCourses.find((c: any) => Number(c.id) === Number(initialData.c_id)) ||
      allCourses.find((c: any) => Number(c.course_name_id) === Number(initialData.c_id)) ||
      allCourses.find((c: any) => Number(c?.subjects?.id) === Number(initialData.c_id));
    const filterId = rawCourse?.subjects?.id;

    const chaptersOpts =
      questionFilter?.chapters
        ?.filter((chapter: any) => {
          const bySubject = chapter.s_id === filterId;
          const byProgram = programme ? chapter.p_id === Number(programme) : true;
          return bySubject && byProgram;
        })
        ?.map((chapter: any) => ({ id: chapter.id, name: chapter.c_name })) ?? [];
    setChapterData(chaptersOpts);

    const topicsOpts =
      questionFilter?.topics
        ?.filter((topic: any) => initialData.chapters.includes(topic.c_id))
        ?.map((topic: any) => ({ id: topic.id, name: topic.t_name })) ?? [];
    setTopicsData(topicsOpts);
  }, [initialData, questionFilter, programme]);

  // --- Totals (memoized)
  const bloomTotal = useMemo(
    () => Object.values(bloomDist || {}).reduce((a: number, b: any) => a + Number(b || 0), 0),
    [bloomDist]
  );

  const difficultyTotal = useMemo(
    () => Object.values(diffDist || {}).reduce((a: number, b: any) => a + Number(b || 0), 0),
    [diffDist]
  );

  const maxQuestions = useMemo(() => {
    const count = Number.parseInt(questionCount || "0");
    return isNaN(count) ? 0 : count;
  }, [questionCount]);

  // --- Slider handlers with guards
  const handleBloomChange = (lvl: keyof typeof bloomDist, val: number) => {
    const curr = getValues("bloomDistribution");
    const otherSum = Object.entries(curr).reduce(
      (sum, [k, v]) => (k === lvl ? sum : sum + Number(v)),
      0
    );
    if (otherSum + val <= maxQuestions) {
      setValue(
        "bloomDistribution",
        { ...curr, [lvl]: val },
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  const handleDifficultyChange = (tier: keyof typeof diffDist, val: number) => {
    const curr = getValues("difficultyDistribution");
    const otherSum = Object.entries(curr).reduce(
      (sum, [k, v]) => (k === tier ? sum : sum + Number(v)),
      0
    );
    if (otherSum + val <= 100) {
      setValue(
        "difficultyDistribution",
        { ...curr, [tier]: val },
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  // --- SINGLE SOURCE OF TRUTH: Build the EXACT payload (also normalizes numbers)
  const buildCreateExamPayload = useCallback(
    (v: ExamSchema) => {
      const bloomDistribution = Object.fromEntries(
        Object.entries(v.bloomDistribution || {}).map(([name, count]) => [
          BLOOM_KEY_TO_ID[name],
          Number(count),
        ])
      );

      const difficultyDistribution = Object.fromEntries(
        Object.entries(v.difficultyDistribution || {}).map(([name, pct]) => [
          DIFF_KEY_TO_ID[name as keyof typeof DIFF_KEY_TO_ID],
          Number(pct),
        ])
      );

      const sectionName = isAdmin
        ? adminSectionOptions.find((sec) => sec.id === Number(v.section))?.name
        : sectionOptions.find((sec) => sec.id === Number(v.section))?.name;

      const finalShiftId = isAdmin ? adminShift?.id ?? null : shiftId;

      return {
        faculty_id: userId,
        name: (v.name || "").trim(),
        year: Number(v.year),
        yearId: Number(v.year),
        semester: Number(v.semester),
        semId: Number(v.semester),
        academicYearId: selectedAcademicYearId,
        programme: Number(v.programme),
        programId: Number(v.programme),
        course: Number(v.course),
        chapters: v.chapters ?? [],
        topics: v.topics ?? [],
        question_count: v.question_count,
        duration: String(v.duration ?? ""),
        start_date: v.start_date,
        end_date: v.end_date,
        test_mode: Number(v.test_mode),
        online_instructions: v.online_instructions,
        offline_instructions: v.offline_instructions,
        bloomDistribution,
        difficultyDistribution,
        shift_id: finalShiftId,
        shiftId: finalShiftId ?? undefined,
        section: sectionName || null,
        studentsIds: Array.isArray(v.studentsIds) ? v.studentsIds : [],
      };
    },
    [isAdmin, adminShift?.id, shiftId, sectionOptions, userId, selectedAcademicYearId]
  );

  // Build a minimal payload for availability API (strip fields backend doesn't accept)
  const buildAvailabilityPayload = useCallback(
    (v: ExamSchema) => {
      const full = buildCreateExamPayload(v) as any;
      const {
        yearId: _yid,
        semId: _sid,
        programId: _pid,
        shiftId: _shid,
        academicYearId: _ayid,
        studentsIds: _stu,
        ...rest
      } = full;
      // Ensure name is non-empty for shared validation on backend
      return {
        ...rest,
        name: (v.name || "Exam").trim() || "Exam",
      } as any;
    },
    [buildCreateExamPayload]
  );

  // CreateExamDto-compliant payload (create only)
  const buildCreateDtoPayload = useCallback(
    (v: ExamSchema) => {
      const sectionName = isAdmin
        ? adminSectionOptions.find((sec) => sec.id === Number(v.section))?.name
        : sectionOptions.find((sec) => sec.id === Number(v.section))?.name;
      const finalShiftId = isAdmin ? adminShift?.id ?? null : shiftId;

      const bloomDistribution = Object.fromEntries(
        Object.entries(v.bloomDistribution || {}).map(([name, count]) => [
          BLOOM_KEY_TO_ID[name],
          Number(count),
        ])
      );
      const difficultyDistribution = Object.fromEntries(
        Object.entries(v.difficultyDistribution || {}).map(([name, pct]) => [
          DIFF_KEY_TO_ID[name as keyof typeof DIFF_KEY_TO_ID],
          Number(pct),
        ])
      );

      const dto: any = {
        name: (v.name || "").trim(),
        year: Number(v.year),
        semester: Number(v.semester),
        programme: Number(v.programme),
        course: Number(v.course),
        chapters: v.chapters ?? [],
        topics: v.topics ?? [],
        question_count: v.question_count,
        duration: String(v.duration ?? ""),
        start_date: v.start_date,
        end_date: v.end_date,
        test_mode: Number(v.test_mode),
        online_instructions: v.online_instructions,
        offline_instructions: v.offline_instructions,
        faculty_id: userId,
        bloomDistribution,
        difficultyDistribution,
      };
      if (finalShiftId !== null && finalShiftId !== undefined) dto.shift_id = finalShiftId;
      if (sectionName) dto.section = sectionName;
      if (selectedAcademicYearId !== undefined) dto.academicYearId = selectedAcademicYearId;
      if (Array.isArray(v.studentsIds) && v.studentsIds.length > 0) dto.studentIds = v.studentsIds;
      return dto;
    },
    [isAdmin, adminShift?.id, shiftId, sectionOptions, userId, selectedAcademicYearId]
  );

  // --- Availability: only when form complete AND totals == 100; dedup + debounce
  const isFormComplete = useMemo(() => {
    const base =
      Number(year) > 0 &&
      Number(semester) > 0 &&
      Number(programme) > 0 &&
      Number(courseVal) > 0 &&
      Array.isArray(chapters) &&
      chapters.length > 0 &&
      Number(question_count) > 0 &&
      Number(duration) > 0 &&
      Boolean(start_date) &&
      Boolean(end_date) &&
      Number(test_mode) > 0;

    const roleExtra = isAdmin ? Boolean(adminShift?.id) : Boolean(sectionVal);
    return base && roleExtra;
  }, [
    year,
    semester,
    programme,
    courseVal,
    chapters,
    question_count,
    duration,
    start_date,
    end_date,
    test_mode,
    isAdmin,
    adminShift?.id,
    sectionVal,
  ]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    if (!open) return;
    const ready =
      isFormComplete && maxQuestions > 0 && bloomTotal === maxQuestions && difficultyTotal === 100;
    if (!ready) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = buildAvailabilityPayload(getValues());
      const sig = JSON.stringify(payload);
      if (sig === lastSigRef.current) return;
      lastSigRef.current = sig;
      triggerAvailability(payload);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, isFormComplete, bloomTotal, difficultyTotal, maxQuestions, buildAvailabilityPayload, getValues, triggerAvailability]);

  // --- CKEditor modal handlers ---
  const handleOpenEditor = (type: "online" | "offline") => {
    setCurrentInstructionType(type);
    const currentValue =
      type === "online" ? getValues("online_instructions") : getValues("offline_instructions");
    setEditorState(currentValue || LEXICAL_EDITOR.DEFAULT_VALUE);
    setIsModalOpen(true);
  };

  const handleEditorClose = () => {
    setIsModalOpen(false);
  };

  const handleEditorUpdate = () => {
    if (currentInstructionType === "online") {
      setValue("online_instructions", editorState);
    } else {
      setValue("offline_instructions", editorState);
    }
    setIsModalOpen(false);
  };

  // Strip HTML tags for display
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // --- IMPORTANT FIX: do NOT wipe Bloom on initial render; only when the count CHANGES later
  const prevQCountRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const q = question_count ?? "";
    // Only reset if question_count actually CHANGES after first render
    if (prevQCountRef.current !== null && prevQCountRef.current !== q) {
      const zeroBlooms = Object.fromEntries(bloomLevels.map((b) => [b.key, 0])) as Record<
        string,
        number
      >;
      setValue("bloomDistribution", zeroBlooms, { shouldValidate: true, shouldDirty: true });
      // Ensure availability re-checks
      lastSigRef.current = "";
    }
    prevQCountRef.current = q;
  }, [open, question_count, setValue]);

  // --- Resolve section name from form value (id)
  const getSectionNameFromVal = useCallback((): string | null => {
    const val = sectionVal;
    if (!val) return null;
    const opts = isAdmin ? adminSectionOptions : sectionOptions;
    return opts.find((s) => String(s.id) === String(val))?.name ?? null;
  }, [isAdmin, sectionOptions, sectionVal]);

  // If any of the student-targeting filters change in edit mode, clear preselected only after initial hydration
  useEffect(() => {
    if (!open) return;
    if (!initialData?.id) return;
    if (!preselectHydratedRef.current) return;
    // when year/semester/programme/shift/section change, clear students
    setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
  }, [open, initialData?.id, year, semester, programme, adminShift?.id, sectionVal]);

  // --- Debounced targeted students fetch (via RTK Query endpoint) ---
  const [triggerTargeted, targetedState] = useLazyGetTargetedStudentsQuery();
  useEffect(() => {
    if (!open) return;
    const sectionName = getSectionNameFromVal();
    const effectiveShift = isAdmin ? adminShift?.id : shiftId;
    const ready =
      Number(year) > 0 &&
      Number(semester) > 0 &&
      Number(programme) > 0 &&
      Boolean(sectionName) &&
      Boolean(effectiveShift) &&
      selectedAcademicYearId !== undefined;
    if (!ready) return;

    if (usersDebounceRef.current) clearTimeout(usersDebounceRef.current);
    // Clear selected students immediately when filters change (first change must clear)
    const sig = JSON.stringify({
      year: Number(year),
      semester: Number(semester),
      programId: Number(programme),
      shiftId: Number(effectiveShift),
      section: sectionName,
      academicYearId: selectedAcademicYearId,
    });
    if (sig !== targetedSigRef.current) {
      targetedSigRef.current = sig;
      setValue("studentsIds", [], { shouldValidate: true, shouldDirty: true });
    }
    setUsersLoading(true);
    usersDebounceRef.current = setTimeout(async () => {
      try {
        const res: any = await triggerTargeted({
          year: Number(year),
          semester: Number(semester),
          programId: Number(programme),
          shiftId: Number(effectiveShift),
          section: sectionName!,
          academicYearId: selectedAcademicYearId,
        }).unwrap();
        const users = Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
        const options = users.map((u: any) => ({ value: String(u.id), label: u.name || String(u.id) }));
        setStudentOptions(options);
        // Hydrate preselected student IDs only once on first load in edit mode
        if (!preselectHydratedRef.current && initialData?.student_ids && Array.isArray(initialData.student_ids)) {
          const now = getValues("studentsIds") || [];
          if (!now || now.length === 0) {
            setValue("studentsIds", initialData.student_ids as number[], { shouldDirty: false, shouldValidate: true });
            preselectHydratedRef.current = true;
          }
        }
      } catch (e) {
        // ignore here; toast is not necessary for background fetch
      } finally {
        setUsersLoading(false);
      }
    }, 350);

    return () => {
      if (usersDebounceRef.current) clearTimeout(usersDebounceRef.current);
    };
  }, [open, isAdmin, adminShift?.id, shiftId, sectionVal, year, semester, programme, selectedAcademicYearId, getSectionNameFromVal, triggerTargeted]);

  // --- Dynamic placeholder for Students picker: remove filled fields progressively
  const studentsPlaceholder = useMemo(() => {
    const parts: string[] = [];
    if (!(Number(year) > 0)) parts.push("Year");
    if (!(Number(semester) > 0)) parts.push("Semester");
    if (!(Number(programme) > 0)) parts.push("Programme");
    if (isAdmin && !adminShift?.id) parts.push("Shift");
    if (!getSectionNameFromVal()) parts.push("Section");
    if (parts.length === 0) return "Select students";
    return `Select ${parts.join(", ")}`;
  }, [year, semester, programme, isAdmin, adminShift?.id, getSectionNameFromVal]);

  // --- Submit uses the SAME payload builder now
  const onSubmit = async (values: z.infer<any>) => {
    try {
      setLoading(true);

      const payload = buildCreateExamPayload(values);
      console.log("payload", payload);

      if (initialData?.id) {
        const updateDto = buildCreateDtoPayload(values);
        await updateAdminExam({ id: initialData.id, data: updateDto }).unwrap();
        toast({
          title: "Success",
          description: "Exam updated successfully!",
          variant: "default",
        });
      } else {
        const createDto = buildCreateDtoPayload(values);
        await createAdminExam(createDto).unwrap();
        toast({
          title: "Success",
          description: "New exam created successfully!",
          variant: "default",
        });
      }
    } catch (err: any) {
      const errorMessage = err?.data?.message ?? err?.error ?? "Something went wrong";
      toast({
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      onClose();
      setLoading(false);
    }
  };

  return (
    <>
      <MainDialog
        isOpen={open}
        title={buttonName}
        onOpenChange={onClose}
        size={isLaptop ? "lg1" : "lg"}
      >
        <div className="min-h-[500px] max-h-[80vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Two Column Layout */}
              <div className={`grid ${isLaptop ? "grid-cols-1" : "grid-cols-2"} gap-8`}>
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Exam Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Label className="text-sm font-medium">Exam Name</Label>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter exam name"
                            {...field}
                            className="h-10"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Year and Semester */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Year</Label>
                          </FormLabel>
                          <FormControl>
                            <SelectDropdown
                              disabled={loading}
                              options={yearsOptions}
                              value={yearsOptions.find((year) => year.id === field.value)}
                              onChange={(item) => yearChangeHandler(item, field)}
                              placeholder="Select year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="semester"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Semester</Label>
                          </FormLabel>
                          <FormControl>
                            <SelectDropdown
                              disabled={loading}
                              options={semestersOptions}
                              value={semestersOptions.find((sem) => sem.id === field.value)}
                              onChange={(item) => semesterChangeHandler(item, field)}
                              placeholder="Select semester"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Programme and Course */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="programme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Programme</Label>
                          </FormLabel>
                          <FormControl>
                            <SelectDropdown
                              disabled={loading}
                              options={programData}
                              value={programData.find((pro) => pro.id === field.value)}
                              onChange={(item) => programChangeHandler(item, field)}
                              placeholder="Select program"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Course</Label>
                          </FormLabel>
                          <FormControl>
                            <SelectDropdown
                              disabled={loading || !(Number(watch("semester")) > 0)}
                              options={courseData}
                              value={courseData.find((course) => course.id === field.value)}
                              onChange={(item) => courseChangeHandler(item, field)}
                              placeholder="Select course"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Chapters and Topics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chapters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Chapters</Label>
                          </FormLabel>
                          <FormControl>
                            <MultiSelectDropdown
                              disabled={loading}
                              options={chapterData}
                              selectedItems={chapterData.filter(
                                (chapter) => field.value && field.value.includes(chapter.id)
                              )}
                              onChange={(items) => chapterChangeHandler(items, field)}
                              placeholder="Select chapters"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Topics</Label>
                          </FormLabel>
                          <FormControl>
                            <MultiSelectDropdown
                              disabled={loading}
                              options={topicsData}
                              selectedItems={topicsData.filter(
                                (topic) => field.value && field.value.includes(topic.id)
                              )}
                              onChange={(items) => topicChangeHandler(items, field)}
                              placeholder="Select topics"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Question Count and Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="question_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Question Count</Label>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Question Count"
                              {...field}
                              className="h-10"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Duration (Minutes)</Label>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter The Exam Time"
                              {...field}
                              className="h-10"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Start Time and End Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Start Time</Label>
                          </FormLabel>

                          <FormControl>
                            <div className="relative">
                              <Input
                                type="datetime-local"
                                id="start_date"
                                disabled={loading}
                                {...field}
                                onClick={(e) => e.currentTarget.showPicker()}
                                className={`h-11 w-full rounded-sm border-border text-sm pr-10
                                  ${field.value ? "text-black" : "text-[#4B4B4B]"}
                                  [&::-webkit-calendar-picker-indicator]:opacity-0
                                  [&::-webkit-clear-button]:hidden
                                  [&::-webkit-inner-spin-button]:hidden`}
                                placeholder="Select date and time"
                                value={field.value || ""}
                              />

                              {/* Icon anchored at the end; clicking it triggers input click via label */}
                              <label
                                htmlFor="start_date"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                                aria-label="Open date & time picker"
                              >
                                <Calendar className="h-5 w-5 pointer-events-none" />
                              </label>
                            </div>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">End Time</Label>
                          </FormLabel>

                          <FormControl>
                            <div className="relative">
                              <Input
                                disabled={loading}
                                type="datetime-local"
                                id="end_date"
                                {...field}
                                onClick={(e) => e.currentTarget.showPicker()}
                                className={`h-11 w-full rounded-sm border-border text-sm pr-10
                                  ${field.value ? "text-black" : "text-[#4B4B4B]"}
                                  [&::-webkit-calendar-picker-indicator]:opacity-0
                                  [&::-webkit-clear-button]:hidden
                                  [&::-webkit-inner-spin-button]:hidden`}
                                placeholder="Select date and time"
                                value={field.value || ""}
                              />

                              {/* Custom calendar icon at the end */}
                              <label
                                htmlFor="end_date"
                                aria-label="Open date & time picker"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                              >
                                <Calendar className="h-5 w-5 pointer-events-none" />
                              </label>
                            </div>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  {/* Test Mode + Section/Shift */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="test_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Test Mode</Label>
                          </FormLabel>
                          <FormControl>
                            <SelectDropdown
                              disabled={loading}
                              options={testModes}
                              value={testModes.find((mode) => mode.id === field.value)}
                              onChange={(item) => testModeChangeHandler(item, field)}
                              placeholder="Select Test Mode"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isAdmin ? (
                      <FormItem>
                        <FormLabel>
                          <Label className="text-sm font-medium">Shift</Label>
                        </FormLabel>
                        <FormControl>
                          <SelectDropdown
                            disabled={loading}
                            options={adminShiftOptions}
                            value={adminShift ?? undefined}
                            onChange={(item) => setAdminShift(item)}
                            placeholder="Select Shift"
                          />
                        </FormControl>
                      </FormItem>
                    ) : (
                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Label className="text-sm font-medium">Section</Label>
                            </FormLabel>
                            <FormControl>
                              <SelectDropdown
                                disabled={loading}
                                options={sectionOptions}
                                value={sectionOptions.find(
                                  (sec) => sec.id.toString() === field.value
                                )}
                                onChange={(item) => sectionChangeHandler(item, field)}
                                placeholder="Select Section"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Admin: Section row (place Students picker in the same row's second column) */}
                  {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Label className="text-sm font-medium">Section</Label>
                            </FormLabel>
                            <FormControl>
                              <SelectDropdown
                                disabled={loading}
                                options={adminSectionOptions}
                                value={adminSectionOptions.find(
                                  (sec) => sec.id.toString() === field.value
                                )}
                                onChange={(item) => sectionChangeHandler(item, field)}
                                placeholder="Select Section"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Students selection for Admin in same row */}
                      <FormField
                        control={form.control}
                        name="studentsIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Label className="text-sm font-medium">Students</Label>
                            </FormLabel>
                            <FormControl>
                              <MultiSelectDropdown
                                disabled={
                                  usersLoading ||
                                  !(
                                    Number(year) > 0 &&
                                    Number(semester) > 0 &&
                                    Number(programme) > 0 &&
                                    getSectionNameFromVal() &&
                                    (isAdmin ? adminShift?.id : shiftId) &&
                                    selectedAcademicYearId !== undefined
                                  )
                                }
                                labeledOptions={studentOptions}
                                value={(field.value || []).map((n: number) => String(n))}
                                onValueChange={(vals) => {
                                  field.onChange(vals.map((v) => Number(v)));
                                }}
                                searchable
                                compactChips
                                loading={usersLoading}
                                placeholder={studentsPlaceholder}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Students selection for Faculty (Admin uses the one inline with Section above) */}
                  {!isAdmin && (
                    <FormField
                      control={form.control}
                      name="studentsIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Label className="text-sm font-medium">Students</Label>
                          </FormLabel>
                          <FormControl>
                            <MultiSelectDropdown
                              disabled={
                                usersLoading ||
                                !(
                                  Number(year) > 0 &&
                                  Number(semester) > 0 &&
                                  Number(programme) > 0 &&
                                  getSectionNameFromVal() &&
                                  (isAdmin ? adminShift?.id : shiftId) &&
                                  selectedAcademicYearId !== undefined
                                )
                              }
                              labeledOptions={studentOptions}
                              value={(field.value || []).map((n: number) => String(n))}
                              onValueChange={(vals) => {
                                field.onChange(vals.map((v) => Number(v)));
                              }}
                              searchable
                              compactChips
                              loading={usersLoading}
                              placeholder={studentsPlaceholder}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Bloom's Distribution */}
                  <FormField
                    control={form.control}
                    name="bloomDistribution"
                    render={() => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel>
                            <Label className="text-base font-medium">
                              Bloom&apos;s Level Distribution
                            </Label>
                          </FormLabel>
                          <span
                            className={`text-sm font-medium ${
                              bloomTotal === maxQuestions ? "text-green-600" : "text-blue-600"
                            }`}
                          >
                            Total: {bloomTotal}/{maxQuestions}
                          </span>
                        </div>
                        <FormControl>
                          <div className="space-y-4 p-4 border rounded-lg !mt-0 bg-gray-50/30">
                            {maxQuestions === 0 && (
                              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                Please set the question count first to configure Bloom&apos;s
                                distribution.
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {bloomLevels.map((bloom) => (
                                <div key={bloom.key} className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {bloom.label}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {form.getValues("bloomDistribution")[bloom.key]}
                                    </span>
                                  </div>
                                  <Slider
                                    disabled={loading || maxQuestions === 0}
                                    value={[form.getValues("bloomDistribution")[bloom.key]]}
                                    onValueChange={([v]) => handleBloomChange(bloom.key as any, v)}
                                    min={0}
                                    max={maxQuestions}
                                    step={1}
                                    className="w-full"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Difficulty Distribution */}
                  <FormField
                    control={form.control}
                    name="difficultyDistribution"
                    render={() => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-4">
                          <FormLabel>
                            <Label className="text-base font-medium">Difficulty Distribution</Label>
                          </FormLabel>
                          <span
                            className={`text-sm font-medium ${
                              difficultyTotal === 100 ? "text-green-600" : "text-blue-600"
                            }`}
                          >
                            Total: {difficultyTotal}%
                          </span>
                        </div>
                        <FormControl>
                          <div className="space-y-4 p-4 border rounded-lg bg-gray-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              {difficultyTiers.map((tier) => (
                                <div key={tier} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {tier}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {form.getValues("difficultyDistribution")[tier]}%
                                    </span>
                                  </div>
                                  <Slider
                                    disabled={loading}
                                    value={[form.getValues("difficultyDistribution")[tier]]}
                                    onValueChange={([v]) => handleDifficultyChange(tier as any, v)}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="w-full"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Optional: live availability hint */}
                  {isChecking ? (
                    <div className="text-sm text-blue-600">Checking available questions…</div>
                  ) : availabilityData ? (
                    <div className="text-sm text-green-700">
                       Available questions: <b>{availabilityData?.count ?? "-"}</b>
                    </div>
                  ) : null}

                  {/* Online Instructions */}
                  <FormField
                    control={form.control}
                    name="online_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Online Instructions</FormLabel>
                        <FormControl>
                          <div className="flex items-center w-full rounded-md border border-gray-300 bg-white px-3 py-2 min-h-[60px]">
                            <div className="flex-1 pr-2">
                              {field.value ? (
                                <div className="text-sm text-gray-900 line-clamp-2">
                                  {stripHtml(field.value)}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Click here to add or modify the online instructions
                                </span>
                              )}
                            </div>
                            <Button
                              disabled={loading}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto shrink-0"
                              onClick={() => handleOpenEditor("online")}
                            >
                              Add/Edit
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Offline Instructions */}
                  <FormField
                    control={form.control}
                    name="offline_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offline Instructions</FormLabel>
                        <FormControl>
                          <div className="flex items-center w-full rounded-md border border-gray-300 bg-white px-3 py-2 min-h-[60px]">
                            <div className="flex-1 pr-2">
                              {field.value ? (
                                <div className="text-sm text-gray-900 line-clamp-2">
                                  {stripHtml(field.value)}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Click here to add or modify the offline instructions
                                </span>
                              )}
                            </div>
                            <Button
                              disabled={loading}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto shrink-0"
                              onClick={() => handleOpenEditor("offline")}
                            >
                              Add/Edit
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="submit"
                  className="bg-gray-300 hover:bg-gray-500"
                  variant="outline"
                  color="default"
                  disabled={loading}
                >
                  {buttonName}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </MainDialog>

      {/* Editor Modal */}
      {isModalOpen && (
        <CustomEditor
          open={isModalOpen}
          onClose={handleEditorClose}
          editorState={editorState}
          setEditorState={setEditorState}
          onUpdate={handleEditorUpdate}
          title={`${currentInstructionType === "online" ? "Online" : "Offline"} Instructions`}
        />
      )}
    </>
  );
};

export default ExamModal;
