import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CourseOutcomes from "./CourseOutComes";
import CoPOMapping from "./CopoMapping";
import QuestionBank from "./qBank";
import ComingSoon from "@/pages/ComingSoon";

interface CourseDetailTabsProps {
  courseId: string;
}

const CourseDetailTabs = ({ courseId }: CourseDetailTabsProps) => {
  return (
    <div>
      <Tabs defaultValue="outcomes" className="w-full">
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <TabsList className="inline-flex w-auto min-w-0">
            <TabsTrigger value="outcomes" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Outcomes</TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <span className="hidden sm:inline">CO-PO Mapping</span>
              <span className="sm:hidden">Mapping</span>
            </TabsTrigger>
            {/* <TabsTrigger value="questions">Question Bank</TabsTrigger> */}
            <TabsTrigger value="assessments" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Assessments</TabsTrigger>
            <TabsTrigger value="attainment" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Attainment</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="outcomes">
          <CourseOutcomes courseId={courseId} />
        </TabsContent>

        <TabsContent value="mapping">
          {/* <CoPOMapping courseId={courseId} canEdit={canEdit} /> */}
          <CoPOMapping courseId={courseId} />
        </TabsContent>

        {/* <TabsContent value="questions">
          <QuestionBank />
        </TabsContent> */}

        <TabsContent value="assessments">
          <ComingSoon />
        </TabsContent>

        <TabsContent value="attainment">
          <ComingSoon />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseDetailTabs;
