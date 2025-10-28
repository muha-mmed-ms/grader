import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { skipToken } from "@reduxjs/toolkit/query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateProgramOutcomeMutation,
  useGetProgramOutComesByIdQuery,
  useGetCoursesByProgramIdQuery,
  useGetPdfExtractedDataByProgramIdQuery,
} from "@/api/api/program-outcomes-api";
import { useGetSyllabusQuery, useUploadSyllabusMutation } from "@/api/api/file-upload-api";
import { toast } from "sonner";
import { SyllabusCard } from "./SyllabusItem";
import ExtractedPdfSection from "./ExtractedPdfSection";

const ProgramOutComes = () => {
  const { programId } = useParams<{ programId: string }>();
  const subjectIds = localStorage.getItem("subjectIds");
  const {
    data: outcomes = [],
    isLoading,
    error,
    refetch,
  } = useGetProgramOutComesByIdQuery(programId!, {
    skip: !programId, // 🚀 Key Fix
  });
  const {
    data: courses = [],
    isLoading: isCoursesLoading,
    error: courseError,
  } = useGetCoursesByProgramIdQuery(
    programId ? { programId, subjectIds: subjectIds || undefined } : skipToken // ⬅️ skip the query if programId is undefined
  );
  const {
    data: pdfData,
    isLoading: isPdfLoading,
    error: pdfError,
    // refetch: refetchCourses,
  } = useGetPdfExtractedDataByProgramIdQuery(programId!, {
    skip: !programId,
  });
  const [createProgramOutcome, { isLoading: isCreating }] = useCreateProgramOutcomeMutation();

  const navigate = useNavigate();
  const [isOutcomeDialogOpen, setIsOutcomeDialogOpen] = useState(false);
  const [outcomeFormData, setOutcomeFormData] = useState({
    code: "",
    description: "",
  });
  const [uploadSyllabus, { isLoading: isUploading }] = useUploadSyllabusMutation();

  // Derive semester numbers from courses and group into dynamic Year tabs (1-2, 3-4, ...)
  const semesterNumbers = React.useMemo(() => {
    const nums = (courses || [])
      .flatMap((c) => {
        const raw = c?.semesters ?? "";
        if (typeof raw !== "string") return [] as number[];
        return raw
          .split(/[,\s]+/)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0);
      })
      .filter((n) => Number.isFinite(n));
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  }, [courses]);

  const yearGroups = React.useMemo(
    () => {
      if (!semesterNumbers.length) return [] as { year: number; semesters: [number, number] }[];
      const maxSemester = Math.max(...semesterNumbers);
      const maxYear = Math.ceil(maxSemester / 2);
      const groups: { year: number; semesters: [number, number] }[] = [];
      for (let y = 1; y <= maxYear; y++) {
        const a = 2 * y - 1;
        const b = 2 * y;
        // Include a year only if at least one of its semesters exists in data
        if (semesterNumbers.includes(a) || semesterNumbers.includes(b)) {
          groups.push({ year: y, semesters: [a, b] });
        }
      }
      return groups;
    },
    [semesterNumbers]
  );

  const [selectedYearKey, setSelectedYearKey] = useState<string | null>(null);

  useEffect(() => {
    if (yearGroups.length && !selectedYearKey) {
      setSelectedYearKey(`year-${yearGroups[0].year}`);
    }
    if (!yearGroups.length) {
      setSelectedYearKey(null);
    }
  }, [yearGroups, selectedYearKey]);

  const filteredCourses = React.useMemo(() => {
    if (!courses || !courses.length) return courses;
    if (!selectedYearKey) return courses;
    const yearNum = Number((selectedYearKey || "").replace("year-", ""));
    const grp = yearGroups.find((g) => g.year === yearNum);
    if (!grp) return courses;
    const [s1, s2] = grp.semesters;
    return courses.filter((c) => {
      const raw = c?.semesters ?? "";
      if (typeof raw !== "string") return false;
      const nums = raw
        .split(/[,\s]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
      return nums.includes(s1) || nums.includes(s2);
    });
  }, [courses, selectedYearKey, yearGroups]);

  const {
    data,
    isError,
    refetch: refetchSyllabus,
  } = useGetSyllabusQuery(
    { programId: Number(programId), organization_id: "1" },
    { skip: !programId }
  );

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!programId) return;

    try {
      const res = await createProgramOutcome({
        program_id: Number(programId),
        code: outcomeFormData.code,
        description: outcomeFormData.description,
      }).unwrap();
      refetch();
      // Reset form and close modal
      setOutcomeFormData({ code: "", description: "" });
      setIsOutcomeDialogOpen(false);
    } catch (err) {
      console.error("Failed to create outcome:", err);
      // Optionally: show a toast or alert
    }
  };

  return (
    <div className="min-h-screen max-w-full overflow-hidden">
      <div className="container mx-auto px-2 sm:px-4 max-w-full">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* <div>
              <h1 className="text-3xl font-bold text-gray-900">Computer Science B.Tech</h1>
              <div className="flex items-center gap-2 mt-5">
                <Badge variant="secondary">2024-2028</Badge>
              </div>
            </div> */}
          </div>
        </div>

        <Tabs defaultValue="program-overview" className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <TabsList className="inline-flex w-full  min-w-0 justify-evenly">
              <TabsTrigger value="program-overview" className="text-[11px] sm:text-sm whitespace-nowrap px-3 sm:px-4">
                <span className="hidden sm:inline">Program Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="outcomes" className="text-[11px] sm:text-sm whitespace-nowrap px-3 sm:px-4">
                <span className="hidden sm:inline">Program Outcomes</span>
                <span className="sm:hidden">Outcomes</span>
              </TabsTrigger>
              <TabsTrigger value="syllabus" className="text-[11px] sm:text-sm whitespace-nowrap px-3 sm:px-4">Syllabus</TabsTrigger>
              <TabsTrigger value="courses" className="text-[11px] sm:text-sm whitespace-nowrap px-3 sm:px-4">Courses</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="outcomes">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                      Program Outcomes
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Define the learning outcomes for this program</CardDescription>
                  </div>
                  <Dialog open={isOutcomeDialogOpen} onOpenChange={setIsOutcomeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" color="primary" size="default" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Outcome
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleOutcomeSubmit}>
                        <DialogHeader>
                          <DialogTitle>Create Program Outcome</DialogTitle>
                          <DialogDescription>
                            Add a new learning outcome for this program.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="code">Outcome Code</Label>
                            <Input
                              id="code"
                              value={outcomeFormData.code}
                              onChange={(e) =>
                                setOutcomeFormData({
                                  ...outcomeFormData,
                                  code: e.target.value,
                                })
                              }
                              required
                              placeholder="e.g., PO1"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={outcomeFormData.description}
                              onChange={(e) =>
                                setOutcomeFormData({
                                  ...outcomeFormData,
                                  description: e.target.value,
                                })
                              }
                              required
                              placeholder="Describe the outcome..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOutcomeDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Create Outcome</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {outcomes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap px-4 sm:px-4">Code</TableHead>
                          <TableHead className="px-4 sm:px-4">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outcomes.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium whitespace-nowrap px-4 sm:px-4 text-xs sm:text-sm">{item.code}</TableCell>
                            <TableCell className="text-xs sm:text-sm px-4 sm:px-4">{item.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 sm:px-0">
                    <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      No Program Outcomes
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">Start by adding the first outcome.</p>
                    <Button onClick={() => setIsOutcomeDialogOpen(true)} className="w-full sm:w-auto mx-4 sm:mx-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Outcome
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card style={{ contain: 'inline-size' /* hard lock against content-based expansion */ }}>
              <CardHeader className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                      Courses
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Courses offered under this program</CardDescription>
                  </div>
                  {yearGroups.length > 0 ? (
                    <div className="overflow-x-auto w-full sm:w-auto">
                      <Tabs
                        value={selectedYearKey ?? undefined}
                        onValueChange={(v) => setSelectedYearKey(v)}
                        className=""
                      >
                        <TabsList className="w-full sm:w-auto">
                          {yearGroups.map((g) => (
                            <TabsTrigger key={g.year} value={`year-${g.year}`} className="text-xs sm:text-sm whitespace-nowrap">
                              {`Year ${g.year}`}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {(filteredCourses?.length ?? 0) > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap px-4 sm:px-4">Code</TableHead>
                          <TableHead className="px-4 sm:px-4">Name</TableHead>
                          <TableHead className="whitespace-nowrap px-4 sm:px-4">Semester</TableHead>
                          <TableHead className="whitespace-nowrap px-4 sm:px-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCourses!.map((course, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap px-4 sm:px-4">{course.code}</TableCell>
                            <TableCell className="text-xs sm:text-sm px-4 sm:px-4">
                              <div className="max-w-[200px] sm:max-w-none truncate sm:whitespace-normal">
                                {course.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-4 sm:px-4">{course.semesters}</TableCell>
                            <TableCell className="px-4 sm:px-4">
                              <Button
                                variant="active_outline"
                                size="sm"
                                className="text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3"
                                onClick={() =>
                                  navigate(
                                    `/program-outcomes/${programId}/courses/${course.courseId}`
                                  )
                                }
                              >
                                <span className="hidden sm:inline">View Details</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 sm:px-0">
                    <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Courses</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">Start by adding courses to this program.</p>
                    <Button className="w-full sm:w-auto mx-4 sm:mx-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Course
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="syllabus">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Syllabus Upload</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Upload the program syllabus in PDF format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid w-full sm:max-w-sm items-center gap-1.5">
                    <Input
                      id="syllabus"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file selection
                        }
                      }}
                      className="text-xs sm:text-sm"
                    />

                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Only PDF files are accepted (Max size: 5MB)
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isUploading}
                      variant="default"
                      size="default"
                      color="primary"
                      className="w-full sm:w-auto text-xs sm:text-sm"
                      onClick={async () => {
                        const fileInput = document.getElementById("syllabus") as HTMLInputElement;
                        const file = fileInput.files?.[0];

                        if (!file) {
                          toast.error("Please select a file");
                          return;
                        }

                        try {
                          const uuid = Math.floor(Math.random() * 1e10)
                            .toString()
                            .padStart(10, "0");

                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("organization_id", "1");
                          formData.append("program_id", programId);
                          formData.append("uuid", uuid);

                          const response = await uploadSyllabus(formData).unwrap();

                          toast.success("Syllabus uploaded successfully!");
                          // refetchCourses();
                          refetchSyllabus();
                          fileInput.value = ""; // Reset file input
                        } catch (error) {
                          console.error("Error uploading file:", error);
                          toast.error("Failed to upload syllabus. Please try again.");
                        }
                      }}
                    >
                      {isUploading ? "Uploading..." : "Upload Syllabus"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4 mt-4">
              {Array.isArray(data) && data.length > 0 ? (
                data.map((syllabus) => (
                  <SyllabusCard
                    key={syllabus.id}
                    fileName={syllabus.original_filename}
                    uploadedDate={syllabus.created_at || new Date().toISOString()}
                    status={syllabus.processing_status}
                    courseOutcomeCount={5} // Static for now, can be dynamic
                    onReprocess={() => console.log(`Reprocess ${syllabus.id}`)}
                    onReview={() => console.log(`Review ${syllabus.id}`)}
                    fileId={syllabus.id}
                  />
                ))
              ) : (
                <p className="text-center text-sm sm:text-base text-gray-600 py-4 px-4">No syllabus uploaded yet.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="program-overview" className="mt-4">
            {pdfData ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 max-w-full overflow-hidden" style={{ contain: 'inline-size' /* hard lock against content-based expansion */ }}>
                <ExtractedPdfSection pdfData={pdfData} />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <p className="text-center text-muted-foreground text-xs sm:text-sm">No data found.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProgramOutComes;
