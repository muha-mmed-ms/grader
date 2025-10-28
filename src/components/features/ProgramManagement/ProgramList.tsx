import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Edit, Trash2, Eye, Search, GraduationCap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Program } from "./ProgramManagementTabs";

interface ProgramListProps {
  programs: Program[];
  onProgramSelect: (program: Program) => void;
  onProgramUpdate: () => void;
}

export const ProgramList = ({ programs, onProgramSelect, onProgramUpdate }: ProgramListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPrograms = programs.filter(
    (program) =>
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgramTypeColor = (type: string) => {
    const colors = {
      undergraduate: "bg-blue-100 text-blue-800",
      postgraduate: "bg-purple-100 text-purple-800",
      diploma: "bg-green-100 text-green-800",
      certificate: "bg-orange-100 text-orange-800",
      doctoral: "bg-red-100 text-red-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      discontinued: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Programs Found</h3>
          <p className="text-gray-600">Create your first academic program to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optional search (kept hidden by default) */}
      {/* <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search programs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm w-full sm:w-auto"
        />
      </div> */}

      {/* Programs Grid */}
      <div className="grid grid-cols-1  gap-4 sm:gap-6">
        {filteredPrograms.map((program) => (
          <Card
            key={program.id}
            className="hover:shadow-md transition-shadow rounded-xl border border-gray-200"
          >
            <CardContent className="p-4 sm:p-5">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                {/* Left Section: Program Info */}
                <div className="flex-1 min-w-0">
                  {/* Title + Badges */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words leading-tight truncate">
                      {program.name}
                    </h3>
                    <Badge className={getProgramTypeColor(program.programType)}>
                      {program.programType}
                    </Badge>
                    <Badge className={getStatusColor(program.status || "active")}>
                      {program.status || "active"}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mb-3">
                    <span className="font-medium">{program.code}</span>
                    <span>{program.durationYears} years</span>
                    <span>{program.totalSemesters || 0} semesters</span>
                  </div>

                  {/* Description */}
                  {program.description && (
                    <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  {/* Accreditation */}
                  {program.accreditation_details && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        Accredited
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="active_outline"
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                    onClick={() => onProgramSelect(program)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onProgramSelect(program)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
