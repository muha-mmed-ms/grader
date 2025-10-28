import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopoMappingInterfaceSection from "./CopoMappingInterfaceSection";
import { useGetCopoMappingbyCourseIdQuery } from "@/api/api/program-outcomes-api";
import { CoPOMappingMatrix } from "./CoPOMappingMatrix";

interface CoPOMappingProps {
  courseId: string;
}

const CoPOMapping: React.FC<CoPOMappingProps> = ({ courseId }) => {
  const {
    data: CopoMappingInterface = [],
    isLoading: isCoursesLoading,
    error: courseError,
  } = useGetCopoMappingbyCourseIdQuery(courseId!, {
    skip: !courseId,
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mapping" className="w-full">
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <TabsList className="inline-flex w-auto min-w-0">
            <TabsTrigger value="mapping" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <span className="hidden sm:inline">Mapping Interface</span>
              <span className="sm:hidden">Mapping</span>
            </TabsTrigger>
            <TabsTrigger value="matrix" className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <span className="hidden sm:inline">Matrix View</span>
              <span className="sm:hidden">Matrix</span>
            </TabsTrigger>
            {/* <TabsTrigger value="validation">AI Validation</TabsTrigger> */}
          </TabsList>
        </div>
        <TabsContent value="mapping" className="space-y-6">
          <CopoMappingInterfaceSection data={CopoMappingInterface} />
        </TabsContent>
        <TabsContent value="matrix">
          <CoPOMappingMatrix data={CopoMappingInterface} />
        </TabsContent>
        {/* <TabsContent value="validation">validation Section</TabsContent> */}
      </Tabs>
    </div>
  );
};

export default CoPOMapping;
