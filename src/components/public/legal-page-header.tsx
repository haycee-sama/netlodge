"use client";

import { PageHeader } from "@/components/shared/page-components";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

interface LegalPageHeaderProps {
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

export function LegalPageHeader({ eyebrowKey, titleKey, descriptionKey }: LegalPageHeaderProps) {
  const { t } = useI18n();
  return (
    <PageHeader
      eyebrow={t(eyebrowKey)}
      title={t(titleKey)}
      description={t(descriptionKey)}
    />
  );
}
