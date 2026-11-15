"use client";

import { Eyebrow, SkeletonLine } from "@/components/ui/skeleton";

interface Props {
  plainLanguage: string;
  /** Empty or absent while the analogy is still on its way. */
  analogy?: string;
  /** True while the decode is still streaming in. */
  streaming?: boolean;
}

// The part people came for, so it gets the largest reading type on the page
// and a measure short enough to read comfortably on a phone.
export default function PlainLanguageCard({
  plainLanguage,
  analogy,
  streaming,
}: Props) {
  return (
    <section aria-label="In plain words" className="px-1">
      <Eyebrow as="h2">In plain words</Eyebrow>
      {plainLanguage ? (
        <p className="mt-2 text-pretty text-lg leading-relaxed text-foreground sm:text-xl sm:leading-relaxed">
          {plainLanguage}
        </p>
      ) : (
        streaming && (
          <div className="mt-3 flex flex-col gap-3">
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-11/12" />
            <SkeletonLine className="w-2/3" />
          </div>
        )
      )}

      {analogy ? (
        <div className="mt-5 rounded-2xl bg-secondary p-4 sm:p-5">
          <Eyebrow as="h3">Think of it like this</Eyebrow>
          <p className="mt-1.5 text-pretty text-base leading-relaxed text-foreground">
            {analogy}
          </p>
        </div>
      ) : (
        streaming &&
        plainLanguage && (
          <div className="mt-5 rounded-2xl bg-secondary p-4 sm:p-5">
            <SkeletonLine className="w-2/3" />
          </div>
        )
      )}
    </section>
  );
}
