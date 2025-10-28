import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, AlertCircle, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetQuestionPaperQuery } from '@/api/api/admin/question-paper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Row = { id: number; name?: string; exam_name?: string };

const UploadedQuestionTable: React.FC = () => {
  const { graderType } = useParams<{ graderType?: '1' | '2' }>();
  const navigate = useNavigate();
  const {
    data: questionPaperData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetQuestionPaperQuery(
    graderType ? { graderType } : undefined
  );

  // Normalize API result into an array of rows
  const rows: Row[] = Array.isArray(questionPaperData)
    ? questionPaperData
    : questionPaperData
    ? [questionPaperData as Row]
    : [];

  const handleView = (id: number) => {
    navigate(`/admin/grader/${graderType ?? '1'}/edit?id=${id}`);
  };

  const handleViewAnswers = (id: number) => {
    navigate(`/admin/grader/answer-keys/${id}`);
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] sm:h-auto mx-auto px-1 sm:px-0">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-full sm:h-auto flex flex-col max-w-full">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Uploaded Question Papers</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage uploaded question papers</p>
          </div>
          {/* <Button
            variant="default"
            onClick={() => navigate('/admin/grader/create')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Upload Question Paper
          </Button> */}
        </div>

        {/* Horizontal scroll for narrow screens */}
        <div className="overflow-x-auto flex-1 sm:flex-initial">
          {/* SHRINK-TO-CONTENT until max height, then scroll */}
          <div className="h-full sm:max-h-[520px] overflow-y-auto">
            <Table className="w-full">
              {/* Sticky header stays visible while vertical scrolling */}
              <TableHeader className="sticky top-0 z-10 bg-gray-50">
                <TableRow>
                  <TableHead className="w-14 sm:w-20 text-center bg-gray-50 px-2 sm:px-4">
                    No.
                  </TableHead>
                  <TableHead className="bg-gray-50 px-2 sm:px-4">
                    Name
                  </TableHead>
                  <TableHead className="text-center bg-gray-50 px-2 sm:px-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody aria-live="polite">
                {/* Loading skeleton */}
                {(isLoading || isFetching) &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={3}>
                        <div className="h-4 w-full animate-pulse bg-gray-100 rounded" />
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Error state */}
                {!isLoading && error && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-red-50 gap-3">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm">Couldn't load question papers. Please try again.</span>
                        </div>
                        <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Empty state (container collapses to fit this block) */}
                {!isLoading && !error && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                        <AlertCircle className="h-6 w-6 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No question papers found yet.</p>
                        <Button className="mt-3 w-full sm:w-auto" onClick={() => navigate(`/admin/grader/${graderType ?? '1'}/create`)}>
                          Upload Question Paper
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Data rows (shrinks when 1–2 items; scrolls when many) */}
                {!isLoading &&
                  !error &&
                  rows.length > 0 &&
                  rows.map((item, index) => (
                    <TableRow key={item.id} className={cn('hover:bg-gray-50')}>
                      <TableCell className="font-medium text-center text-xs sm:text-sm px-2 sm:px-4">{index + 1}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">
                        <div className="truncate max-w-[160px] sm:max-w-none">
                          {item.exam_name ?? item.name ?? `Paper ${item.id}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 sm:px-4">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                          <button
                            onClick={() => handleView(item.id)}
                            className="inline-flex items-center justify-center w-full sm:w-auto px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Upload Answer Sheet</span>
                            <span className="sm:hidden">Upload</span>
                          </button>
                          <button
                            onClick={() => handleViewAnswers(item.id)}
                            className="inline-flex items-center justify-center w-full sm:w-auto px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">View Questions</span>
                            <span className="sm:hidden">View</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadedQuestionTable;
