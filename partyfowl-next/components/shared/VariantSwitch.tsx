'use client';

import { useEffect, useState } from 'react';

type VariantSwitchProps = {
  desktopHtml: string;
  mobileHtml: string;
  breakpointPx?: number;
};

const VariantSwitch = ({ desktopHtml, mobileHtml, breakpointPx = 768 }: VariantSwitchProps) => {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const updateVariant = () => setIsDesktop(mediaQuery.matches);

    updateVariant();

    const handleChange = () => updateVariant();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [breakpointPx]);

  const markup = isDesktop ? desktopHtml : mobileHtml;

  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
};

export default VariantSwitch;
