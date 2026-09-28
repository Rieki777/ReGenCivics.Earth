/**
 * The interoperability register: sheets in, overlap out.
 *
 * Three things stacked, because they answer three different questions the
 * Circle keeps asking:
 *
 *   Add your tool    one intake that files the sheet AND submits the tool to
 *                    the library, so every library tool has been through this
 *   Where we meet    which projects already share a protocol, format or
 *                    identity model, computed from the sheets, not guessed
 *   The standard     what the group already holds in common, plus what people
 *                    are proposing it should adopt
 *
 * The overlap is deterministic on purpose (STEERING section 11): if the page
 * says two projects both speak DIDComm, anyone can open both sheets and see
 * it. Nothing here asks an LLM what it thinks.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Layers, Link2, Plus, Upload, Wrench, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  AXIS_LABEL,
  OVERLAP_AXES,
  SUGGESTIONS,
  type OverlapAxis,
} from '@shared/interopSheet';
import { INTEROP_STAGE, type InteropStage } from '@shared/interopStage';

const MAX_DOC_BYTES = 4 * 1024 * 1024;

const DOC_ACCEPT = '.pdf,.md,.markdown,.txt,.json,.yaml,.yml';

/** Map a picked file to the content type the server allows, by extension. */
function docContentType(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'json') return 'application/json';
  if (ext === 'yaml' || ext === 'yml') return 'application/yaml';
  return null;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // data:<type>;base64,<payload>
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

function StageBadge({ stage, large = false }: { stage: InteropStage; large?: boolean }) {
  const style = INTEROP_STAGE[stage];
  return (
    <span
      title={style.description}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${style.className} ${
        large ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'
      }`}
    >
      {stage === 'interoperable' && <CheckCircle2 className={large ? 'w-4 h-4' : 'w-3 h-3'} />}
      {style.label}
    </span>
  );
}

/** A chip list with suggestions. Open vocabulary: anything can be typed. */
function TermPicker({
  axis,
  value,
  onChange,
  disabled,
}: {
  axis: OverlapAxis;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const unused = useMemo(
    () => SUGGESTIONS[axis].filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())),
    [axis, value],
  );

  function add(term: string) {
    const t = term.trim();
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
    setDraft('');
  }

  return (
    <div>
      <label className="block text-white/80 text-sm font-medium mb-1">{AXIS_LABEL[axis]}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((term) => (
            <span
              key={term}
              className="inline-flex items-center gap-1 bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] rounded-full px-3 py-1 text-sm"
            >
              {term}
              <button
                type="button"
                aria-label={`Remove ${term}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((v) => v !== term))}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Type your own, or pick below"
          aria-label={`Add a ${AXIS_LABEL[axis].toLowerCase()}`}
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
        />
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={() => add(draft)}
          className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm border border-white/20 disabled:opacity-50 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => add(s)}
              className="text-white/50 hover:text-white hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 text-xs transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InteropSheets({ voterKey }: { voterKey: string }) {
  const utils = trpc.useUtils();
  const sheets = trpc.interopSheets.list.useQuery(undefined, { refetchInterval: 60_000 });
  const overlap = trpc.interopSheets.overlap.useQuery(undefined, { refetchInterval: 60_000 });
  const standard = trpc.interopSheets.standard.useQuery(undefined, { refetchInterval: 60_000 });

  const refresh = () => {
    void utils.interopSheets.list.invalidate();
    void utils.interopSheets.overlap.invalidate();
    void utils.interopSheets.standard.invalidate();
  };
  const submit = trpc.interopSheets.submit.useMutation({ onSuccess: refresh });
  const propose = trpc.interopSheets.propose.useMutation({ onSuccess: refresh });

  const [open, setOpen] = useState(false);
  const [toolName, setToolName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [integrationNotes, setIntegrationNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [facets, setFacets] = useState<Record<OverlapAxis, string[]>>({
    protocols: [],
    dataFormats: [],
    identityModels: [],
    surfaces: [],
  });
  const [doc, setDoc] = useState<File | null>(null);
  const [docError, setDocError] = useState('');

  const [proposalAxis, setProposalAxis] = useState<OverlapAxis>('protocols');
  const [proposalTerm, setProposalTerm] = useState('');
  const [proposalWhy, setProposalWhy] = useState('');

  function pickDoc(file: File | null) {
    setDocError('');
    if (!file) { setDoc(null); return; }
    if (!docContentType(file)) {
      setDocError('Attach a PDF, Markdown, plain text, JSON or YAML overview.');
      setDoc(null);
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setDocError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 4MB.`);
      setDoc(null);
      return;
    }
    setDoc(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDocError('');
    let payload: { name: string; contentType: string; data: string } | undefined;
    if (doc) {
      const ct = docContentType(doc);
      if (!ct) { setDocError('That file type is not accepted.'); return; }
      try {
        payload = { name: doc.name, contentType: ct, data: await readAsBase64(doc) };
      } catch {
        setDocError('That file could not be read.');
        return;
      }
    }
    submit.mutate({
      toolName: toolName.trim(),
      websiteUrl: websiteUrl.trim(),
      summary: summary.trim() || undefined,
      integrationNotes: integrationNotes.trim() || undefined,
      contactName: contactName.trim() || undefined,
      facets,
      voterKey: voterKey || undefined,
      doc: payload,
    });
  }

  const rows = sheets.data?.sheets ?? [];
  const pairs = overlap.data?.pairs ?? [];
  const ground = standard.data?.commonGround ?? [];
  const proposals = standard.data?.proposals ?? [];

  return (
    <div className="space-y-8">
      {/* ── Add your tool ─────────────────────────────────────────── */}
      <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-3">
          <Layers className="w-5 h-5 text-[#7dd87d]" />
          <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">The register</p>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Add your tool to the shared system</h2>
        <p className="text-white/75 mb-2">
          One form does both jobs. It puts your tool in the ReGen Civics library, and it answers the
          interoperability questions at the same time, so everything in the library has been through the
          same door and we know what each thing speaks.
        </p>
        <p className="text-white/60 mb-5">
          Name what you already use rather than what you wish you used. The overlap below is computed from
          these answers, so it is only worth what the answers are worth.
        </p>

        {submit.isSuccess ? (
          <div className="rounded-xl border border-[#7dd87d]/40 bg-[#7dd87d]/10 p-4">
            <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold mb-1">
              <CheckCircle2 className="w-5 h-5" />
              Your sheet is in the register.
            </p>
            <p className="text-white/70 text-sm">
              It shows below straight away. Your tool is queued for the public library, where it will carry an
              interoperability-pending badge until the group confirms the pieces line up.
            </p>
            <button
              type="button"
              onClick={() => { submit.reset(); setOpen(true); }}
              className="mt-3 text-[#7dd87d] hover:text-[#9de89d] text-sm underline underline-offset-2"
            >
              Add another tool
            </button>
          </div>
        ) : open ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={toolName}
                maxLength={200}
                onChange={(e) => setToolName(e.target.value)}
                placeholder="Tool or protocol name"
                aria-label="Tool or protocol name"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
              />
              <input
                type="text"
                required
                value={websiteUrl}
                maxLength={500}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="Repo, docs or hub page"
                aria-label="A link the group can open"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
              />
            </div>

            <textarea
              value={summary}
              maxLength={2000}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What does it do? A couple of sentences is plenty."
              aria-label="What the tool does"
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]"
            />

            <div className="grid gap-5 md:grid-cols-2">
              {OVERLAP_AXES.map((axis) => (
                <TermPicker
                  key={axis}
                  axis={axis}
                  value={facets[axis]}
                  disabled={submit.isPending}
                  onChange={(next) => setFacets((f) => ({ ...f, [axis]: next }))}
                />
              ))}
            </div>

            <textarea
              value={integrationNotes}
              maxLength={6000}
              onChange={(e) => setIntegrationNotes(e.target.value)}
              placeholder="How do you expect to interoperate? What would another tool have to do to connect to yours? Paste as much as you like."
              aria-label="How the tool expects to interoperate"
              rows={5}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d]"
            />

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                An overview document, if you have one
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm border border-white/20 cursor-pointer min-h-[44px]">
                  <Upload className="w-4 h-4" />
                  {doc ? 'Choose a different file' : 'Attach a file'}
                  <input
                    type="file"
                    accept={DOC_ACCEPT}
                    className="hidden"
                    onChange={(e) => pickDoc(e.target.files?.[0] ?? null)}
                  />
                </label>
                {doc && (
                  <span className="inline-flex items-center gap-2 text-white/70 text-sm">
                    <FileText className="w-4 h-4 text-[#7dd87d]" />
                    {doc.name} ({(doc.size / 1024).toFixed(0)} KB)
                    <button type="button" onClick={() => setDoc(null)} aria-label="Remove attachment" className="hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>
              <p className="text-white/40 text-xs mt-2">PDF, Markdown, text, JSON or YAML. Up to 4MB. It will be downloadable by anyone.</p>
              {docError && <p className="text-red-300 text-sm mt-2">{docError}</p>}
            </div>

            <input
              type="text"
              value={contactName}
              maxLength={120}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name (optional)"
              aria-label="Your name, shown beside the sheet"
              className="w-full sm:w-72 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
            />

            {submit.isError && <p className="text-red-300 text-sm">{submit.error.message}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submit.isPending || !toolName.trim() || !websiteUrl.trim()}
                className="inline-flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-5 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-60 min-h-[44px]"
              >
                {submit.isPending ? 'Filing...' : 'File the sheet'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20 min-h-[44px]"
              >
                Not now
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-5 py-2 rounded-xl font-semibold transition-colors text-sm min-h-[44px]"
          >
            <Wrench className="w-4 h-4" />
            Add your tool
          </button>
        )}
      </section>

      {/* ── The sheets ────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
            {rows.length} {rows.length === 1 ? 'tool' : 'tools'} in the register
          </h2>
          <p className="text-white/60 mb-5 text-sm">
            What each one speaks. The badge shows how far it is along the journey into the shared system.
          </p>
          <ul className="space-y-4">
            {rows.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold text-lg">{s.toolName}</h3>
                  <StageBadge stage={s.stage} large={s.stage === 'interoperable'} />
                  {s.contactName && <span className="text-white/50 text-sm">from {s.contactName}</span>}
                </div>
                {s.summary && <p className="text-white/70 text-sm mb-3">{s.summary}</p>}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
                  {OVERLAP_AXES.map((axis) =>
                    s.facets[axis].length ? (
                      <div key={axis} className="min-w-[10rem]">
                        <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{AXIS_LABEL[axis]}</p>
                        <p className="text-white/80 text-sm">{s.facets[axis].join(', ')}</p>
                      </div>
                    ) : null,
                  )}
                </div>
                {s.docUrl && (
                  <a
                    href={s.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#7dd87d] hover:text-[#9de89d] text-sm underline underline-offset-2"
                  >
                    <FileText className="w-4 h-4" />
                    {s.docName ?? 'Overview'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Where we already meet ─────────────────────────────────── */}
      {pairs.length > 0 && (
        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="w-5 h-5 text-[#7dd87d]" />
            <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Overlap</p>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Where our projects already meet</h2>
          <p className="text-white/60 mb-5 text-sm">
            Computed from the sheets above, not guessed. Every line is two projects naming the same thing, so
            you can open both and check it.
          </p>
          <ul className="space-y-2">
            {pairs.map((p, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-white font-medium">
                  {p.a.toolName} <span className="text-white/40">and</span> {p.b.toolName}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {p.shared.map((s) => `${s.term} (${AXIS_LABEL[s.axis].toLowerCase()})`).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── The standard ──────────────────────────────────────────── */}
      <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-1">The interoperability standard</h2>
        <p className="text-white/60 mb-5 text-sm">
          Two different things. Common ground is what the sheets already show several of us using. A proposal
          is somebody arguing we should adopt something we have not yet.
        </p>

        {ground.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Common ground</h3>
            <ul className="space-y-1.5">
              {ground.map((t) => (
                <li key={`${t.axis}:${t.key}`} className="text-white/80 text-sm">
                  <span className="text-white font-medium">{t.term}</span>
                  <span className="text-white/40"> · {AXIS_LABEL[t.axis].toLowerCase()} · </span>
                  {t.count} {t.count === 1 ? 'project' : 'projects'}
                  <span className="text-white/40"> ({t.toolNames.join(', ')})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-white/50 text-sm mb-6">
            Nothing yet. Common ground appears once two projects name the same thing.
          </p>
        )}

        {proposals.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Proposed</h3>
            <ul className="space-y-2">
              {proposals.map((p) => (
                <li key={p.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white font-medium">{p.term}</span>
                    <span className="text-white/40 text-sm">{AXIS_LABEL[p.axis as OverlapAxis] ?? p.axis}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        p.status === 'adopted'
                          ? 'bg-[#7dd87d] text-[#0d2818] border-[#7dd87d]'
                          : p.status === 'declined'
                            ? 'bg-white/5 text-white/40 border-white/10'
                            : 'bg-[#e3ac4f]/20 text-[#e3ac4f] border-[#e3ac4f]/50'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  {p.rationale && <p className="text-white/60 text-sm mt-1">{p.rationale}</p>}
                  {p.contactName && <p className="text-white/40 text-xs mt-1">proposed by {p.contactName}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {propose.isSuccess ? (
          <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Proposed. It is on the list for the next session.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              propose.mutate({
                axis: proposalAxis,
                term: proposalTerm.trim(),
                rationale: proposalWhy.trim() || undefined,
                contactName: contactName.trim() || undefined,
                voterKey: voterKey || undefined,
              });
            }}
            className="space-y-3"
          >
            <h3 className="text-white font-semibold">Propose something for the standard</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={proposalAxis}
                onChange={(e) => setProposalAxis(e.target.value as OverlapAxis)}
                aria-label="Which part of the standard"
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
              >
                {OVERLAP_AXES.map((a) => (
                  <option key={a} value={a} className="bg-[#0d2818]">{AXIS_LABEL[a]}</option>
                ))}
              </select>
              <input
                type="text"
                required
                value={proposalTerm}
                maxLength={120}
                onChange={(e) => setProposalTerm(e.target.value)}
                placeholder="What should we adopt?"
                aria-label="What to adopt"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#7dd87d] min-h-[44px]"
              />
            </div>
            <textarea
              value={proposalWhy}
              maxLength={2000}
              onChange={(e) => setProposalWhy(e.target.value)}
              placeholder="Why? What does it unlock that we cannot do now?"
              aria-label="Why the group should adopt it"
              rows={2}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#7dd87d]"
            />
            {propose.isError && <p className="text-red-300 text-sm">{propose.error.message}</p>}
            <button
              type="submit"
              disabled={propose.isPending || !proposalTerm.trim()}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm border border-white/20 disabled:opacity-50 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              {propose.isPending ? 'Proposing...' : 'Propose it'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
