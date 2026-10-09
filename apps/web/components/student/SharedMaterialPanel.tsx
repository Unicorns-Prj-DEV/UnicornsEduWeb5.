"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import MathContent from "@/components/ui/MathContent";
import { cn } from "@/lib/utils";
import type { MaterialHeader } from "@/lib/exam-layout";
import { numberMaterialGaps } from "@/lib/material-gaps";
import AttemptAudio from "./AttemptAudio";

const NO_NUMBERS: ReadonlyMap<string, number> = new Map();

/**
 * Tư liệu dùng chung hiện một lần trước câu đầu của khối. Mở sẵn; thu gọn được
 * để đỡ cuộn trên điện thoại. Vị trí trống hiện số câu theo `gapNumbers`
 * (questionId → số câu trong lượt làm); câu vắng hiện ô không số.
 */
export default function SharedMaterialPanel({
  header,
  gapNumbers = NO_NUMBERS,
}: {
  header: MaterialHeader;
  gapNumbers?: ReadonlyMap<string, number>;
}) {
  const [open, setOpen] = useState(true);
  const range =
    header.firstNumber === header.lastNumber
      ? `câu ${header.firstNumber}`
      : `câu ${header.firstNumber}–${header.lastNumber}`;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-info/30 bg-info/5"
    >
      <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-text-primary sm:px-4">
        <FileText className="size-4 shrink-0 text-info" aria-hidden />
        <span className="flex-1">Đọc tư liệu sau rồi trả lời {range}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
        {header.audio ? (
          <AttemptAudio audio={header.audio} label="Audio tư liệu" />
        ) : null}
        <MathContent
          content={numberMaterialGaps(header.content, gapNumbers)}
          className="max-w-none text-base text-text-primary sm:text-sm [&_img]:h-auto [&_img]:max-w-full"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
