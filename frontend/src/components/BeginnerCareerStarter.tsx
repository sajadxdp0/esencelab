'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { getReadableErrorMessage, setTargetRole } from '@/lib/dashboardApi';
import BlueprintPanel from '@/components/beginnerCareerStarter/BlueprintPanel';
import { defaultAnswers, rankBeginnerTracks } from '@/components/beginnerCareerStarter/blueprints';
import type { BeginnerAnswers, BeginnerBlueprint } from '@/components/beginnerCareerStarter/blueprints';

export type { BeginnerBlueprint } from '@/components/beginnerCareerStarter/blueprints';

interface BeginnerCareerStarterProps {
  onUseUploadFlow: () => void;
  onSavedTrack?: (payload: { message: string; track: BeginnerBlueprint }) => void;
  onError?: (message: string) => void;
}

export default function BeginnerCareerStarter({
  onUseUploadFlow,
  onSavedTrack,
  onError,
}: BeginnerCareerStarterProps) {
  const [answers, setAnswers] = useState<BeginnerAnswers>(defaultAnswers);
  const [savingTrack, setSavingTrack] = useState(false);
  const ranking = useMemo(() => rankBeginnerTracks(answers), [answers]);
  const primaryTrack = ranking[0]?.blueprint || null;
  const alternateTracks = ranking.slice(1, 3).map((entry) => entry.blueprint);

  const handleSaveTrack = async () => {
    if (!primaryTrack || savingTrack) return;
    setSavingTrack(true);
    try {
      await setTargetRole(primaryTrack.id);
      onSavedTrack?.({
        message: `${primaryTrack.name} saved as your learning path. Continue with your first resume draft now.`,
        track: primaryTrack,
      });
    } catch (error: unknown) {
      onError?.(getReadableErrorMessage(error, 'Unable to save this learning path right now.'));
    } finally {
      setSavingTrack(false);
    }
  };

  if (!primaryTrack) return null;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
      <Card hoverable={false} className="space-y-6 p-8">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            Beginner path
          </Badge>
          <h2 className="text-2xl font-semibold text-primary">Domain discovery for beginners</h2>
          <p className="text-sm leading-6 text-secondary">
            Answer these simple prompts. Esencelab will suggest a likely-fit path and help you
            build your first resume around it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Academic year</label>
            <select
              value={answers.year}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  year: event.target.value as BeginnerAnswers['year'],
                }))
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-primary"
            >
              <option value="1st year">1st year</option>
              <option value="2nd year">2nd year</option>
              <option value="3rd year">3rd year</option>
              <option value="4th year">4th year</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Branch</label>
            <select
              value={answers.branch}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  branch: event.target.value as BeginnerAnswers['branch'],
                }))
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-primary"
            >
              <option value="cse_it">CSE / IT</option>
              <option value="ece">ECE</option>
              <option value="eee">EEE</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">What do you enjoy most?</label>
            <select
              value={answers.workStyle}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  workStyle: event.target.value as BeginnerAnswers['workStyle'],
                }))
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-primary"
            >
              <option value="interfaces">Designing screens and user flows</option>
              <option value="logic">Building logic and APIs</option>
              <option value="insights">Working with numbers and insights</option>
              <option value="devices">Building with sensors and boards</option>
              <option value="core">Core engineering concepts and systems</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">What task sounds exciting?</label>
            <select
              value={answers.favoriteTask}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  favoriteTask: event.target.value as BeginnerAnswers['favoriteTask'],
                }))
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-primary"
            >
              <option value="design">Making something look polished</option>
              <option value="build">Connecting systems end to end</option>
              <option value="analyze">Finding patterns in data</option>
              <option value="tinker">Building practical hardware setups</option>
              <option value="circuits">Understanding circuits and systems deeply</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Your strongest trait right now</label>
            <select
              value={answers.strength}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  strength: event.target.value as BeginnerAnswers['strength'],
                }))
              }
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-primary"
            >
              <option value="communication">I explain things clearly</option>
              <option value="logic">I like step-by-step problem solving</option>
              <option value="math">I am comfortable with maths and analysis</option>
              <option value="hands_on">I learn best by doing and building</option>
              <option value="patience">I can stay patient with harder concepts</option>
            </select>
          </div>
        </div>
      </Card>

      <Card hoverable={false} className="space-y-6 p-8">
        <div className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            Suggested path
          </Badge>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-primary">{primaryTrack.name}</h3>
              <p className="mt-2 text-sm leading-6 text-secondary">{primaryTrack.fitSummary}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              Best fit for {answers.year}
            </span>
          </div>
          <p className="rounded-2xl border border-border bg-white/70 p-4 text-sm leading-6 text-secondary">
            {primaryTrack.overview}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BlueprintPanel title="Starter resume sections">
            <ul className="mt-3 space-y-2 text-sm text-secondary">
              {primaryTrack.resumeSections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>
          </BlueprintPanel>
          <BlueprintPanel title="Skills to start with">
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryTrack.starterSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </BlueprintPanel>
          <BlueprintPanel title="Good first projects">
            <ul className="mt-3 space-y-2 text-sm text-secondary">
              {primaryTrack.starterProjects.map((project) => (
                <li key={project}>{project}</li>
              ))}
            </ul>
          </BlueprintPanel>
          <BlueprintPanel title="What to do first">
            <ul className="mt-3 space-y-2 text-sm text-secondary">
              {primaryTrack.firstSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </BlueprintPanel>
        </div>

        {alternateTracks.length > 0 && (
          <div className="rounded-2xl border border-border bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Close alternatives</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {alternateTracks.map((track) => (
                <span
                  key={track.id}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {track.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white/70 p-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-sm leading-6 text-secondary">
              Once you create your first version, upload it here and the normal resume-analysis
              workflow will continue exactly as usual.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleSaveTrack()} isLoading={savingTrack}>
            Save this as my path
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onUseUploadFlow}>
            I already have a resume
          </Button>
        </div>
      </Card>
    </section>
  );
}
