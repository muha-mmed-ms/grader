import React, { useMemo, useState } from "react";
import QuestionHistoryCard from "./QuestionHistoryCard";
import { useGetAllBatchQuestionsPaginatedQuery } from "@/api/api/question-bank-api";
import { Loader2 } from "lucide-react";
import { PaginationServer } from "@/components/ui/pagination-server-side";

const QuestionHistory = () => {
  const subjectIdsString = typeof window !== "undefined" ? localStorage.getItem("subjectIds") : null;
  const userDetailsString = typeof window !== "undefined" ? localStorage.getItem("userDetails") : null;
  const userId = userDetailsString ? JSON.parse(userDetailsString)?.id : undefined;

  // server-side pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);


  const numericUserId = userId !== undefined ? Number(userId) : undefined;
  const { data, isLoading, isFetching } = useGetAllBatchQuestionsPaginatedQuery({
    ...(subjectIdsString ? { subjectIds: subjectIdsString } : {}),
    userId: numericUserId,
    page,
    limit,
  } as any);

  const questionsData = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {isLoading || isFetching ? (
  // Loading state
  <div className="flex items-center justify-center py-10 text-gray-600 dark:text-gray-300">
    <Loader2 className="animate-spin mr-2" />
    Loading Question Batches…
  </div>
) : questionsData?.length > 0 ? (
  // Data state
  <div className="grid grid-cols-1 gap-6">
    {questionsData.map((item, idx) => {
      const globalIndex = (page - 1) * limit + idx;
      return <QuestionHistoryCard key={globalIndex} index={globalIndex} data={item} />;
    })}
  </div>
) : (
  // Empty state
  <div className="text-center text-gray-600 dark:text-gray-300 py-10">
    No Questions Batch Found
  </div>
)}
      {/* Pagination */}
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
    </div>
  );
};

export default QuestionHistory;
