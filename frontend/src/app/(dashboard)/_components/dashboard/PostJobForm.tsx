import { Dispatch, FormEvent, SetStateAction } from "react";
import { PlusCircle } from "lucide-react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { JobFormState } from "@/app/(dashboard)/_components/dashboard/types";

interface PostJobFormProps {
  jobForm: JobFormState;
  setJobForm: Dispatch<SetStateAction<JobFormState>>;
  postingJob: boolean;
  handleCreateJob: (event: FormEvent) => void;
}

export default function PostJobForm({
  jobForm,
  setJobForm,
  postingJob,
  handleCreateJob,
}: PostJobFormProps) {
  return (
        <section>
          <div className="glass-panel max-w-4xl rounded-3xl p-5 sm:p-8">
            <h2 className="text-2xl font-serif text-primary mb-6">
              Post a New Job
            </h2>
            <form className="space-y-6" onSubmit={handleCreateJob}>
              <Input
                label="Job Title"
                value={jobForm.title}
                onChange={(event) =>
                  setJobForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Backend Developer"
                required
              />
              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  label="Company"
                  value={jobForm.company}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      company: event.target.value,
                    }))
                  }
                  placeholder="Esencelab"
                  required
                />
                <Input
                  label="Location"
                  value={jobForm.location}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Remote / Kochi (optional)"
                />
              </div>
              <div className="relative pt-2">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={jobForm.description}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-inner relative z-0 appearance-none"
                  placeholder="What outcomes should this hire deliver?"
                  required
                />
              </div>
              <div className="relative pt-2">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Required Skills (comma separated)
                </label>
                <textarea
                  rows={3}
                  value={jobForm.requirements}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      requirements: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-inner relative z-0 appearance-none"
                  placeholder="Node.js, Express, SQL"
                  required
                />
              </div>
              <div className="relative pt-2 max-w-xs">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Experience Level
                </label>
                <select
                  value={jobForm.experienceLevel}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      experienceLevel: event.target.value as
                        | "entry"
                        | "junior"
                        | "mid"
                        | "senior"
                        | "lead",
                    }))
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm relative z-0 appearance-none"
                >
                  <option value="entry">Entry</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <div className="relative pt-2 max-w-xs">
                <label className="absolute left-4 transition-all duration-200 pointer-events-none text-[10px] uppercase tracking-widest px-1 bg-transparent text-secondary z-10 -top-1 font-bold">
                  Employment Type
                </label>
                <select
                  value={jobForm.jobType}
                  onChange={(event) =>
                    setJobForm((prev) => ({
                      ...prev,
                      jobType: event.target.value as
                        | "full_time"
                        | "part_time"
                        | "internship"
                        | "contract",
                    }))
                  }
                  className="w-full rounded-2xl border-[0.5px] border-border bg-white/50 px-4 py-4 font-sans text-primary text-base transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm relative z-0 appearance-none"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <Button
                type="submit"
                isLoading={postingJob}
                className="w-full justify-center h-12 rounded-full font-serif text-lg bg-primary text-white hover:bg-black/80 transition-all"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Publish Job
              </Button>
            </form>
          </div>
        </section>
  );
}
