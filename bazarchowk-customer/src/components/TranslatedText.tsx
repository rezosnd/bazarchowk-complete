import React, { useState, useEffect } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import i18n from '@/i18n';
import { translateString } from '@/services/translationService';

export function Text(props: TextProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const targetLang = i18n.language || 'en';

  const childrenArray = React.Children.toArray(props.children);
  
  // Only concatenate if all children are strings or numbers (no nested components)
  const isSimpleContent = childrenArray.length > 0 && childrenArray.every(c => typeof c === 'string' || typeof c === 'number');
  
  const originalText = isSimpleContent ? childrenArray.join('') : null;

  useEffect(() => {
    let isMounted = true;
    if (targetLang === 'en' || !originalText || !isNaN(Number(originalText))) {
      if (isMounted) setTranslatedText(null);
      return;
    }

    translateString(originalText, targetLang).then((res) => {
      if (isMounted) setTranslatedText(res);
    });

    return () => { isMounted = false; };
  }, [originalText, targetLang]);

  const content = translatedText !== null ? translatedText : props.children;

  return <RNText {...props}>{content}</RNText>;
}
