/**
 * A `prompt` stage (Week 3 on): the stage's questions in order, each drawn by
 * its mode, under the slides line and the project chip. One main move a
 * stage; everything else is optional, so nobody has to keep up with every
 * field. "Tell us" adds the Season feedback box (`stage.feedback`).
 */
import { resolvedPrompts } from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { StageHead } from "./parts";
import { AskFoot, ProjectFor, PromptBlock, StageExtras, asksForProject } from "./PromptBlock";
import { TellUs } from "./TellUs";

export function PromptStage(props: StageProps) {
  const { week, stages, index } = props;
  const stage = stages[index];
  const prompts = resolvedPrompts(week, index);
  const hasAsk = prompts.some((p) => p.mode === "ask");
  return (
    <>
      <StageHead stages={stages} index={index} title={stage.name} lede={stage.lede} week={week}>
        {asksForProject(prompts) ? <ProjectFor props={props} /> : null}
      </StageHead>
      <StageExtras stage={stage} part="top" />
      <div className="sb-prompts">
        {prompts.map((p) => <PromptBlock key={p.key} p={p} props={props} />)}
      </div>
      <StageExtras stage={stage} part="foot" />
      {stage.feedback ? <TellUs props={props} /> : null}
      {hasAsk ? null : <AskFoot props={props} />}
    </>
  );
}
