import Card from "@/components/Card";
import { ResumeSnapshot } from "@/app/(dashboard)/_components/resume/types";

interface ResumeDetailsProps {
  resumeSnapshot: ResumeSnapshot;
}

export default function ResumeDetails({ resumeSnapshot }: ResumeDetailsProps) {
  return (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card hoverable={false} className="p-6">
            <h2 className="text-xl font-semibold text-primary">Education</h2>
            {resumeSnapshot.education.length > 0 ? (
              <div className="mt-4 space-y-3">
                {resumeSnapshot.education.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-border bg-white/70 p-4"
                  >
                    <p className="font-medium text-primary">{item.title}</p>
                    {item.meta && (
                      <p className="mt-1 text-sm text-secondary">{item.meta}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-secondary">
                No education entries were extracted.
              </p>
            )}
          </Card>

          <Card hoverable={false} className="p-6">
            <h2 className="text-xl font-semibold text-primary">Experience</h2>
            {resumeSnapshot.experience.length > 0 ? (
              <div className="mt-4 space-y-3">
                {resumeSnapshot.experience.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-border bg-white/70 p-4"
                  >
                    <p className="font-medium text-primary">{item.title}</p>
                    {item.meta && (
                      <p className="mt-1 text-sm text-secondary">{item.meta}</p>
                    )}
                    {item.summary && (
                      <p className="mt-2 text-sm leading-6 text-secondary">
                        {item.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-secondary">
                No experience entries were extracted.
              </p>
            )}
          </Card>
        </section>
  );
}
