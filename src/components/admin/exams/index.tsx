import React, { useEffect, useState } from "react";
import ExamCard from "./ExamCard";
import ExamHeader from "./ExamHeader";
import ExamModal from "./ExamModal";
import { useGetAdminExamsPaginatedQuery, useGetAdminExamByIdQuery } from "@/api/api/admin/exams";
import ViewQuestionModal from "./ViewQuestionModal";
import {
  useGetQuestionsByIdQuery,
  useReplaceExamQuestionMutation,
} from "@/api/api/question-bank-api";
import ViewStudentsModal from "./ViewStudentsModal";
import { useGetAllStudentsByExamIdQuery } from "@/api/api/admin/student";
import { GenericType } from "@/types";
import { PaginationServer } from "@/components/ui/pagination-server-side";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

type ReplacePayload = {
  s_no?: number;
  course_id?: number;
  question_typeId?: number;
  co_outcomeId?: number;
  programId?: number;
  chapterId?: number;
  topicId?: number;
  examId: number;
};

export type ExamMode = "create" | "edit";

const Exams = () => {
  const { toast } = useToast();
  const [replaceExamQuestion, { isLoading: replacing }] = useReplaceExamQuestionMutation();
  const [openExamModal, setOpenExamModal] = useState(false);
  const [questionExamId, setQuestionExamId] = useState<number | undefined>();
  const [editExamId, setEditExamId] = useState<number | undefined>();
  const [studentExamId, setStudentExamId] = useState<number | undefined>();
  const [viewStudents, setViewStudents] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<GenericType>({ id: 0, name: "All" });
  const [examType, setExamType] = useState<ExamMode>("create");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<ReplacePayload | null>(null);
  const [confirming, setConfirming] = useState(false);

  // NEW: local initialData state for the modal
  const [initialDataState, setInitialDataState] = useState<any>(null);

  // Get logged-in admin userId
  const userDetails = localStorage.getItem("userDetails")
    ? JSON.parse(localStorage.getItem("userDetails") || "{}")
    : null;

  const userIdStr = userDetails?.id ? String(userDetails.id) : "";
  const userRole = userDetails?.role || "";

  // Fetch all exams for the admin
  // server-side pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const {
    data: examPaginated,
    isLoading,
    isFetching,
  } = useGetAdminExamsPaginatedQuery(
    { userId: userIdStr, role: userRole, page, limit, filter: selectedFilter.id as number },
    { skip: userIdStr === "" || userRole === "" }
  );

  // Support both array and { data, total } responses
  const examList = React.useMemo(() => {
    const raw: any = examPaginated as any;
    const list = Array.isArray(raw) ? raw : raw?.data;
    return Array.isArray(list) ? list : [];
  }, [examPaginated]);

  const total = React.useMemo(() => {
    const raw: any = examPaginated as any;
    return Array.isArray(raw) ? raw.length : raw?.total ?? 0;
  }, [examPaginated]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { data: editExamDetails } = useGetAdminExamByIdQuery(editExamId, {
    skip: editExamId == null,
  });

  useEffect(() => {
    if (editExamId) {
      setExamType("edit");
    } else {
      setExamType("create");
    }
  }, [editExamId]);

  // Fetch questions for selected exam
  const {
    data: questions,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useGetQuestionsByIdQuery(String(questionExamId), {
    skip: questionExamId == null,
  });

  // Fetch students for selected exam
  const { data: studentsData } = useGetAllStudentsByExamIdQuery(String(studentExamId), {
    skip: studentExamId == null,
  });

  // Frontend filtering removed; relying on API filter

  // Handlers
  const createExamHandler = () => {
    // ensure clean "create"
    setInitialDataState(null); // <-- clear local initial data
    setEditExamId(undefined); // <-- ensure not in edit mode
    setExamType("create");
    setOpenExamModal(true);
  };

  const handleViewQuestions = (examId: number) => {
    setQuestionExamId(examId);
  };

  const handleViewStudents = (examId: number) => {
    setStudentExamId(examId);
    setViewStudents(true);
  };

  const handleEditExam = (examId: number) => {
    setEditExamId(examId);
  };

  // When the edit exam details arrive, set local initialData and open the modal
  useEffect(() => {
    if (editExamDetails && editExamId != null) {
      setInitialDataState(editExamDetails); // <-- copy into state
      setOpenExamModal(true);
    }
  }, [editExamDetails, editExamId]);

  const handleFilterChange = (filter: GenericType) => {
    setSelectedFilter(filter);
  };

  const handleReplaceQuestion = (p: ReplacePayload) => {
    setPendingReplace(p);
    setConfirmOpen(true);
  };

  const handleCloseExamModal = () => {
    setOpenExamModal(false);
    setEditExamId(undefined); // <-- ensures next open is "create"
    setInitialDataState(null); // <-- clear the prefills
  };

  const confirmReplace = async () => {
    if (!pendingReplace?.s_no) return;
    setConfirming(true);
    try {
      await replaceExamQuestion({
        examId: pendingReplace.examId,
        currentQuestionSNo: pendingReplace.s_no,
        course_id: pendingReplace.course_id,
        question_typeId: pendingReplace.question_typeId,
        co_outcomeId: pendingReplace.co_outcomeId,
        programId: pendingReplace.programId,
        chapterId: pendingReplace.chapterId,
        topicId: pendingReplace.topicId,
      }).unwrap();

      toast({
        title: "Question replaced",
        description: "The selected question has been replaced.",
      });

      await refetchQuestions();

      setConfirmOpen(false);
      setPendingReplace(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Replace failed",
        description: e?.data?.message || e?.message || "Something went wrong.",
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <ExamHeader onCreate={createExamHandler} onFilter={handleFilterChange} />

      {isLoading || isFetching ? (
        <div className="flex justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading exams...</span>
        </div>
      ) : examList.length === 0 ? (
        <div className="flex justify-center py-12">
          <span className="text-sm md:text-lg text-black">
            No exams found for the {selectedFilter?.name}.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {examList.map((exam) => (
            <ExamCard
              key={exam.id}
              {...exam}
              onViewQuestions={() => handleViewQuestions(exam.id)}
              onViewStudents={() => handleViewStudents(exam.id)}
              onEditExam={() => handleEditExam(exam.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && !(isLoading || isFetching) && (
        <div className="flex justify-center mt-6">
          <PaginationServer
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            perPage={limit}
            onPerPageChange={(val) => {
              setPage(1);
              setLimit(val);
            }}
            totalItems={total}
          />
        </div>
      )}

      {/* Create/Edit Exam Modal */}
      {openExamModal && (
        <ExamModal
          key={editExamId ?? "create"} // optional: forces remount between edit/create
          open={openExamModal}
          onClose={handleCloseExamModal}
          examType={examType}
          initialData={initialDataState} // <-- pass local state
        />
      )}

      {/* View Questions Modal */}
      {questionExamId != null && (
        <ViewQuestionModal
          open={true}
          onClose={() => setQuestionExamId(undefined)}
          questions={questions}
          isLoading={questionsLoading}
          examId={questionExamId}
          onReplace={handleReplaceQuestion}
        />
      )}

      {/* View Students Modal */}
      {viewStudents && studentExamId != null && (
        <ViewStudentsModal
          isOpen={viewStudents}
          onClose={() => {
            setViewStudents(false);
            setStudentExamId(undefined);
          }}
          students={studentsData}
        />
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the selected question in this exam. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmReplace}
                disabled={confirming || replacing}
                className="min-w-24  bg-[#2b2b2b] text-white"
              >
                {confirming || replacing ? "Replacing..." : "Replace"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Exams;
