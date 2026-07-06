// src/hooks/useNotebookTutorialSync.js
// Phase 1 extract: useEffect #5 — Sync notebook-open tutorial flag to game state
import { useEffect } from 'react';

export function useNotebookTutorialSync(notebookEverOpened, tutorialSeen, dispatch) {
  useEffect(function () {
    if (notebookEverOpened && !(tutorialSeen || {}).notebook_opened) {
      dispatch({ type: 'MARK_NOTEBOOK_OPENED' });
    }
  }, [notebookEverOpened]);
}
