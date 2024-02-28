import * as React from 'react';
import { ScriptDownloadRetryStrategy } from './types';

const loadedScripts: {
  src?: string;
} = {};

interface ScriptStatusInterface {
  loaded: boolean;
  error: boolean;
}

const srcUrl = 'https://checkout.flutterwave.com/v3.js';
const DEFAULT_VALUE = 3;
let attempt = 1;// Track the attempt count

function isNumber(value: any): value is number {
  return typeof value === 'number';
}

export default function useFWScript({ maxAttempt = DEFAULT_VALUE, retryDuration = DEFAULT_VALUE }: ScriptDownloadRetryStrategy): readonly [boolean, boolean] {
  const [state, setState] = React.useState<ScriptStatusInterface>({
    loaded: false,
    error: false,
  });

  // Validate and sanitize variables
  maxAttempt = isNumber(maxAttempt) ? Math.max(1, maxAttempt) : DEFAULT_VALUE; // Ensure minimum of 1 for maxAttempt, revert to the default value otherwise
  retryDuration = isNumber(retryDuration) ? Math.max(1, retryDuration) : DEFAULT_VALUE; // Ensure minimum of 1 for retryDuration, revert to the default value otherwise

  React.useEffect((): (() => void) | void => {
    if (loadedScripts.hasOwnProperty('src')) {
      setState({
        loaded: true,
        error: false,
      });
    } else {
      downloadScript();

      return () => {
        const scripts = document.querySelectorAll('script');

        scripts.forEach(script => {
          if (script.src === srcUrl) {
            script.removeEventListener('load', onScriptLoad);
            script.removeEventListener('error', onScriptError);
          }
        });
      };
    }
  }, []);

  const downloadScript = React.useCallback((): void => {
    loadedScripts.src = srcUrl;

    const script = document.createElement('script');
    script.src = srcUrl;
    script.async = true;

    script.addEventListener('load', onScriptLoad);
    script.addEventListener('error', onScriptError);

    document.body.appendChild(script);
  }, []);

  const onScriptLoad = React.useCallback((): void => {
    setState({
      loaded: true,
      error: false,
    });
  }, []);

  const onScriptError = React.useCallback((): void => {
    delete loadedScripts.src;

    // eslint-disable-next-line no-console
    console.log(`Flutterwave script download failed. Attempt: ${attempt}`);

    if (attempt < maxAttempt) {
      ++attempt;
      setTimeout(() => downloadScript(), (retryDuration * 1000));
    } else {
      setState({
        loaded: true,
        error: true,
      });
    }
  }, []);

  return [state.loaded, state.error] as const;
}
