"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useEditQuestionMutation, useGetAnswerSheetByIdQuery } from "@/api/api/admin/question-paper"
import { useParams } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import * as React from "react"
import MarkdownQABot from "@/components/AnswerSheetMarkDown"
import { useGetAnswerSheetResultsByStudentIdAndQuestionIdQuery } from "@/api/api/admin/question-paper"
import TagsInput from "@/components/ui/tags-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface AnswerKey {
  id: string | number
  questionNumber?: number
  maxMarks?: number
  marksAwarded?: number | null
  questionText?: string
  expectedAnswer?: string
  studentAnswer?: string | null
  feedback?: string | null
  keyPoints?: string[]
  markingScheme?: string
  partLabel?: string | null
  optionA?: string | null
  optionB?: string | null
  optionC?: string | null
  optionD?: string | null
  orQuestions?: AnswerKey[]
  subQuestions?: AnswerKey[]
}

interface ServerAnswerKey {
  id: number
  question_number: number
  max_marks: number
  marks_awarded?: number | null
  question: string
  expected_answer: string
  student_answer?: string | null
  feedback?: string | null
  key_points?: string[] | string | null
  marking_scheme?: string | null
  part_label?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  // Nested questions can come in camelCase or snake_case depending on API
  subQuestions?: ServerAnswerKey[] | null
  orQuestions?: ServerAnswerKey[] | null
  sub_questions?: ServerAnswerKey[] | null
  or_questions?: ServerAnswerKey[] | null
}

interface AnswerSheetProps {
  answerKeys?: AnswerKey[]
  student?: boolean
}

function normalizeKeyPoints(kp: ServerAnswerKey["key_points"]): string[] {
  if (!kp) return []
  if (Array.isArray(kp)) return kp.filter(Boolean)
  return kp
    .split(/\r?\n|•|- |\u2022/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function mapServerToClient(s: ServerAnswerKey): AnswerKey {
  const sub = (s as any).subQuestions ?? (s as any).sub_questions ?? []
  const orq = (s as any).orQuestions ?? (s as any).or_questions ?? []
  return {
    id: s.id,
    questionNumber: s.question_number,
    maxMarks: s.max_marks,
    marksAwarded: s.marks_awarded ?? null,
    questionText: s.question,
    expectedAnswer: s.expected_answer,
    studentAnswer: s.student_answer ?? null,
    feedback: s.feedback ?? null,
    keyPoints: normalizeKeyPoints(s.key_points),
    markingScheme: s.marking_scheme ?? "",
    partLabel: s.part_label ?? null,
    optionA: s.option_a ?? null,
    optionB: s.option_b ?? null,
    optionC: s.option_c ?? null,
    optionD: s.option_d ?? null,
    subQuestions: Array.isArray(sub) ? sub.map(mapServerToClient) : [],
    orQuestions: Array.isArray(orq) ? orq.map(mapServerToClient) : [],
  }
}

/** CamelCase sample used only if API returns no items */
function sampleFallback(): AnswerKey[] {
  return [
    {
      id: 1243,
      questionNumber: 1,
      maxMarks: 4,
      questionText:
        "Write all the instructions given in this question paper included on the top and within each question to show that you have understood them.",
      expectedAnswer:
        'The answer should include all instructions provided in the question paper. For example:\n\n* "Answer all questions."\n* "Show all your working."\n* "Use a non-programmable calculator."\n* "Assume suitable data if necessary."\n* "CO3 refers to course outcome 3"\n\nThe exact instructions will depend on the specific question paper.',
      keyPoints: [
        "Identify all instructions.",
        "Copy instructions verbatim.",
        "Include both general and specific instructions.",
      ],
      markingScheme:
        "1 mark for identifying and writing each instruction correctly. Up to a maximum of 4 marks.",
      orQuestions: [
        {
          id: 12431,
          questionNumber: 1,
          questionText:
            "OR: List any four distinct instructions from this question paper (general or question-specific) and briefly state what each instruction requires you to do.",
          expectedAnswer:
            'Example:\n1) "Answer all questions" – attempt every question in the paper.\n2) "Show all your working" – write intermediate steps and reasoning.\n3) "Use a non-programmable calculator" – avoid using programmable devices.\n4) "Assume suitable data if necessary" – clearly state any assumptions used.',
          keyPoints: [
            "Four distinct instructions identified.",
            "Each instruction accurately paraphrased.",
            "No invented instructions.",
          ],
          markingScheme:
            "1 mark per correct instruction with a correct brief meaning, up to 4 marks.",
        },
      ],
      subQuestions: [],
    },
    {
      id: 1244,
      questionNumber: 1,
      maxMarks: 12,
      questionText:
        "In programming, a function is a block of reusable code designed to perform a task. Functions in C help to organize and simplify code, making it easier to maintain and modify. They can take inputs, perform operations, and return results. C is a function oriented programming language which means its structure is focused on the tasks to do, in contrast to object oriented languages such as C++ or Java where the focus is on the data objects such as employee or student. Write a C program and highlight in the box (i) function definition (ii) function prototype and (iii) function call (iv) input arguments",
      expectedAnswer:
        "```c\n#include <stdio.h>\n\n// Function Prototype\nint add(int a, int b); // (ii) Function Prototype\n\nint main() {\n    int num1 = 10;\n    int num2 = 20;\n\n    int sum = add(num1, num2); // (iii) Function Call (iv) Input Arguments: num1, num2\n\n    printf(\"Sum = %d\\n\", sum);\n    return 0;\n}\n\n// Function Definition\nint add(int a, int b) { // (i) Function Definition\n    return a + b;\n}\n```",
      keyPoints: [
        "Correct function definition.",
        "Correct function prototype (if needed).",
        "Correct function call.",
        "Correct use of input arguments.",
        "Clear highlighting of the required elements.",
      ],
      markingScheme:
        "3 marks for the correct function definition with return type and parameters. 3 marks for the correct function prototype (if placed before main). 3 marks for the correct function call with arguments. 3 marks for highlighting the requested elements correctly.",
      subQuestions: [
        {
          id: 12441,
          questionNumber: 2,
          maxMarks: 6,
          questionText:
            "(a) Modify the above program to add a second function `multiply(int a, int b)` and print both the sum and the product. Clearly indicate the function prototype, definition, call, and input arguments for `multiply`.",
          expectedAnswer:
            "```c\n#include <stdio.h>\n\n// Prototypes\nint add(int a, int b);\nint multiply(int a, int b); // New prototype\n\nint main() {\n    int x = 6, y = 7;\n    int s = add(x, y);              // call with input args x, y\n    int p = multiply(x, y);         // call with input args x, y\n\n    printf(\"Sum = %d\\n\", s);\n    printf(\"Product = %d\\n\", p);\n    return 0;\n}\n\n// Definitions\nint add(int a, int b) { return a + b; }\nint multiply(int a, int b) { return a * b; }\n```",
          keyPoints: [
            "Adds a second function with correct prototype.",
            "Correct calls with arguments.",
            "Outputs both results.",
            "Elements are clearly indicated.",
          ],
          markingScheme:
            "1 mark for correct prototype; 2 marks for correct definition; 2 marks for correct calls and outputs; 1 mark for clear indication of elements.",
        },
      ],
      orQuestions: [],
    },
  ]
}

export function AnswerSheet({ answerKeys = [], student = false }: AnswerSheetProps) {
  const params = useParams()
  const qpIdParam = student ? params.qpId : params.id
  const studentIdParam = student ? params.studentId : undefined

  const { data, isLoading, error, refetch } = useGetAnswerSheetByIdQuery(
    { id: Number(qpIdParam) },
    { skip: !qpIdParam || !!student }
  )

  const { data: studentData } = useGetAnswerSheetResultsByStudentIdAndQuestionIdQuery(
    { studentId: Number(studentIdParam), questionId: Number(qpIdParam) },
    { skip: !student || !studentIdParam || !qpIdParam }
  ) as any

  const apiItems: ServerAnswerKey[] = React.useMemo(() => {
    if (student) {
      return Array.isArray(studentData) ? (studentData as ServerAnswerKey[]) : []
    }
    if (!data) return []
    return Array.isArray(data)
      ? (data as unknown as ServerAnswerKey[])
      : [data as unknown as ServerAnswerKey]
  }, [student, studentData, data])

  const items: AnswerKey[] = apiItems.length ? apiItems.map(mapServerToClient) : answerKeys

  // Per-card editing state (non-student)
  const [editingIds, setEditingIds] = React.useState<Set<AnswerKey["id"]>>(new Set())
  const [draftsById, setDraftsById] = React.useState<Record<string | number, AnswerKey>>({})
  const [savedEdits, setSavedEdits] = React.useState<AnswerKey[] | null>(null)

  // Use saved edits if present; else API items; else safe sample
  const baseItems: AnswerKey[] = (items.length ? items : sampleFallback())

  const [editQuestion, { isLoading: isSaving }] = useEditQuestionMutation()

  const beginEdit = React.useCallback(
    (id: AnswerKey["id"]) => {
      if (student) return
      setEditingIds((prev) => new Set([...Array.from(prev), id]))
      setDraftsById((prev) => {
        if (prev[id]) return prev
        const source = baseItems.find((ak) => ak.id === id)
        return source ? { ...prev, [id]: { ...source } } : prev
      })
    },
    [baseItems, student]
  )

  const cancelEdit = React.useCallback((id: AnswerKey["id"]) => {
    setEditingIds((prev) => {
      const next = new Set(Array.from(prev))
      next.delete(id)
      return next
    })
    setDraftsById((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
  }, [])

  const saveEdit = React.useCallback(
    async (id: AnswerKey["id"]) => {
      const draft = draftsById[id]
      if (!draft) return
      try {
        await editQuestion({
          questionId: Number(id),
          question_number: draft.questionNumber ?? 0,
          max_marks: draft.maxMarks ?? 0,
          question: draft.questionText ?? "",
          expected_answer: draft.expectedAnswer ?? "",
          key_points: draft.keyPoints ?? [],
          marking_scheme: draft.markingScheme ?? "",
          option_a: draft.optionA ?? null,
          option_b: draft.optionB ?? null,
          option_c: draft.optionC ?? null,
          option_d: draft.optionD ?? null,
        }).unwrap()

        const next = baseItems.map((ak) => (ak.id === id ? draft : ak))
        setSavedEdits(next)
        setEditingIds((prev) => {
          const nextSet = new Set(Array.from(prev))
          nextSet.delete(id)
          return nextSet
        })
        setDraftsById((prev) => {
          const { [id]: _drop, ...rest } = prev
          return rest
        })
      } catch (e) {
        console.error("Failed to save question", e)
      }
    },
    [baseItems, draftsById, editQuestion]
  )

  const updateDraft = React.useCallback(
    (id: AnswerKey["id"], changes: Partial<AnswerKey>) => {
      setDraftsById((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? baseItems.find((ak) => ak.id === id)!), ...changes },
      }))
    },
    [baseItems]
  )

  const chipClasses = [
    "bg-blue-50 text-blue-700 border border-blue-200",
    "bg-green-50 text-green-700 border border-green-200",
    "bg-amber-50 text-amber-800 border border-amber-200",
    "bg-purple-50 text-purple-700 border border-purple-200",
    "bg-rose-50 text-rose-700 border border-rose-200",
    "bg-teal-50 text-teal-700 border border-teal-200",
  ]

  return (
    <div className="w-full mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">◉</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Answer Keys</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Define the expected answers and marking scheme for each question
        </p>
      </div>

      {/* States */}
      {isLoading && (
        <div className="w-full flex items-center justify-center py-10">
          <div className="animate-pulse text-sm text-muted-foreground">Loading answer sheet…</div>
        </div>
      )}

      {!isLoading && error && (
        <div className="w-full flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-md border p-4 text-red-700 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <span>Couldn’t load answers. Please try again.</span>
            <Button variant="outline" className="ml-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !error && (savedEdits ?? items).length === 0 && (
        <div className="w-full flex items-center justify-center py-10">
          <div className="text-sm text-muted-foreground">No answers available.</div>
        </div>
      )}

      {/* Answer Keys List */}
      {!isLoading && !error && baseItems.length > 0 && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
          {baseItems.map((answerKey) => {
            const isEditingThis = !student && editingIds.has(answerKey.id)
            const current: AnswerKey = isEditingThis ? (draftsById[answerKey.id] ?? answerKey) : answerKey

            const letter = (i: number) => String.fromCharCode(65 + i)

            const patchNested = (
              arrKey: "subQuestions" | "orQuestions",
              index: number,
              patch: Partial<AnswerKey>
            ) => {
              const arr = (current[arrKey] ?? []) as AnswerKey[]
              const next = arr.map((it, i) => (i === index ? { ...it, ...patch } : it))
              updateDraft(answerKey.id, { [arrKey]: next } as any)
            }

            const renderQRead = (q: AnswerKey) => (
              <MarkdownQABot
                question={q.questionText}
                expectedAnswer={q.expectedAnswer}
                studentAnswer={student ? q.studentAnswer ?? undefined : undefined}
                options={[
                  ...(q.optionA ? [{ label: "A", content: q.optionA }] : []),
                  ...(q.optionB ? [{ label: "B", content: q.optionB }] : []),
                  ...(q.optionC ? [{ label: "C", content: q.optionC }] : []),
                  ...(q.optionD ? [{ label: "D", content: q.optionD }] : []),
                ]}
              />
            )

            const partLabelToLetter = (label?: string | null): string | null => {
              if (!label) return null
              const match = label.match(/[a-z]/i)
              return match ? match[0].toUpperCase() : null
            }

            const renderQEdit = (
              q: AnswerKey,
              onChange: (p: Partial<AnswerKey>) => void,
              { showMaxMarks }: { showMaxMarks: boolean }
            ) => (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={q.questionText ?? ""}
                    onChange={(e) => onChange({ questionText: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Option A</Label>
                    <Input
                      value={q.optionA ?? ""}
                      onChange={(e) => onChange({ optionA: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Option B</Label>
                    <Input
                      value={q.optionB ?? ""}
                      onChange={(e) => onChange({ optionB: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Option C</Label>
                    <Input
                      value={q.optionC ?? ""}
                      onChange={(e) => onChange({ optionC: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Option D</Label>
                    <Input
                      value={q.optionD ?? ""}
                      onChange={(e) => onChange({ optionD: e.target.value })}
                    />
                  </div>
                </div>

                {showMaxMarks && (
                  <div className="space-y-1">
                    <Label>Max Marks</Label>
                    <Input
                      type="number"
                      value={q.maxMarks ?? 0}
                      onChange={(e) => onChange({ maxMarks: Number(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Expected Answer</Label>
                  <Textarea
                    value={q.expectedAnswer ?? ""}
                    onChange={(e) => onChange({ expectedAnswer: e.target.value })}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                  <TagsInput
                    initialTags={Array.isArray(q.keyPoints) ? q.keyPoints : []}
                    onChange={(tags) => onChange({ keyPoints: tags })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                  <Textarea
                    value={q.markingScheme ?? ""}
                    onChange={(e) => onChange({ markingScheme: e.target.value })}
                    rows={5}
                  />
                </div>
              </div>
            )

            const hasNested = ((current.subQuestions?.length ?? 0) > 0) || ((current.orQuestions?.length ?? 0) > 0)
            const hasOr = (current.orQuestions?.length ?? 0) > 0
            const hasSub = (current.subQuestions?.length ?? 0) > 0

            return (
              <Card key={answerKey.id} className="w-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Question {current.questionNumber}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="px-3 py-1 bg-slate-900 text-white ring-1 ring-slate-300/60 shadow-sm">
                        <span className="opacity-90">Max Marks:</span>
                        <span className="ml-1 font-bold tabular-nums">{current.maxMarks}</span>
                      </Badge>

                      {student && (
                        <Badge className="px-3 py-1 bg-emerald-600 text-white ring-1 ring-emerald-300/70 shadow-sm">
                          <span className="opacity-90">Marks Obtained:</span>
                          <span className="ml-1 font-extrabold tabular-nums">
                            {current.marksAwarded ?? 0}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {hasNested ? (
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-6">
                      {(!hasOr && partLabelToLetter(current.partLabel)) && (
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                              {partLabelToLetter(current.partLabel)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Main Question */}
                      {!student && isEditingThis
                        ? renderQEdit(current, (p) => updateDraft(answerKey.id, p), { showMaxMarks: false })
                        : renderQRead(current)}

                      {/* PARENT KEY POINTS */}
                      {!student && !isEditingThis && (
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                          {Array.isArray(current.keyPoints) && current.keyPoints.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {current.keyPoints!.map((point, idx) => {
                                const classes = chipClasses[idx % chipClasses.length]
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${classes}`}
                                    title={point}
                                  >
                                    {point}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No key points provided.</div>
                          )}
                        </div>
                      )}

                      {!student && isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                          <TagsInput
                            initialTags={Array.isArray(current.keyPoints) ? current.keyPoints : []}
                            onChange={(tags) => updateDraft(answerKey.id, { keyPoints: tags })}
                          />
                        </div>
                      )}

                      {/* PARENT MARKING SCHEME */}
                      {!student && !isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                          <div className="p-4 bg-muted rounded-md text-sm leading-relaxed whitespace-pre-line">
                            {current.markingScheme || "—"}
                          </div>
                        </div>
                      )}

                      {!student && isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                          <Textarea
                            value={current.markingScheme ?? ""}
                            onChange={(e) => updateDraft(answerKey.id, { markingScheme: e.target.value })}
                            rows={5}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Main Question */}
                      {!student && isEditingThis
                        ? renderQEdit(current, (p) => updateDraft(answerKey.id, p), { showMaxMarks: false })
                        : renderQRead(current)}

                      {/* PARENT KEY POINTS */}
                      {!student && !isEditingThis && (
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                          {Array.isArray(current.keyPoints) && current.keyPoints.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {current.keyPoints!.map((point, idx) => {
                                const classes = chipClasses[idx % chipClasses.length]
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${classes}`}
                                    title={point}
                                  >
                                    {point}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No key points provided.</div>
                          )}
                        </div>
                      )}

                      {!student && isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                          <TagsInput
                            initialTags={Array.isArray(current.keyPoints) ? current.keyPoints : []}
                            onChange={(tags) => updateDraft(answerKey.id, { keyPoints: tags })}
                          />
                        </div>
                      )}

                      {/* PARENT MARKING SCHEME */}
                      {!student && !isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                          <div className="p-4 bg-muted rounded-md text-sm leading-relaxed whitespace-pre-line">
                            {current.markingScheme || "—"}
                          </div>
                        </div>
                      )}

                      {!student && isEditingThis && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                          <Textarea
                            value={current.markingScheme ?? ""}
                            onChange={(e) => updateDraft(answerKey.id, { markingScheme: e.target.value })}
                            rows={5}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* SUB-QUESTIONS (A, B, C...) – shown after parent's key points and marking scheme */}
                  {(current.subQuestions?.length ?? 0) > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      

                      {current.subQuestions!.map((sq, idx) => (
                        <div key={sq.id ?? idx} className="rounded-lg border p-4 bg-muted/30 space-y-4">
                          {/* Sub-question header with own marks */}
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                                {partLabelToLetter(sq.partLabel) ?? partLabelToLetter(current.partLabel) ?? letter(idx)}
                              </span>
                              
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className="px-2 py-0.5 bg-slate-900 text-white ring-1 ring-slate-300/60">
                                <span className="opacity-90">Max:</span>
                                <span className="ml-1 font-bold tabular-nums">{sq.maxMarks ?? 0}</span>
                              </Badge>
                              {student && sq.marksAwarded != null && (
                                <Badge className="px-2 py-0.5 bg-emerald-600 text-white ring-1 ring-emerald-300/70">
                                  <span className="opacity-90">Obtained:</span>
                                  <span className="ml-1 font-extrabold tabular-nums">{sq.marksAwarded}</span>
                                </Badge>
                              )}
                            </div>
                          </div>


                          {!student && isEditingThis
                            ? renderQEdit(
                                sq,
                                (p) => patchNested("subQuestions", idx, p),
                                { showMaxMarks: true }
                              )
                            : renderQRead(sq)}

                          {!student && !isEditingThis && (
                            <>
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                                {Array.isArray(sq.keyPoints) && sq.keyPoints.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {sq.keyPoints!.map((point, pidx) => {
                                      const classes = chipClasses[pidx % chipClasses.length]
                                      return (
                                        <span
                                          key={pidx}
                                          className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${classes}`}
                                          title={point}
                                        >
                                          {point}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No key points provided.</div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                                <div className="p-4 bg-muted rounded-md text-sm leading-relaxed whitespace-pre-line">
                                  {sq.markingScheme || "—"}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* OR-QUESTIONS (AFTER PARENT MARKING SCHEME) */}
                  {(current.orQuestions?.length ?? 0) > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-center">
                        <div className="relative w-full">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-background px-3 text-sm font-bold tracking-wide text-muted-foreground">
                              OR
                            </span>
                          </div>
                        </div>
                      </div>

                      {current.orQuestions!.map((oq, oidx) => (
                        <div key={oq.id ?? oidx} className="rounded-lg border p-4 bg-muted/20 space-y-4">
                          {/* NOTE: No question number or marks badges here (as requested) */}
                          {!student && isEditingThis
                            ? renderQEdit(oq, (p) => patchNested("orQuestions", oidx, p), {
                                showMaxMarks: false,
                              })
                            : renderQRead(oq)}

                          {!student && !isEditingThis && (
                            <>
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Key Points</div>
                                {Array.isArray(oq.keyPoints) && oq.keyPoints.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {oq.keyPoints!.map((point, pidx) => {
                                      const classes = chipClasses[pidx % chipClasses.length]
                                      return (
                                        <span
                                          key={pidx}
                                          className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${classes}`}
                                          title={point}
                                        >
                                          {point}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No key points provided.</div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Marking Scheme</div>
                                <div className="p-4 bg-muted rounded-md text-sm leading-relaxed whitespace-pre-line">
                                  {oq.markingScheme || "—"}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Student feedback (parent) */}
                  {student && current.feedback && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Feedback</div>
                      <div className="p-4 bg-muted rounded-md text-sm leading-relaxed whitespace-pre-line">
                        {current.feedback}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  {!student && !isEditingThis && (
                    <div className="flex justify-end pt-2">
                      <Button size="sm" variant="outline" onClick={() => beginEdit(answerKey.id)}>
                        Edit
                      </Button>
                    </div>
                  )}
                  {!student && isEditingThis && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => cancelEdit(answerKey.id)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveEdit(answerKey.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
