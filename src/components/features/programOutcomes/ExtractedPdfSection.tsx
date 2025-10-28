import { IExtractedPdf } from "@/api/api/program-outcomes-api";
import MarkdownRenderer from "@/components/ui/MarkDown";

const ExtractedPdfSection = ({ pdfData }: { pdfData: IExtractedPdf }) => {
  // return <MarkdownRenderer content={data} />;
  return (
    <div className="w-full max-w-full overflow-x-auto" style={{ contain: 'inline-size' /* hard lock against content-based expansion */ }}>
      <MarkdownRenderer content={pdfData.clean_content} />
    </div>
  );
};

export default ExtractedPdfSection;
